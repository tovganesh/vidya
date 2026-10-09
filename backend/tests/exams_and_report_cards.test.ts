import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';
import { GradingEngine } from '../src/modules/exams/grading.engine.js';

describe('Academics: Examinations, Marks & CBSE Report Cards (Milestone 8)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let schoolId: string;
  let academicYearId: string;
  let class10Id: string;
  let term1Id: string;
  let examId: string;
  let theoryAssessmentId: string;
  let aaravEnrollmentId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login as Admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(adminLogin.statusCode).toBe(200);
    const adminData = JSON.parse(adminLogin.payload).data;
    adminToken = adminData.accessToken;
    schoolId = adminData.user.school.id;

    // Login as Teacher
    const teacherLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'teacher@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(teacherLogin.statusCode).toBe(200);
    teacherToken = JSON.parse(teacherLogin.payload).data.accessToken;

    // Login as Parent
    const parentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'parent@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(parentLogin.statusCode).toBe(200);
    parentToken = JSON.parse(parentLogin.payload).data.accessToken;

    // Fetch school structural IDs
    const school = await prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      include: {
        academicYears: { where: { isCurrent: true } },
        classes: { where: { code: 'STD-10' } },
        examTerms: { where: { isCurrent: true } },
      },
    });

    academicYearId = school.academicYears[0].id;
    class10Id = school.classes[0].id;
    term1Id = school.examTerms[0].id;

    const exam = await prisma.exam.findFirstOrThrow({
      where: { termId: term1Id, classId: class10Id },
      include: { assessments: true },
    });
    examId = exam.id;
    theoryAssessmentId = exam.assessments[0].id;

    const aaravStudent = await prisma.student.findFirstOrThrow({
      where: { schoolId, admissionNumber: 'VS-2024-0101' },
      include: { enrollments: { where: { academicYearId } } },
    });
    aaravEnrollmentId = aaravStudent.enrollments[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. Grading Engine Unit Logic
  // ============================================================================
  describe('Grading Engine Calculation Logic', () => {
    it('correctly maps percentages to CBSE 9-point grades and grade points', () => {
      expect(GradingEngine.calculateGrade(95.0)).toEqual({
        grade: 'A1',
        gradePoint: 10.0,
        description: 'Outstanding',
      });
      expect(GradingEngine.calculateGrade(85.5)).toEqual({
        grade: 'A2',
        gradePoint: 9.0,
        description: 'Excellent',
      });
      expect(GradingEngine.calculateGrade(74.0)).toEqual({
        grade: 'B1',
        gradePoint: 8.0,
        description: 'Very Good',
      });
      expect(GradingEngine.calculateGrade(63.2)).toEqual({
        grade: 'B2',
        gradePoint: 7.0,
        description: 'Good',
      });
      expect(GradingEngine.calculateGrade(55.0)).toEqual({
        grade: 'C1',
        gradePoint: 6.0,
        description: 'Fair',
      });
      expect(GradingEngine.calculateGrade(45.0)).toEqual({
        grade: 'C2',
        gradePoint: 5.0,
        description: 'Average',
      });
      expect(GradingEngine.calculateGrade(35.0)).toEqual({
        grade: 'D',
        gradePoint: 4.0,
        description: 'Pass',
      });
      expect(GradingEngine.calculateGrade(28.0)).toEqual({
        grade: 'E',
        gradePoint: 0.0,
        description: 'Essential Repeat',
      });
    });

    it('accurately evaluates subject components, total percentage, and pass status', () => {
      const evaluation = GradingEngine.evaluateSubject(
        'sub-math',
        'Mathematics',
        'MATH',
        [
          { type: 'THEORY', maxMarks: 80, obtained: 72, passingMarks: 26 },
          { type: 'INTERNAL_ASSESSMENT', maxMarks: 20, obtained: 18, passingMarks: 7 },
        ],
      );

      expect(evaluation.totalMaxMarks).toBe(100);
      expect(evaluation.totalMarksObtained).toBe(90);
      expect(evaluation.percentage).toBe(90);
      expect(evaluation.grade).toBe('A2');
      expect(evaluation.gradePoint).toBe(9.0);
      expect(evaluation.isPassed).toBe(true);
      expect(evaluation.isAbsent).toBe(false);
    });

    it('evaluates cumulative GPA, overall percentage, and pass/compartment status', () => {
      const subjects = [
        GradingEngine.evaluateSubject('s1', 'Math', 'MATH', [{ type: 'THEORY', maxMarks: 100, obtained: 95 }]),
        GradingEngine.evaluateSubject('s2', 'Science', 'SCI', [{ type: 'THEORY', maxMarks: 100, obtained: 92 }]),
        GradingEngine.evaluateSubject('s3', 'English', 'ENG', [{ type: 'THEORY', maxMarks: 100, obtained: 88 }]),
      ];

      const cumulative = GradingEngine.evaluateCumulative(subjects);
      expect(cumulative.totalMaxMarks).toBe(300);
      expect(cumulative.totalMarksObtained).toBe(275);
      expect(cumulative.aggregatePercentage).toBe(91.7);
      expect(cumulative.cgpa).toBe(9.7);
      expect(cumulative.overallGrade).toBe('A1');
      expect(cumulative.resultStatus).toBe('PASS');
      expect(cumulative.failedSubjectsCount).toBe(0);
    });
  });

  // ============================================================================
  // 2. Exam Terms & Exams Management
  // ============================================================================
  describe('Exam Terms & Scheduling APIs', () => {
    it('should list all exam terms for the school', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/terms',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.terms.length).toBeGreaterThanOrEqual(2);
      expect(body.terms.some((t: any) => t.name.includes('Term 1'))).toBe(true);
    });

    it('should create a new Unit Test exam term with valid dates', async () => {
      const termName = `Unit Test 1 (${Date.now()})`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/exams/terms',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          academicYearId,
          name: termName,
          type: 'UNIT_TEST_1',
          startDate: '2026-07-20T00:00:00Z',
          endDate: '2026-07-25T00:00:00Z',
          isCurrent: false,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe(termName);
      expect(body.type).toBe('UNIT_TEST_1');
    });

    it('should reject creating duplicate exam term name in the same academic year', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/exams/terms',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          academicYearId,
          name: 'Term 1 (Mid-Term Assessment)',
          startDate: '2026-09-15T00:00:00Z',
          endDate: '2026-09-30T00:00:00Z',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should list exams filtered by term and class', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams?termId=${term1Id}&classId=${class10Id}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.exams.length).toBeGreaterThan(0);
      expect(body.exams[0].name).toContain('Class 10 Mid-Term Examination');
    });
  });

  // ============================================================================
  // 3. Assessments & Boundary Validation on Maximum Limits
  // ============================================================================
  describe('Assessments & Marks Boundary Validation', () => {
    it('should retrieve assessments for an exam', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/${examId}/assessments`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.assessments.length).toBeGreaterThanOrEqual(5);
    });

    it('should retrieve student marks roster for an assessment', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/assessments/${theoryAssessmentId}/marks-sheet`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.assessment.id).toBe(theoryAssessmentId);
      expect(body.students.length).toBeGreaterThan(0);
      expect(body.students[0].fullName).toBeDefined();
    });

    it('should REJECT entering marks exceeding the assessment maximum limit', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/assessments/${theoryAssessmentId}/marks/batch`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          records: [
            {
              enrollmentId: aaravEnrollmentId,
              marksObtained: 105.0, // Assessment max marks is 80.0
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('exceeds maximum assessment limit');
    });

    it('should REJECT entering negative marks', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/assessments/${theoryAssessmentId}/marks/batch`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          records: [
            {
              enrollmentId: aaravEnrollmentId,
              marksObtained: -5.0,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.message).toContain('cannot be negative');
    });

    it('should successfully record and update valid marks within bounds', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/exams/assessments/${theoryAssessmentId}/marks/batch`,
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          records: [
            {
              enrollmentId: aaravEnrollmentId,
              marksObtained: 75.5,
              remarks: 'Consistently strong performance',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.count).toBe(1);

      // Verify persistence in database
      const record = await prisma.marksRecord.findUnique({
        where: {
          assessmentId_enrollmentId: {
            assessmentId: theoryAssessmentId,
            enrollmentId: aaravEnrollmentId,
          },
        },
      });
      expect(record?.marksObtained).toBe(75.5);
      expect(record?.remarks).toBe('Consistently strong performance');
    });
  });

  // ============================================================================
  // 4. Report Card Generation Engine
  // ============================================================================
  describe('CBSE Digital Report Card Engine', () => {
    it('should generate complete CBSE report card with subject grades and demographics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/report-card/${aaravEnrollmentId}?termId=${term1Id}`,
        headers: { authorization: `Bearer ${parentToken}` },
      });

      expect(res.statusCode).toBe(200);
      const report = JSON.parse(res.body);

      // School Information
      expect(report.school.name).toBe('Vidya Academy, Bengaluru');
      expect(report.school.board).toBe('CBSE');
      expect(report.school.affiliationNumber).toBeDefined();

      // Student 360 Demographics
      expect(report.student.fullName).toBe('Aarav S Kumar');
      expect(report.student.admissionNumber).toBe('VS-2024-0101');
      expect(report.student.apaarId).toBe('984512345678');
      expect(report.student.fatherName).toBeDefined();
      expect(report.student.motherName).toBeDefined();

      // Academic Context
      expect(report.academic.className).toBe('Class 10');
      expect(report.academic.sectionName).toBe('A');
      expect(report.academic.attendance.percentage).toBeDefined();

      // Subject Scholastic Performance
      expect(report.termResults.length).toBeGreaterThan(0);
      const termResult = report.termResults[0];
      expect(termResult.subjects.length).toBeGreaterThanOrEqual(4);

      // Check subject details
      const mathSubject = termResult.subjects.find((s: any) => s.subjectCode === 'MATH');
      expect(mathSubject).toBeDefined();
      expect(mathSubject.totalMaxMarks).toBe(100);
      expect(mathSubject.grade).toMatch(/^A[12]$/);
      expect(mathSubject.gradePoint).toBeGreaterThanOrEqual(9.0);
      expect(mathSubject.isPassed).toBe(true);

      // Overall Summary
      expect(report.overallSummary.totalMaxMarks).toBeGreaterThanOrEqual(400);
      expect(report.overallSummary.aggregatePercentage).toBeGreaterThan(80);
      expect(report.overallSummary.cgpa).toBeGreaterThanOrEqual(8.0);
      expect(report.overallSummary.resultStatus).toBe('PASS');
    });

    it('should expose master grading scales for the school', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/exams/grading-scales',
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.scales.length).toBe(8);
      expect(body.scales[0].grade).toBe('A1');
    });
  });
});
