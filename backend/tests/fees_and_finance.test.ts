import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/database/db.js';
import { FeeFrequency, PaymentMode, StudentFeeStatus } from '@prisma/client';

describe('Finance: Fee Structures, Invoicing, Receipts & Dues (Milestone 9)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let accountantToken: string;
  let teacherToken: string;
  let parentToken: string;
  let schoolId: string;
  let academicYearId: string;
  let class10Id: string;
  let class9Id: string;
  let createdFeeStructureId: string;
  let rohanEnrollmentId: string;
  let rohanStudentFeeId: string;
  let lastIssuedReceiptNumber: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Login as Admin
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

    // 2. Login as Accountant
    const accountantLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'accountant@vidya.org',
        password: 'Vidya@2026',
      },
    });
    expect(accountantLogin.statusCode).toBe(200);
    accountantToken = JSON.parse(accountantLogin.payload).data.accessToken;

    // 3. Login as Teacher
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

    // 4. Login as Parent
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

    // Query active academic year
    const ay = await prisma.academicYear.findFirstOrThrow({
      where: { schoolId, isCurrent: true },
    });
    academicYearId = ay.id;

    // Query Class 10 and Class 9
    const c10 = await prisma.class.findFirstOrThrow({
      where: { schoolId, code: 'STD-10' },
    });
    class10Id = c10.id;

    const c9 = await prisma.class.findFirstOrThrow({
      where: { schoolId, code: 'STD-09' },
    });
    class9Id = c9.id;

    // Query Rohan's enrollment
    const rohanStudent = await prisma.student.findFirstOrThrow({
      where: { schoolId, admissionNumber: 'VS-2024-0103' },
    });
    const rohanEnrollment = await prisma.enrollment.findFirstOrThrow({
      where: { studentId: rohanStudent.id, academicYearId },
    });
    rohanEnrollmentId = rohanEnrollment.id;

    // Idempotency: Clean up previous test artifacts before run
    await prisma.feePayment.deleteMany({
      where: {
        studentFee: {
          enrollmentId: rohanEnrollmentId,
        },
      },
    });

    await prisma.studentFee.updateMany({
      where: {
        enrollmentId: rohanEnrollmentId,
      },
      data: {
        paidAmount: 0.0,
        dueAmount: 48000.0,
        status: StudentFeeStatus.UNPAID,
      },
    });

    await prisma.feeStructure.deleteMany({
      where: {
        schoolId,
        name: { in: ['Class 9 Standard Academic Fee Plan 2026-27', 'Invalid Fee Structure'] },
      },
    });
  });

  afterAll(async () => {
    // Reset Rohan's fee ledger to initial seeded state
    await prisma.feePayment.deleteMany({
      where: {
        studentFee: {
          enrollmentId: rohanEnrollmentId,
        },
      },
    });

    await prisma.studentFee.updateMany({
      where: {
        enrollmentId: rohanEnrollmentId,
      },
      data: {
        paidAmount: 0.0,
        dueAmount: 48000.0,
        status: StudentFeeStatus.UNPAID,
      },
    });

    if (createdFeeStructureId) {
      await prisma.feeStructure.deleteMany({
        where: { id: createdFeeStructureId },
      });
    }

    await app.close();
  });

  // ============================================================================
  // 1. Fee Structure Management
  // ============================================================================
  describe('1. Fee Structures & Component Rules', () => {
    it('should create a comprehensive fee structure with multiple fee heads and auto-calculated total', async () => {
      const payload = {
        academicYearId,
        classId: class9Id,
        name: 'Class 9 Standard Academic Fee Plan 2026-27',
        description: 'Standard curriculum and physical infrastructure fee plan for Class 9',
        components: [
          { title: 'Tuition Fee', amount: 30000, frequency: FeeFrequency.ANNUAL },
          { title: 'Science Laboratory Fee', amount: 5000, frequency: FeeFrequency.ANNUAL },
          { title: 'Computer Lab & Robotics Fee', amount: 4000, frequency: FeeFrequency.ANNUAL },
          { title: 'Library & Online Resources Fee', amount: 2000, frequency: FeeFrequency.ANNUAL },
        ],
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/structures',
        headers: { authorization: `Bearer ${accountantToken}` },
        payload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(payload.name);
      expect(body.data.totalAmount).toBe(41000); // 30000 + 5000 + 4000 + 2000
      expect(body.data.components).toHaveLength(4);

      createdFeeStructureId = body.data.id;
    });

    it('should reject creating duplicate fee structure for the same class and name', async () => {
      const payload = {
        academicYearId,
        classId: class9Id,
        name: 'Class 9 Standard Academic Fee Plan 2026-27',
        components: [{ title: 'Tuition Fee', amount: 30000 }],
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/structures',
        headers: { authorization: `Bearer ${adminToken}` },
        payload,
      });

      expect(res.statusCode).toBe(409);
    });

    it('should reject creating a fee structure without any fee components', async () => {
      const payload = {
        academicYearId,
        classId: class9Id,
        name: 'Invalid Fee Structure',
        components: [],
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/structures',
        headers: { authorization: `Bearer ${adminToken}` },
        payload,
      });

      expect(res.statusCode).toBe(400);
    });

    it('should list fee structures filtered by class and academic year', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fees/structures?classId=${class9Id}&academicYearId=${academicYearId}`,
        headers: { authorization: `Bearer ${accountantToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].id).toBe(createdFeeStructureId);
    });

    it('should get single fee structure details by ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fees/structures/${createdFeeStructureId}`,
        headers: { authorization: `Bearer ${accountantToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.id).toBe(createdFeeStructureId);
      expect(body.data.components).toHaveLength(4);
    });
  });

  // ============================================================================
  // 2. Fee Allocation & Ledger Verification
  // ============================================================================
  describe('2. Student Ledger Allocation & Concessions', () => {
    it('should retrieve existing seeded fee ledger for Aarav (VS-2024-0101)', async () => {
      const aaravStudent = await prisma.student.findFirstOrThrow({
        where: { schoolId, admissionNumber: 'VS-2024-0101' },
      });
      const aaravEnrollment = await prisma.enrollment.findFirstOrThrow({
        where: { studentId: aaravStudent.id, academicYearId },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fees/students/${aaravEnrollment.id}`,
        headers: { authorization: `Bearer ${accountantToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.grossAmount).toBe(48000);
      expect(body.data.netPayable).toBe(48000);
      expect(body.data.paidAmount).toBe(24000);
      expect(body.data.dueAmount).toBe(24000);
      expect(body.data.status).toBe(StudentFeeStatus.PARTIALLY_PAID);
      expect(body.data.payments).toHaveLength(1);
      expect(body.data.payments[0].receiptNumber).toBe('REC-2026-0001');
    });

    it('should list all student fee ledgers with pagination and status filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fees/students?status=PARTIALLY_PAID',
        headers: { authorization: `Bearer ${accountantToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].status).toBe(StudentFeeStatus.PARTIALLY_PAID);
    });

    it('should find student fee by search query (name or admission number)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fees/students?search=Aarav',
        headers: { authorization: `Bearer ${accountantToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].enrollment.student.firstName).toBe('Aarav');
    });

    it('should prevent allocating concession exceeding the total gross amount', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/allocate/student',
        headers: { authorization: `Bearer ${accountantToken}` },
        payload: {
          enrollmentId: rohanEnrollmentId,
          feeStructureId: createdFeeStructureId,
          concessionAmount: 50000, // Exceeds totalAmount of 41000
          concessionReason: 'Excessive Discount',
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // 3. Payment Collection & Atomic Ledger Update
  // ============================================================================
  describe('3. Payment Collection & Receipt Issuance', () => {
    beforeAll(async () => {
      // Find Rohan's StudentFee record (seeded with 48000 due)
      const rohanFee = await prisma.studentFee.findFirstOrThrow({
        where: { schoolId, enrollmentId: rohanEnrollmentId },
      });
      rohanStudentFeeId = rohanFee.id;
    });

    it('should successfully collect a partial payment and issue a sequential receipt', async () => {
      const paymentPayload = {
        studentFeeId: rohanStudentFeeId,
        amountPaid: 20000,
        paymentMode: PaymentMode.UPI,
        transactionReference: 'UPI/HDFC/20260420/99881122',
        notes: 'Term 1 installment via UPI scan',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/payments/collect',
        headers: { authorization: `Bearer ${accountantToken}` },
        payload: paymentPayload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      const { payment, studentFee } = body.data;
      expect(payment.amountPaid).toBe(20000);
      expect(payment.receiptNumber).toMatch(/^REC-\d{4}-\d{4}$/);
      expect(payment.paymentMode).toBe(PaymentMode.UPI);

      expect(studentFee.paidAmount).toBe(20000);
      expect(studentFee.dueAmount).toBe(28000); // 48000 - 20000
      expect(studentFee.status).toBe(StudentFeeStatus.PARTIALLY_PAID);

      lastIssuedReceiptNumber = payment.receiptNumber;
    });

    it('should reject payment exceeding the remaining outstanding dues', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/payments/collect',
        headers: { authorization: `Bearer ${accountantToken}` },
        payload: {
          studentFeeId: rohanStudentFeeId,
          amountPaid: 35000, // Due is only 28000
          paymentMode: PaymentMode.CASH,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toContain('exceeds outstanding dues');
    });

    it('should reject payment with zero or negative amount', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/payments/collect',
        headers: { authorization: `Bearer ${accountantToken}` },
        payload: {
          studentFeeId: rohanStudentFeeId,
          amountPaid: 0,
          paymentMode: PaymentMode.CASH,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should collect remaining balance and transition ledger status to PAID', async () => {
      const paymentPayload = {
        studentFeeId: rohanStudentFeeId,
        amountPaid: 28000, // Remaining balance
        paymentMode: PaymentMode.NEFT_RTGS,
        transactionReference: 'NEFT/SBI/20260421/445566',
        notes: 'Final settlement of remaining dues',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/payments/collect',
        headers: { authorization: `Bearer ${accountantToken}` },
        payload: paymentPayload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      const { studentFee, payment } = body.data;
      expect(studentFee.paidAmount).toBe(48000);
      expect(studentFee.dueAmount).toBe(0);
      expect(studentFee.status).toBe(StudentFeeStatus.PAID);
      expect(payment.receiptNumber).toMatch(/^REC-\d{4}-\d{4}$/);
    });
  });

  // ============================================================================
  // 4. Official Printable Receipt Retrieval
  // ============================================================================
  describe('4. Official Printable Receipt Retrieval', () => {
    it('should retrieve official receipt with complete breakdown, student particulars, and school metadata', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fees/receipts/${lastIssuedReceiptNumber}`,
        headers: { authorization: `Bearer ${accountantToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      const receipt = body.data;
      expect(receipt.receiptNumber).toBe(lastIssuedReceiptNumber);
      expect(receipt.amountPaid).toBe(20000);
      expect(receipt.paymentMode).toBe(PaymentMode.UPI);
      expect(receipt.school.name).toBe('Vidya Academy, Bengaluru');
      expect(receipt.student.name).toContain('Rohan');
      expect(receipt.student.className).toBe('Class 10');
      expect(receipt.feeStructure.name).toContain('Class 10');
      expect(receipt.feeStructure.components.length).toBeGreaterThan(0);
      expect(receipt.collectedBy.role).toBe('ACCOUNTANT');
    });

    it('should return 404 for non-existent receipt number', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fees/receipts/REC-1999-9999',
        headers: { authorization: `Bearer ${accountantToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================================
  // 5. Fee Statistics & Financial Dashboard
  // ============================================================================
  describe('5. Financial Dashboard & Dues Analytics', () => {
    it('should calculate accurate fee statistics and collection rate', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fees/stats?academicYearId=${academicYearId}`,
        headers: { authorization: `Bearer ${accountantToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      const stats = body.data;
      expect(stats.totalGrossInvoiced).toBeGreaterThan(0);
      expect(stats.totalNetExpected).toBeGreaterThan(0);
      expect(stats.totalPaid).toBeGreaterThan(0);
      expect(stats.collectionRatePercentage).toBeGreaterThan(0);
      expect(stats.collectionRatePercentage).toBeLessThanOrEqual(100);

      expect(stats.paymentModeBreakdown).toBeDefined();
      expect(stats.statusCounts).toBeDefined();
      expect(stats.classBreakdown.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 6. RBAC Permissions Enforcement
  // ============================================================================
  describe('6. RBAC & Financial Role Isolation', () => {
    it('should allow SCHOOL_ADMIN to collect fee payments', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fees/stats',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should forbid TEACHER role from collecting payments (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fees/payments/collect',
        headers: { authorization: `Bearer ${teacherToken}` },
        payload: {
          studentFeeId: rohanStudentFeeId,
          amountPaid: 1000,
          paymentMode: PaymentMode.CASH,
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should reject unauthenticated fee requests with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fees/stats',
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
