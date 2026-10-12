import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';

describe('Milestone 10: End-to-End Indian School Operational Lifecycle', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let accountantToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;

  let schoolId: string;
  let academicYearId: string;
  let class10Id: string;
  let sectionAId: string;
  let aaravEnrollmentId: string;
  let aaravStudentFeeId: string;
  let createdPaymentReceiptNumber: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Authenticate administrative actors
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@vidya.org', password: 'Vidya@2026' },
    });
    expect(adminRes.statusCode).toBe(200);
    const adminData = JSON.parse(adminRes.payload).data;
    adminToken = adminData.accessToken;
    schoolId = adminData.user.school.id;

    const accountantRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'accountant@vidya.org', password: 'Vidya@2026' },
    });
    expect(accountantRes.statusCode).toBe(200);
    accountantToken = JSON.parse(accountantRes.payload).data.accessToken;

    const teacherRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'teacher@vidya.org', password: 'Vidya@2026' },
    });
    expect(teacherRes.statusCode).toBe(200);
    teacherToken = JSON.parse(teacherRes.payload).data.accessToken;

    const parentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'parent@vidya.org', password: 'Vidya@2026' },
    });
    expect(parentRes.statusCode).toBe(200);
    parentToken = JSON.parse(parentRes.payload).data.accessToken;

    const studentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'student@vidya.org', password: 'Vidya@2026' },
    });
    expect(studentRes.statusCode).toBe(200);
    studentToken = JSON.parse(studentRes.payload).data.accessToken;
    // Clean up any residue from prior runs
    await prisma.announcement.deleteMany({
      where: { title: 'Annual Sports Day 2026 Announcement' },
    });
    await prisma.feePayment.deleteMany({
      where: { notes: 'End-to-end integration test fee collection' },
    });
  });

  afterAll(async () => {
    // Cleanup temporary records created during e2e testing
    await prisma.announcement.deleteMany({
      where: { title: 'Annual Sports Day 2026 Announcement' },
    });
    await prisma.feePayment.deleteMany({
      where: { notes: 'End-to-end integration test fee collection' },
    });
    if (aaravStudentFeeId) {
      await prisma.studentFee.update({
        where: { id: aaravStudentFeeId },
        data: {
          paidAmount: 24000.0,
          dueAmount: 24000.0,
          status: 'PARTIALLY_PAID',
        },
      });
    }
    await app.close();
  });

  // =========================================================================
  // Phase 1: Core System & Diagnostic Health
  // =========================================================================
  describe('1. System Diagnostics & Tenant Isolation', () => {
    it('returns healthy status on system probe /api/v1/health', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
      expect(body.data.version).toBe('0.1.0');
      expect(body.data.database.status).toBe('connected');
    });

    it('enforces RBAC permission boundaries between roles', async () => {
      // Teacher attempts to access finance fee collection (should be 403 Forbidden)
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/payments/collect',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          studentFeeId: 'any-id',
          amountPaid: 1000,
          paymentMode: 'UPI',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // Phase 2: Academic Setup & Curriculum Structure
  // =========================================================================
  describe('2. Academic Architecture & Session Setup', () => {
    it('retrieves active academic session (2026-2027)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/academics/years',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const years = JSON.parse(res.payload).data;
      expect(Array.isArray(years)).toBe(true);
      const activeYear = years.find((y: any) => y.name === '2026-2027');
      expect(activeYear).toBeDefined();
      expect(activeYear.isCurrent).toBe(true);
      academicYearId = activeYear.id;
    });

    it('retrieves Class 10 with Section A and curricular subjects', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/academics/classes',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const classes = JSON.parse(res.payload).data;
      const class10 = classes.find((c: any) => c.name === 'Class 10');
      expect(class10).toBeDefined();
      class10Id = class10.id;

      const secA = class10.sections?.find((s: any) => s.name === 'A');
      expect(secA).toBeDefined();
      sectionAId = secA.id;
    });
  });

  // =========================================================================
  // Phase 3: People Management & Student Enrollment
  // =========================================================================
  describe('3. Student Demographic & Guardian Profiles', () => {
    it('retrieves Aarav Patel profile and validates enrollment link', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/students?classId=${class10Id}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.data)).toBe(true);

      const aarav = body.data.find((s: any) => s.admissionNumber === 'VS-2024-0101');
      expect(aarav).toBeDefined();
      expect(aarav.fullName).toContain('Aarav');

      const enrollmentId = aarav.currentEnrollment?.id;
      expect(enrollmentId).toBeDefined();
      aaravEnrollmentId = enrollmentId;
    });
  });

  // =========================================================================
  // Phase 4: Attendance Operations & Weekly Timetable
  // =========================================================================
  describe('4. Daily Attendance & Class Timetable', () => {
    it('queries attendance status for Class 10 Section A', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/attendance/sheet?sectionId=${sectionAId}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('queries timetable schedule for Class 10-A', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/timetable/section/${sectionAId}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // =========================================================================
  // Phase 5: Communication, Announcements & Alerts
  // =========================================================================
  describe('5. Notice Board & Announcements', () => {
    it('creates an urgent announcement on the digital notice board', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communication/announcements',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          title: 'Annual Sports Day 2026 Announcement',
          content: 'The Annual Athletic Meet will commence on 15th November 2026. All students must report in sports uniform.',
          priority: 'NORMAL',
          targetAudience: 'ALL_SCHOOL',
        },
      });
      expect(res.statusCode).toBe(201);
      const announcement = JSON.parse(res.payload);
      expect(announcement.title).toContain('Annual Sports Day 2026');
    });

    it('allows parents to view active school announcements', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/communication/announcements',
        headers: { authorization: `Bearer ${parentToken}` },
      });
      expect(res.statusCode).toBe(200);
      const result = JSON.parse(res.payload);
      expect(Array.isArray(result.announcements)).toBe(true);
      expect(result.announcements.some((n: any) => n.title.includes('Sports Day'))).toBe(true);
    });
  });

  // =========================================================================
  // Phase 6: Examinations, Marks & CBSE Report Cards
  // =========================================================================
  describe('6. Examination Evaluation & CBSE Report Cards', () => {
    it('queries exam terms for the academic session', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/terms?academicYearId=${academicYearId}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });
      expect(res.statusCode).toBe(200);
      const result = JSON.parse(res.payload);
      expect(Array.isArray(result.terms)).toBe(true);
      expect(result.terms.length).toBeGreaterThan(0);
    });

    it('computes CBSE-format report card for Aarav Patel', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/exams/report-card/${aaravEnrollmentId}`,
        headers: { authorization: `Bearer ${parentToken}` },
      });
      expect(res.statusCode).toBe(200);
      const report = JSON.parse(res.payload);
      expect(report.student.admissionNumber).toBe('VS-2024-0101');
      expect(report.student.fullName).toContain('Aarav');
      expect(report.academic.className).toBe('Class 10');
      expect(report.termResults.length).toBeGreaterThan(0);
      expect(report.overallSummary).toBeDefined();
      expect(report.overallSummary.aggregatePercentage).toBeGreaterThan(0);
      expect(report.overallSummary.overallGrade).toBeDefined();
    });
  });

  // =========================================================================
  // Phase 7: Finance, Payment Collection & Indian Receipts
  // =========================================================================
  describe('7. Fee Ledgers, Collection & Official CBSE Receipts', () => {
    it('fetches fee ledger for Aarav Patel and verifies dues', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fees/students?academicYearId=${academicYearId}&search=Aarav`,
        headers: { authorization: `Bearer ${accountantToken}` },
      });
      expect(res.statusCode).toBe(200);
      const response = JSON.parse(res.payload);
      expect(response.data.length).toBeGreaterThan(0);
      const aaravLedger = response.data[0];
      expect(aaravLedger.grossAmount).toBe(48000);
      expect(aaravLedger.dueAmount).toBeGreaterThan(0);
      aaravStudentFeeId = aaravLedger.id;
    });

    it('rejects fee overpayment exceeding outstanding dues', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/payments/collect',
        headers: { authorization: `Bearer ${accountantToken}` },
        payload: {
          studentFeeId: aaravStudentFeeId,
          amountPaid: 999999, // Exceeds outstanding balance
          paymentMode: 'UPI',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error.message).toContain('Payment amount');
      expect(JSON.parse(res.payload).error.message).toContain('exceeds');
    });

    it('collects partial fee via UPI and generates sequential Indian receipt', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/payments/collect',
        headers: { authorization: `Bearer ${accountantToken}` },
        payload: {
          studentFeeId: aaravStudentFeeId,
          amountPaid: 5000,
          paymentMode: 'UPI',
          transactionReference: 'UPI-E2E-TEST-998811',
          notes: 'End-to-end integration test fee collection',
        },
      });
      expect(res.statusCode).toBe(201);
      const paymentData = JSON.parse(res.payload).data;
      expect(paymentData.payment.amountPaid).toBe(5000);
      expect(paymentData.payment.receiptNumber).toMatch(/^REC-\d{4}-\d{4}$/);
      createdPaymentReceiptNumber = paymentData.payment.receiptNumber;

      // Verify ledger balance updated
      expect(paymentData.studentFee.paidAmount).toBeGreaterThan(24000);
    });

    it('retrieves official CBSE-formatted fee receipt by receipt number', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fees/receipts/${createdPaymentReceiptNumber}`,
        headers: { authorization: `Bearer ${accountantToken}` },
      });
      expect(res.statusCode).toBe(200);
      const receipt = JSON.parse(res.payload).data;
      expect(receipt.receiptNumber).toBe(createdPaymentReceiptNumber);
      expect(receipt.school.name).toBe('Vidya Academy, Bengaluru');
      expect(receipt.school.board).toBe('CBSE');
      expect(receipt.student.name).toContain('Aarav');
      expect(receipt.amountPaid).toBe(5000);
      expect(receipt.paymentMode).toBe('UPI');
    });

    it('computes executive financial KPI metrics with collection rates', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fees/stats?academicYearId=${academicYearId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const stats = JSON.parse(res.payload).data;
      expect(stats.totalGrossInvoiced).toBeGreaterThan(0);
      expect(stats.totalPaid).toBeGreaterThan(0);
      expect(stats.collectionRatePercentage).toBeGreaterThan(0);
      expect(stats.classBreakdown.length).toBeGreaterThan(0);
    });
  });
});
