import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';

describe('Daily Diary (Classwork & Homework) and Web Push Test Alerts', () => {
  let app: FastifyInstance;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;
  let schoolId: string;
  let class10Id: string;
  let section10AId: string;
  let subjectMathId: string;
  let activeYearId: string;
  let createdEntryId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.$connect();

    // 1. Login as Teacher
    const teacherLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'teacher@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(teacherLoginRes.statusCode).toBe(200);
    const teacherData = JSON.parse(teacherLoginRes.payload).data;
    teacherToken = teacherData.accessToken;
    schoolId = teacherData.user.school.id;

    // 2. Login as Parent
    const parentLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'parent@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(parentLoginRes.statusCode).toBe(200);
    parentToken = JSON.parse(parentLoginRes.payload).data.accessToken;

    // 3. Login as Student
    const studentLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'student@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(studentLoginRes.statusCode).toBe(200);
    studentToken = JSON.parse(studentLoginRes.payload).data.accessToken;

    // 4. Resolve IDs
    const activeYear = await prisma.academicYear.findFirstOrThrow({
      where: { schoolId, isCurrent: true },
    });
    activeYearId = activeYear.id;

    const class10 = await prisma.class.findFirstOrThrow({
      where: { schoolId, code: 'STD-10' },
    });
    class10Id = class10.id;

    const section10A = await prisma.section.findFirstOrThrow({
      where: { classId: class10Id, name: 'A' },
    });
    section10AId = section10A.id;

    const subjectMath = await prisma.subject.findFirstOrThrow({
      where: { schoolId, code: 'MATH' },
    });
    subjectMathId = subjectMath.id;
  });

  afterAll(async () => {
    if (createdEntryId) {
      await prisma.dailyDiaryEntry.deleteMany({
        where: { id: createdEntryId },
      });
    }
    await app.close();
  });

  it('1. Teacher should record classwork and homework notes for their subject and class', async () => {
    const testDate = '2026-10-15';
    const dueDate = '2026-10-16';

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/diary',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        academicYearId: activeYearId,
        classId: class10Id,
        sectionId: section10AId,
        subjectId: subjectMathId,
        date: testDate,
        classwork: 'Chapter 5: Arithmetic Progressions - Introduction and formulas for nth term.',
        homework: 'Solve Exercise 5.1 Questions 1 to 5 in homework copy.',
        dueDate,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.classwork).toContain('Arithmetic Progressions');
    expect(body.data.homework).toContain('Exercise 5.1');
    expect(body.data.subject.name).toBe('Mathematics');
    expect(body.data.class.name).toBe('Class 10');
    expect(body.data.section.name).toBe('A');

    createdEntryId = body.data.id;
  });

  it('2. Parent should view classwork and homework notes in their daily schedule without permission errors', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/diary?date=2026-10-15&sectionId=${section10AId}`,
      headers: { authorization: `Bearer ${parentToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const mathEntry = body.data.find((e: any) => e.subjectId === subjectMathId);
    expect(mathEntry).toBeDefined();
    expect(mathEntry.homework).toContain('Exercise 5.1');
  });

  it('3. Student should view classwork and homework notes in their daily schedule without permission errors', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/diary?date=2026-10-15&sectionId=${section10AId}`,
      headers: { authorization: `Bearer ${studentToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('4. Parent should query academic years and classes with inherent view permissions', async () => {
    const yearsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/academics/years',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(yearsRes.statusCode).toBe(200);

    const classesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/academics/classes',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(classesRes.statusCode).toBe(200);
  });

  it('5. Web push test alert endpoint should succeed gracefully and register notification', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/communication/push/test',
      headers: { authorization: `Bearer ${teacherToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });

  it('6. Teacher should update an existing daily diary entry', async () => {
    const testDate = '2026-10-15';

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/diary',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        academicYearId: activeYearId,
        classId: class10Id,
        sectionId: section10AId,
        subjectId: subjectMathId,
        date: testDate,
        classwork: 'Chapter 5: Arithmetic Progressions - Completed Exercise 5.1 completely.',
        homework: 'Revise Exercise 5.1 for tomorrow’s short quiz.',
        dueDate: '2026-10-16',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.classwork).toContain('Completed Exercise 5.1 completely');
    expect(body.data.homework).toContain('tomorrow’s short quiz');
  });
});
