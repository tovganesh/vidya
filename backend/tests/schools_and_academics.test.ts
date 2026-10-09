import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';

describe('School Administration & Academic Setup (Milestone 4)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let teacherToken: string;
  let schoolId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await prisma.$connect();

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
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('1. School Profile & Campuses', () => {
    it('should retrieve school profile with campuses and academic counts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/schools/profile',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Vidya Academy, Bengaluru');
      expect(body.data.code).toBe('VS-BLR-01');
      expect(body.data.board).toBe('CBSE');
      expect(body.data._count.classes).toBeGreaterThan(0);
      expect(body.data._count.sections).toBeGreaterThan(0);
      expect(body.data.currentAcademicYear).not.toBeNull();
    });

    it('should update school contact details and address', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/schools/profile',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          phone: '+91 80 2345 9999',
          address: {
            street: '100 Feet Road, Indiranagar',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560038',
            country: 'India',
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.phone).toBe('+91 80 2345 9999');
      expect(body.data.address.postalCode).toBe('560038');
    });

    it('should reject school profile update from teacher role (403)', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/v1/schools/profile',
        headers: {
          authorization: `Bearer ${teacherToken}`,
        },
        payload: {
          name: 'Hacked School Name',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should create, list, update, and delete a campus', async () => {
      // 1. Create Campus
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/schools/campuses',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'North Campus Annex',
          address: { city: 'Bengaluru', area: 'Yelahanka' },
        },
      });

      expect(createRes.statusCode).toBe(201);
      const campus = JSON.parse(createRes.payload).data;
      expect(campus.name).toBe('North Campus Annex');

      // 2. List Campuses
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/schools/campuses',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.payload).data;
      expect(list.some((c: { id: string }) => c.id === campus.id)).toBe(true);

      // 3. Update Campus
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/schools/campuses/${campus.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'North Campus - Senior Wing',
        },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(JSON.parse(updateRes.payload).data.name).toBe('North Campus - Senior Wing');

      // 4. Delete Campus
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/schools/campuses/${campus.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(delRes.statusCode).toBe(200);
    });
  });

  describe('2. Academic Years Management', () => {
    let createdYearId: string;

    it('should list existing academic years', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/academics/years',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const years = JSON.parse(res.payload).data;
      expect(years.length).toBeGreaterThanOrEqual(1);
      const active = years.find((y: { isCurrent: boolean }) => y.isCurrent);
      expect(active).toBeDefined();
    });

    it('should reject academic year creation when start date is after end date', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/academics/years',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: '2099-2100',
          startDate: '2099-12-31T00:00:00Z',
          endDate: '2099-01-01T00:00:00Z', // Invalid
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should create a new upcoming academic year in PLANNING status', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/academics/years',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: '2027-2028',
          startDate: '2027-06-01T00:00:00Z',
          endDate: '2028-04-30T23:59:59Z',
          status: 'PLANNING',
          isCurrent: false,
        },
      });

      expect(res.statusCode).toBe(201);
      const year = JSON.parse(res.payload).data;
      expect(year.name).toBe('2027-2028');
      expect(year.isCurrent).toBe(false);
      createdYearId = year.id;
    });

    it('should activate the new academic year and ensure only one is current', async () => {
      const activateRes = await app.inject({
        method: 'POST',
        url: `/api/v1/academics/years/${createdYearId}/activate`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(activateRes.statusCode).toBe(200);
      const activated = JSON.parse(activateRes.payload).data;
      expect(activated.id).toBe(createdYearId);
      expect(activated.isCurrent).toBe(true);
      expect(activated.status).toBe('ACTIVE');

      // Verify in DB that exactly one year in this school has isCurrent = true
      const currentYears = await prisma.academicYear.findMany({
        where: { schoolId, isCurrent: true },
      });
      expect(currentYears.length).toBe(1);
      expect(currentYears[0].id).toBe(createdYearId);
    });

    it('should reject deleting the active academic year', async () => {
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/academics/years/${createdYearId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(delRes.statusCode).toBe(400);
    });

    it('should restore original active academic year (2026-2027)', async () => {
      const orig = await prisma.academicYear.findFirst({
        where: { schoolId, name: '2026-2027' },
      });
      expect(orig).toBeDefined();

      const activateRes = await app.inject({
        method: 'POST',
        url: `/api/v1/academics/years/${orig!.id}/activate`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(activateRes.statusCode).toBe(200);

      // Now we can safely delete the test year 2027-2028
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/academics/years/${createdYearId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(delRes.statusCode).toBe(200);
    });
  });

  describe('3. Classes & Sections Management', () => {
    let testClassId: string;
    let testSectionId: string;

    it('should list existing classes with sections count', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/academics/classes',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const classes = JSON.parse(res.payload).data;
      expect(classes.length).toBeGreaterThan(0);
      expect(classes[0].sections.length).toBeGreaterThan(0);
    });

    it('should create a new class', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/academics/classes',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Playgroup',
          code: 'PLAY-01',
          stage: 'PRE_PRIMARY',
          orderIndex: 99,
        },
      });

      expect(res.statusCode).toBe(201);
      const cls = JSON.parse(res.payload).data;
      expect(cls.name).toBe('Playgroup');
      expect(cls.code).toBe('PLAY-01');
      testClassId = cls.id;
    });

    it('should reject creating a class with duplicate code in same school (409)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/academics/classes',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Another Playgroup',
          code: 'PLAY-01',
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should create a section under the new class', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/academics/sections',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          classId: testClassId,
          name: 'Sunflowers',
          roomNumber: 'R-101',
          capacity: 25,
        },
      });

      expect(res.statusCode).toBe(201);
      const section = JSON.parse(res.payload).data;
      expect(section.name).toBe('Sunflowers');
      expect(section.capacity).toBe(25);
      testSectionId = section.id;
    });

    it('should reject duplicate section name in same class (409)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/academics/sections',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          classId: testClassId,
          name: 'Sunflowers',
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should update section capacity', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/academics/sections/${testSectionId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          capacity: 30,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.capacity).toBe(30);
    });

    it('should cleanup test section and class', async () => {
      const delSec = await app.inject({
        method: 'DELETE',
        url: `/api/v1/academics/sections/${testSectionId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(delSec.statusCode).toBe(200);

      const delCls = await app.inject({
        method: 'DELETE',
        url: `/api/v1/academics/classes/${testClassId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(delCls.statusCode).toBe(200);
    });
  });

  describe('4. Subjects Master & Class Assignments', () => {
    let testSubjectId: string;
    let targetClassId: string;

    beforeAll(async () => {
      const class1 = await prisma.class.findFirst({
        where: { schoolId, code: 'STD-01' },
      });
      targetClassId = class1!.id;
    });

    it('should list subjects with class counts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/academics/subjects',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const subjects = JSON.parse(res.payload).data;
      expect(subjects.length).toBeGreaterThan(0);
    });

    it('should create a new elective subject', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/academics/subjects',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'French Language',
          code: 'FRE',
          type: 'THEORY',
        },
      });

      expect(res.statusCode).toBe(201);
      const subject = JSON.parse(res.payload).data;
      expect(subject.name).toBe('French Language');
      expect(subject.code).toBe('FRE');
      testSubjectId = subject.id;
    });

    it('should reject creating duplicate subject code (409)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/academics/subjects',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'French Studies',
          code: 'FRE',
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should assign subject to Class 1', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/academics/classes/${targetClassId}/subjects`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          assignments: [
            {
              subjectId: testSubjectId,
              isCompulsory: false,
              weeklyPeriods: 3,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const mappings = JSON.parse(res.payload).data;
      expect(mappings.length).toBe(1);
      expect(mappings[0].subjectId).toBe(testSubjectId);
      expect(mappings[0].weeklyPeriods).toBe(3);
    });

    it('should unassign subject from Class 1 and delete subject', async () => {
      const unassignRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/academics/classes/${targetClassId}/subjects/${testSubjectId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(unassignRes.statusCode).toBe(200);

      const delSubjectRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/academics/subjects/${testSubjectId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(delSubjectRes.statusCode).toBe(200);
    });
  });
});
