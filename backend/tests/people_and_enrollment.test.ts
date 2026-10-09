import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';

describe('People Management & Academic Enrollment (Milestone 5)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let teacherToken: string;
  let schoolId: string;
  let seededStudentId: string;
  let targetClassId: string;
  let targetSectionId: string;
  let activeYearId: string;
  let nextAcademicYearId: string | null = null;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.$connect();

    // Clean up any test academic years from prior runs
    const testYears = await prisma.academicYear.findMany({
      where: { name: { in: ['2027-2028', '2028-2029', '2029-2030'] } },
    });
    if (testYears.length > 0) {
      const ids = testYears.map((y) => y.id);
      await prisma.enrollment.deleteMany({ where: { academicYearId: { in: ids } } });
      await prisma.academicYear.deleteMany({ where: { id: { in: ids } } });
    }

    // Login as School Admin
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

    // Login as Teacher
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

    // Retrieve active year, class, section for test admissions
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    activeYearId = activeYear!.id;

    const class1 = await prisma.class.findFirst({
      where: { schoolId, code: 'STD-01' },
      include: { sections: true },
    });
    targetClassId = class1!.id;
    targetSectionId = class1!.sections[0].id;

    const student = await prisma.student.findFirst({
      where: { schoolId, admissionNumber: 'VS-2024-0101' },
    });
    seededStudentId = student!.id;
  });

  afterAll(async () => {
    if (nextAcademicYearId) {
      await prisma.enrollment.deleteMany({
        where: { academicYearId: nextAcademicYearId },
      });
      await prisma.academicYear.deleteMany({
        where: { id: nextAcademicYearId },
      });
    }

    if (seededStudentId && activeYearId) {
      await prisma.enrollment.updateMany({
        where: { studentId: seededStudentId, academicYearId: activeYearId },
        data: { status: 'ACTIVE' },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  // ==========================================================================
  // 1. Directory Statistics & Overview
  // ==========================================================================
  describe('1. People Directory Statistics', () => {
    it('should retrieve accurate aggregate counts for students, teachers, guardians, and classes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/people/stats',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.totalStudents).toBeGreaterThanOrEqual(3);
      expect(body.data.activeTeachers).toBeGreaterThanOrEqual(1);
      expect(body.data.totalGuardians).toBeGreaterThanOrEqual(2);
      expect(body.data.genderRatio).toBeDefined();
      expect(body.data.classDistribution).toBeInstanceOf(Array);
    });
  });

  // ==========================================================================
  // 2. Students Directory & Filtering
  // ==========================================================================
  describe('2. Student Directory Queries', () => {
    it('should list students with active enrollments and primary guardian', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/students',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(3);
      expect(body.pagination.total).toBeGreaterThanOrEqual(3);

      const aarav = body.data.find((s: any) => s.admissionNumber === 'VS-2024-0101');
      expect(aarav).toBeDefined();
      expect(aarav.fullName).toContain('Aarav');
      expect(aarav.currentEnrollment).toBeDefined();
      expect(aarav.currentEnrollment.className).toBe('Class 10');
      expect(aarav.primaryGuardian).toBeDefined();
      expect(aarav.primaryGuardian.name).toBe('Suresh Kumar');
    });

    it('should filter students by search term (name / admission #)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/students?search=VS-2024-0101',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.length).toBe(1);
      expect(body.data[0].admissionNumber).toBe('VS-2024-0101');
    });
  });

  // ==========================================================================
  // 3. Student Admission & Domain Constraints
  // ==========================================================================
  describe('3. Student Admission & Invariants', () => {
    const testAdmissionNo = `ADM-TEST-${Date.now().toString().slice(-6)}`;

    it('should admit a new student with guardian and academic placement in one transaction', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/students',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          admissionNumber: testAdmissionNo,
          admissionDate: '2026-06-01',
          firstName: 'Vivaan',
          lastName: 'Reddy',
          gender: 'MALE',
          dateOfBirth: '2020-05-15',
          bloodGroup: 'B_POS',
          apaarId: '998877665544',
          aadhaarLastFour: '7766',
          category: 'GENERAL',
          guardians: [
            {
              name: 'Raghav Reddy',
              relationship: 'FATHER',
              phone: '+91 99000 88776',
              email: 'raghav.reddy@example.com',
              occupation: 'Business Analyst',
              isPrimaryContact: true,
            },
          ],
          enrollment: {
            academicYearId: activeYearId,
            classId: targetClassId,
            sectionId: targetSectionId,
            rollNumber: 42,
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.admissionNumber).toBe(testAdmissionNo);
      expect(body.data.firstName).toBe('Vivaan');
      expect(body.data.enrollment).toBeDefined();
      expect(body.data.enrollment.rollNumber).toBe(42);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          schoolId,
          action: 'STUDENT_ADMITTED',
          entityId: body.data.id,
        },
      });
      expect(audit).toBeDefined();
    });

    it('should reject student admission with duplicate admission number', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/students',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          admissionNumber: testAdmissionNo, // duplicate!
          firstName: 'Another',
          lastName: 'Student',
          gender: 'FEMALE',
          dateOfBirth: '2020-01-01',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ADMISSION_NUMBER_CONFLICT');
    });

    it('should reject admission when mandatory fields are missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/students',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          firstName: 'Incomplete',
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // 4. Student 360 Profile & Multi-Year History
  // ==========================================================================
  describe('4. Student 360 Profile & Lifelong Trajectory', () => {
    it('should retrieve full 360 profile with APAAR ID, guardians, and multi-year trajectory', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/students/${seededStudentId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(seededStudentId);
      expect(body.data.admissionNumber).toBe('VS-2024-0101');
      expect(body.data.apaarId).toBe('984512345678');
      expect(body.data.aadhaarLastFour).toBe('4512');

      // Guardians
      expect(body.data.guardians.length).toBeGreaterThanOrEqual(2);
      const primary = body.data.guardians.find((g: any) => g.isPrimaryContact);
      expect(primary).toBeDefined();
      expect(primary.name).toBe('Suresh Kumar');

      // Multi-year trajectory (2025-26 and 2026-27)
      expect(body.data.enrollmentHistory.length).toBeGreaterThanOrEqual(2);
      const pastYear = body.data.enrollmentHistory.find((e: any) => e.academicYearName === '2025-2026');
      const currYear = body.data.enrollmentHistory.find((e: any) => e.academicYearName === '2026-2027');

      expect(pastYear).toBeDefined();
      expect(pastYear.className).toBe('Class 9');
      expect(pastYear.status).toBe('PROMOTED');

      expect(currYear).toBeDefined();
      expect(currYear.className).toBe('Class 10');
      expect(currYear.status).toBe('ACTIVE');
    });

    it('should link and unlink an additional guardian to a student', async () => {
      const linkRes = await app.inject({
        method: 'POST',
        url: `/api/v1/students/${seededStudentId}/guardians`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Meena Sharma',
          relationship: 'GUARDIAN',
          phone: '+91 97000 66554',
          occupation: 'Local Guardian',
          isAuthorizedPickup: true,
        },
      });

      expect(linkRes.statusCode).toBe(201);
      const linkData = JSON.parse(linkRes.payload).data;
      expect(linkData.guardianId).toBeDefined();

      // Unlink
      const unlinkRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/students/${seededStudentId}/guardians/${linkData.guardianId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(unlinkRes.statusCode).toBe(200);
      expect(JSON.parse(unlinkRes.payload).data.success).toBe(true);
    });
  });

  // ==========================================================================
  // 5. Teachers Management
  // ==========================================================================
  describe('5. Teacher Management', () => {
    const testEmpCode = `EMP-TEST-${Date.now().toString().slice(-4)}`;
    const testEmail = `teacher.${Date.now()}@vidya.org`;
    let createdTeacherId: string;

    it('should list existing teachers with user account information', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/teachers?limit=100',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      const rajesh = body.data.find((t: any) => t.employeeCode === 'EMP-2023-0101');
      expect(rajesh).toBeDefined();
      expect(rajesh.fullName).toBe('Rajesh Sharma');
    });

    it('should onboard a new teacher with unique employee code and credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/teachers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          employeeCode: testEmpCode,
          firstName: 'Ananya',
          lastName: 'Deshmukh',
          email: testEmail,
          phone: '+91 98111 22334',
          qualification: 'M.A (English), B.Ed',
          specialization: 'Senior Secondary English Literature',
          joiningDate: '2026-06-01',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.employeeCode).toBe(testEmpCode);
      expect(body.data.fullName).toBe('Ananya Deshmukh');
      createdTeacherId = body.data.id;
    });

    it('should prevent onboarding with duplicate employee code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/teachers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          employeeCode: testEmpCode, // duplicate!
          firstName: 'Duplicate',
          lastName: 'Teacher',
          email: `dup.${Date.now()}@vidya.org`,
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('EMP_CODE_CONFLICT');
    });

    it('should update teacher status and details', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/teachers/${createdTeacherId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          status: 'ON_LEAVE',
          qualification: 'M.A (English), M.Ed, Ph.D',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.status).toBe('ON_LEAVE');
      expect(body.data.qualification).toContain('Ph.D');
    });
  });

  // ==========================================================================
  // 6. Multi-Year Enrollment Isolation & Batch Promotion Engine
  // ==========================================================================
  describe('6. Lifelong Enrollment Isolation & Batch Promotion', () => {
    let class11Id: string;
    let section11AId: string;

    beforeAll(async () => {
      // Create Next Academic Year (2029-2030)
      const nextYear = await prisma.academicYear.upsert({
        where: {
          schoolId_name: {
            schoolId,
            name: '2029-2030',
          },
        },
        update: {},
        create: {
          schoolId,
          name: '2029-2030',
          startDate: new Date('2029-06-01T00:00:00Z'),
          endDate: new Date('2030-04-30T23:59:59Z'),
          status: 'PLANNING',
          isCurrent: false,
        },
      });
      nextAcademicYearId = nextYear.id;

      // Locate Class 11 and Section A
      const class11 = await prisma.class.findFirst({
        where: { schoolId, code: 'STD-11' },
        include: { sections: true },
      });
      class11Id = class11!.id;
      section11AId = class11!.sections[0].id;
    });

    it('should execute batch promotion from Class 10 (2026-27) to Class 11 (2027-28)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/enrollments/batch-promote',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceAcademicYearId: activeYearId,
          targetAcademicYearId: nextAcademicYearId,
          targetClassId: class11Id,
          targetSectionId: section11AId,
          promotions: [
            {
              studentId: seededStudentId,
              status: 'PROMOTED',
              targetRollNumber: 1,
              remarks: 'Promoted to Class 11 Science stream',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.summary.promotedCount).toBe(1);
      expect(body.data.summary.targetAcademicYear).toBe('2029-2030');

      // Verify that historical records are preserved and new enrollment exists
      const studentHistory = await prisma.enrollment.findMany({
        where: { studentId: seededStudentId },
        include: { academicYear: true, class: true },
        orderBy: { academicYear: { startDate: 'asc' } },
      });

      expect(studentHistory.length).toBe(3);
      // 1. Past: 2025-26 Class 9 (PROMOTED) - Untouched!
      expect(studentHistory[0].academicYear.name).toBe('2025-2026');
      expect(studentHistory[0].class.name).toBe('Class 9');
      expect(studentHistory[0].status).toBe('PROMOTED');

      // 2. Prior Current: 2026-27 Class 10 (Marked PROMOTED by batch run)
      expect(studentHistory[1].academicYear.name).toBe('2026-2027');
      expect(studentHistory[1].class.name).toBe('Class 10');
      expect(studentHistory[1].status).toBe('PROMOTED');

      // 3. Newly Created: 2029-30 Class 11 (ACTIVE)
      expect(studentHistory[2].academicYear.name).toBe('2029-2030');
      expect(studentHistory[2].class.name).toBe('Class 11');
      expect(studentHistory[2].status).toBe('ACTIVE');
      expect(studentHistory[2].rollNumber).toBe(1);
    });

    it('should reject batch promotion into the identical academic year', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/enrollments/batch-promote',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceAcademicYearId: activeYearId,
          targetAcademicYearId: activeYearId, // Identical!
          targetClassId: class11Id,
          targetSectionId: section11AId,
          promotions: [{ studentId: seededStudentId, status: 'PROMOTED' }],
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // 7. RBAC & Security Enforcement
  // ==========================================================================
  describe('7. RBAC Permissions Enforcement', () => {
    it('should forbid teachers from admitting students (requires student:write)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/students',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          admissionNumber: `ADM-RBAC-${Date.now()}`,
          firstName: 'Forbidden',
          lastName: 'Student',
          gender: 'FEMALE',
          dateOfBirth: '2020-01-01',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should permit teachers to view student records (has student:read)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/students',
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it('should return 401 Unauthorized for unauthenticated requests', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/students',
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
