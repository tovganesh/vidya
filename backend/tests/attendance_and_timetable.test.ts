import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';
import { DayOfWeek, AttendanceStatus } from '@prisma/client';

describe('Operations: Attendance, Timetable & Staff Allocations (Milestone 6)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let teacherToken: string;
  let schoolId: string;
  let activeYearId: string;
  let section10AId: string;
  let section10BId: string;
  let teacherRajeshId: string;
  let mathSubjectId: string;
  let scienceSubjectId: string;
  let period1Id: string;
  let period2Id: string;
  let period4Id: string;
  let enrollment1Id: string;
  let enrollment2Id: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.$connect();

    // 1. Login as School Admin
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(adminLoginRes.statusCode).toBe(200);
    const adminData = JSON.parse(adminLoginRes.payload).data;
    adminToken = adminData.accessToken;
    schoolId = adminData.user.school.id;

    // 2. Login as Teacher
    const teacherLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'teacher@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(teacherLoginRes.statusCode).toBe(200);
    teacherToken = JSON.parse(teacherLoginRes.payload).data.accessToken;

    // 3. Resolve seeded entities
    const activeYear = await prisma.academicYear.findFirstOrThrow({
      where: { schoolId, isCurrent: true },
    });
    activeYearId = activeYear.id;

    const class10 = await prisma.class.findFirstOrThrow({
      where: { schoolId, code: 'STD-10' },
      include: { sections: true },
    });

    const secA = class10.sections.find((s) => s.name === 'A')!;
    const secB = class10.sections.find((s) => s.name === 'B')!;
    section10AId = secA.id;
    section10BId = secB.id;

    const teacher = await prisma.teacher.findFirstOrThrow({
      where: { schoolId, employeeCode: 'EMP-2023-0101' },
    });
    teacherRajeshId = teacher.id;

    const math = await prisma.subject.findFirstOrThrow({
      where: { schoolId, code: 'MATH' },
    });
    const sci = await prisma.subject.findFirstOrThrow({
      where: { schoolId, code: 'SCI' },
    });
    mathSubjectId = math.id;
    scienceSubjectId = sci.id;

    const p1 = await prisma.period.findFirstOrThrow({
      where: { schoolId, periodNumber: 1 },
    });
    const p2 = await prisma.period.findFirstOrThrow({
      where: { schoolId, periodNumber: 2 },
    });
    const p4 = await prisma.period.findFirstOrThrow({
      where: { schoolId, periodNumber: 4 },
    });
    period1Id = p1.id;
    period2Id = p2.id;
    period4Id = p4.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId: section10AId, academicYearId: activeYearId },
      orderBy: { rollNumber: 'asc' },
    });
    expect(enrollments.length).toBeGreaterThanOrEqual(2);
    enrollment1Id = enrollments[0]!.id;
    enrollment2Id = enrollments[1]!.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ==========================================================================
  // Attendance Module Tests
  // ==========================================================================

  describe('Attendance Sheet & Roll Call', () => {
    it('allows teacher to retrieve class attendance sheet for a date', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/attendance/sheet?sectionId=${section10AId}&date=2026-10-08`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload).data;
      expect(data.section.id).toBe(section10AId);
      expect(data.date).toBe('2026-10-08');
      expect(data.students.length).toBeGreaterThanOrEqual(2);
      expect(data.students[0]).toHaveProperty('enrollmentId');
      expect(data.students[0]).toHaveProperty('rollNumber');
      expect(data.students[0]).toHaveProperty('status');
    });

    it('records bulk attendance roll call with upsert semantics', async () => {
      const recordsPayload = [
        {
          enrollmentId: enrollment1Id,
          status: AttendanceStatus.PRESENT,
          remarks: 'Present on time',
        },
        {
          enrollmentId: enrollment2Id,
          status: AttendanceStatus.ABSENT,
          remarks: 'Medical leave approved',
        },
      ];

      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/attendance/batch',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          sectionId: section10AId,
          date: '2026-10-08',
          records: recordsPayload,
        },
      });

      expect(postRes.statusCode).toBe(200);
      const postData = JSON.parse(postRes.payload).data;
      expect(postData.success).toBe(true);
      expect(postData.count).toBe(2);

      // Verify records in subsequent sheet fetch
      const verifyRes = await app.inject({
        method: 'GET',
        url: `/api/v1/attendance/sheet?sectionId=${section10AId}&date=2026-10-08`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(verifyRes.statusCode).toBe(200);
      const sheet = JSON.parse(verifyRes.payload).data;
      const s1 = sheet.students.find((s: any) => s.enrollmentId === enrollment1Id);
      const s2 = sheet.students.find((s: any) => s.enrollmentId === enrollment2Id);

      expect(s1.status).toBe(AttendanceStatus.PRESENT);
      expect(s2.status).toBe(AttendanceStatus.ABSENT);
      expect(s2.remarks).toBe('Medical leave approved');
      expect(sheet.stats.absent).toBeGreaterThanOrEqual(1);
    });

    it('generates monthly attendance register with statistics and percentage', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/attendance/reports/monthly?sectionId=${section10AId}&year=2026&month=10`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const report = JSON.parse(res.payload).data;
      expect(report.section.id).toBe(section10AId);
      expect(report.year).toBe(2026);
      expect(report.month).toBe(10);
      expect(report.students.length).toBeGreaterThanOrEqual(2);

      const firstStudent = report.students[0];
      expect(firstStudent).toHaveProperty('dailyAttendance');
      expect(firstStudent).toHaveProperty('percentage');
      expect(firstStudent).toHaveProperty('isBelowThreshold');
    });

    it('retrieves student individual 360 attendance profile summary', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/attendance/student/${enrollment1Id}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const summary = JSON.parse(res.payload).data;
      expect(summary.student).toBeDefined();
      expect(summary.totalDays).toBeGreaterThan(0);
      expect(summary.percentage).toBeGreaterThan(0);
      expect(Array.isArray(summary.recentRecords)).toBe(true);
    });
  });

  // ==========================================================================
  // Timetable & Periods Module Tests
  // ==========================================================================

  describe('Periods Management', () => {
    it('retrieves list of periods sorted in ascending order', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/timetable/periods',
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const periods = JSON.parse(res.payload).data;
      expect(Array.isArray(periods)).toBe(true);
      expect(periods.length).toBeGreaterThanOrEqual(5);
      expect(periods[0].periodNumber).toBeLessThan(periods[1].periodNumber);
    });

    it('allows admin to add or update periods', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/timetable/periods',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          periods: [
            {
              periodNumber: 1,
              name: 'Period 1 (Morning Core)',
              startTime: '08:50',
              endTime: '09:35',
              isBreak: false,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const periods = JSON.parse(res.payload).data;
      expect(periods[0].name).toBe('Period 1 (Morning Core)');
    });
  });

  describe('Timetable Grid & Schedule Conflict Engine', () => {
    it('retrieves section timetable weekly grid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/timetable/section/${section10AId}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const tt = JSON.parse(res.payload).data;
      expect(tt.section.id).toBe(section10AId);
      expect(tt.days).toContain(DayOfWeek.MONDAY);
      expect(tt.grid).toHaveProperty(DayOfWeek.MONDAY);
    });

    it('creates a timetable slot for Section A on Thursday Period 2', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/timetable/slots',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sectionId: section10AId,
          dayOfWeek: DayOfWeek.THURSDAY,
          periodId: period2Id,
          subjectId: mathSubjectId,
          teacherId: teacherRajeshId,
          roomNumber: 'Room-10A',
        },
      });

      expect(res.statusCode).toBe(200);
      const slot = JSON.parse(res.payload).data;
      expect(slot.sectionId).toBe(section10AId);
      expect(slot.dayOfWeek).toBe(DayOfWeek.THURSDAY);
      expect(slot.periodId).toBe(period2Id);
      expect(slot.teacherId).toBe(teacherRajeshId);
    });

    it('rejects double-booking teacher in Section B on the same day and period with 409 CONFLICT', async () => {
      // Teacher Rajesh is already scheduled on Thursday Period 2 for Section A
      // Attempting to schedule him in Section B during the same slot must fail!
      const conflictRes = await app.inject({
        method: 'POST',
        url: '/api/v1/timetable/slots',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sectionId: section10BId,
          dayOfWeek: DayOfWeek.THURSDAY,
          periodId: period2Id,
          subjectId: mathSubjectId,
          teacherId: teacherRajeshId,
          roomNumber: 'Room-10B',
        },
      });

      expect(conflictRes.statusCode).toBe(409);
      const err = JSON.parse(conflictRes.payload);
      expect(err.success).toBe(false);
      expect(err.error.code).toBe('TEACHER_SCHEDULE_CONFLICT');
      expect(err.error.message).toContain('Schedule Conflict: Teacher Rajesh');
      expect(err.error.message).toContain('Double booking is not permitted');
    });

    it('allows scheduling Teacher Rajesh in Section B during a different period (Period 3)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/timetable/slots',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sectionId: section10BId,
          dayOfWeek: DayOfWeek.THURSDAY,
          periodId: period4Id,
          subjectId: mathSubjectId,
          teacherId: teacherRajeshId,
          roomNumber: 'Room-10B',
        },
      });

      expect(res.statusCode).toBe(200);
      const slot = JSON.parse(res.payload).data;
      expect(slot.sectionId).toBe(section10BId);
      expect(slot.periodId).toBe(period4Id);
    });

    it('retrieves teacher weekly timetable schedule', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/timetable/teacher/${teacherRajeshId}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const schedule = JSON.parse(res.payload).data;
      expect(schedule.teacher.id).toBe(teacherRajeshId);
      expect(schedule.totalWeeklyPeriods).toBeGreaterThan(0);
      expect(Array.isArray(schedule.slots)).toBe(true);
    });
  });

  // ==========================================================================
  // Teacher Allocations Tests
  // ==========================================================================

  describe('Teacher Allocations', () => {
    it('retrieves teacher allocations for the current academic year', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/timetable/allocations?sectionId=${section10AId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const allocations = JSON.parse(res.payload).data;
      expect(Array.isArray(allocations)).toBe(true);
      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations[0].isClassTeacher).toBe(true);
    });

    it('assigns a teacher allocation for Science in Section B', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/timetable/allocations',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          teacherId: teacherRajeshId,
          classId: (await prisma.section.findUniqueOrThrow({ where: { id: section10BId } })).classId,
          sectionId: section10BId,
          subjectId: scienceSubjectId,
          isClassTeacher: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const allocation = JSON.parse(res.payload).data;
      expect(allocation.teacherId).toBe(teacherRajeshId);
      expect(allocation.sectionId).toBe(section10BId);
      expect(allocation.subjectId).toBe(scienceSubjectId);
      expect(allocation.isClassTeacher).toBe(false);
    });
  });

  // ==========================================================================
  // Security & RBAC Enforcement Tests
  // ==========================================================================

  describe('Security & RBAC Enforcement', () => {
    it('blocks unauthenticated access with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/attendance/sheet?sectionId=${section10AId}`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('blocks non-admin from modifying period structures with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/timetable/periods',
        headers: { authorization: `Bearer ${teacherToken}` }, // Teachers don't have academics:write
        payload: {
          periods: [{ periodNumber: 1, name: 'P1', startTime: '08:00', endTime: '09:00' }],
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
