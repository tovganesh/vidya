import { prisma } from '../../database/db.js';
import { FeeFrequency, StudentFeeStatus, PaymentMode } from '@prisma/client';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/index.js';

export interface CreateFeeComponentDto {
  title: string;
  amount: number;
  frequency?: FeeFrequency;
  dueDate?: string | Date;
}

export interface CreateFeeStructureDto {
  academicYearId: string;
  classId: string;
  name: string;
  description?: string;
  components: CreateFeeComponentDto[];
}

export interface AllocateStudentFeeDto {
  enrollmentId: string;
  feeStructureId: string;
  concessionAmount?: number;
  concessionReason?: string;
  dueDate?: string | Date;
}

export interface BatchAllocateClassFeeDto {
  academicYearId: string;
  classId: string;
  feeStructureId: string;
  sectionId?: string;
  defaultConcessionAmount?: number;
  defaultConcessionReason?: string;
}

export interface CollectPaymentDto {
  studentFeeId: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  notes?: string;
  paidOn?: string | Date;
}

export interface ListStudentFeesQuery {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: StudentFeeStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export class FeesService {
  /**
   * Create a new fee structure with individual fee heads/components
   */
  async createFeeStructure(schoolId: string, data: CreateFeeStructureDto) {
    if (!data.components || data.components.length === 0) {
      throw new BadRequestError('At least one fee component is required');
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundError('School not found');

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: data.academicYearId, schoolId },
    });
    if (!academicYear) throw new NotFoundError('Academic year not found in this school');

    const classEntity = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!classEntity) throw new NotFoundError('Class not found in this school');

    const existing = await prisma.feeStructure.findUnique({
      where: {
        schoolId_academicYearId_classId_name: {
          schoolId,
          academicYearId: data.academicYearId,
          classId: data.classId,
          name: data.name,
        },
      },
    });
    if (existing) {
      throw new ConflictError(`Fee structure '${data.name}' already exists for this class and academic year`);
    }

    const totalAmount = data.components.reduce(
      (sum, comp) => sum + Number(comp.amount || 0),
      0
    );

    return prisma.feeStructure.create({
      data: {
        schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        name: data.name,
        description: data.description,
        totalAmount: Number(totalAmount.toFixed(2)),
        components: {
          create: data.components.map((comp) => ({
            title: comp.title,
            amount: Number(Number(comp.amount).toFixed(2)),
            frequency: comp.frequency || FeeFrequency.ANNUAL,
            dueDate: comp.dueDate ? new Date(comp.dueDate) : null,
          })),
        },
      },
      include: {
        components: true,
        class: true,
        academicYear: true,
      },
    });
  }

  /**
   * List all fee structures for a school
   */
  async listFeeStructures(schoolId: string, filter?: { academicYearId?: string; classId?: string }) {
    const where: any = { schoolId };
    if (filter?.academicYearId) where.academicYearId = filter.academicYearId;
    if (filter?.classId) where.classId = filter.classId;

    return prisma.feeStructure.findMany({
      where,
      include: {
        components: true,
        class: {
          select: { id: true, name: true, code: true, stage: true },
        },
        academicYear: {
          select: { id: true, name: true, isCurrent: true },
        },
        _count: {
          select: { studentFees: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single fee structure by ID
   */
  async getFeeStructure(schoolId: string, id: string) {
    const structure = await prisma.feeStructure.findFirst({
      where: { id, schoolId },
      include: {
        components: true,
        class: true,
        academicYear: true,
        _count: {
          select: { studentFees: true },
        },
      },
    });
    if (!structure) throw new NotFoundError('Fee structure not found');
    return structure;
  }

  /**
   * Allocate fee structure to a specific student enrollment
   */
  async allocateFeeStructureToStudent(schoolId: string, data: AllocateStudentFeeDto) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: data.enrollmentId, schoolId },
      include: {
        student: true,
        class: true,
        section: true,
      },
    });
    if (!enrollment) throw new NotFoundError('Enrollment record not found');

    const feeStructure = await prisma.feeStructure.findFirst({
      where: { id: data.feeStructureId, schoolId },
    });
    if (!feeStructure) throw new NotFoundError('Fee structure not found');

    const existing = await prisma.studentFee.findUnique({
      where: {
        enrollmentId_feeStructureId: {
          enrollmentId: data.enrollmentId,
          feeStructureId: data.feeStructureId,
        },
      },
    });
    if (existing) {
      throw new ConflictError('This fee structure is already allocated to the student for this academic year');
    }

    const grossAmount = Number(feeStructure.totalAmount.toFixed(2));
    const concessionAmount = Number((data.concessionAmount || 0).toFixed(2));

    if (concessionAmount > grossAmount) {
      throw new BadRequestError('Concession amount cannot exceed total gross fee amount');
    }

    const netPayable = Number((grossAmount - concessionAmount).toFixed(2));
    const dueAmount = netPayable;
    const status = dueAmount === 0 ? StudentFeeStatus.PAID : StudentFeeStatus.UNPAID;

    return prisma.studentFee.create({
      data: {
        schoolId,
        enrollmentId: data.enrollmentId,
        feeStructureId: data.feeStructureId,
        grossAmount,
        concessionAmount,
        concessionReason: data.concessionReason || null,
        netPayable,
        paidAmount: 0.0,
        dueAmount,
        status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        enrollment: {
          include: {
            student: true,
            class: true,
            section: true,
          },
        },
        feeStructure: {
          include: {
            components: true,
          },
        },
      },
    });
  }

  /**
   * Batch allocate a fee structure to an entire class or section
   */
  async batchAllocateFeeStructureToClass(schoolId: string, data: BatchAllocateClassFeeDto) {
    const feeStructure = await prisma.feeStructure.findFirst({
      where: { id: data.feeStructureId, schoolId },
    });
    if (!feeStructure) throw new NotFoundError('Fee structure not found');

    const enrollmentWhere: any = {
      schoolId,
      academicYearId: data.academicYearId,
      classId: data.classId,
      status: 'ACTIVE',
    };
    if (data.sectionId) {
      enrollmentWhere.sectionId = data.sectionId;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: { id: true },
    });

    if (enrollments.length === 0) {
      return { count: 0, totalAllocated: 0, allocatedEnrollmentIds: [] };
    }

    const existingAllocations = await prisma.studentFee.findMany({
      where: {
        schoolId,
        feeStructureId: data.feeStructureId,
        enrollmentId: { in: enrollments.map((e) => e.id) },
      },
      select: { enrollmentId: true },
    });
    const alreadyAllocatedSet = new Set(existingAllocations.map((a) => a.enrollmentId));

    const pendingEnrollments = enrollments.filter((e) => !alreadyAllocatedSet.has(e.id));
    if (pendingEnrollments.length === 0) {
      return { count: 0, totalAllocated: 0, allocatedEnrollmentIds: [] };
    }

    const grossAmount = Number(feeStructure.totalAmount.toFixed(2));
    const concessionAmount = Number((data.defaultConcessionAmount || 0).toFixed(2));
    const netPayable = Number((grossAmount - concessionAmount).toFixed(2));
    const dueAmount = netPayable;
    const status = dueAmount === 0 ? StudentFeeStatus.PAID : StudentFeeStatus.UNPAID;

    const createData = pendingEnrollments.map((e) => ({
      schoolId,
      enrollmentId: e.id,
      feeStructureId: data.feeStructureId,
      grossAmount,
      concessionAmount,
      concessionReason: data.defaultConcessionReason || null,
      netPayable,
      paidAmount: 0.0,
      dueAmount,
      status,
    }));

    await prisma.studentFee.createMany({
      data: createData,
    });

    return {
      count: createData.length,
      totalAllocated: createData.length * netPayable,
      allocatedEnrollmentIds: pendingEnrollments.map((e) => e.id),
    };
  }

  /**
   * List student fee ledgers with search and filters
   */
  async listStudentFees(schoolId: string, query: ListStudentFeesQuery = {}) {
    const { academicYearId, classId, sectionId, status, search, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (status) {
      where.status = status;
    }

    const enrollmentWhere: any = {};
    if (academicYearId) enrollmentWhere.academicYearId = academicYearId;
    if (classId) enrollmentWhere.classId = classId;
    if (sectionId) enrollmentWhere.sectionId = sectionId;

    if (search && search.trim()) {
      const q = search.trim();
      enrollmentWhere.student = {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { admissionNumber: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    if (Object.keys(enrollmentWhere).length > 0) {
      where.enrollment = enrollmentWhere;
    }

    const [total, items] = await Promise.all([
      prisma.studentFee.count({ where }),
      prisma.studentFee.findMany({
        where,
        skip,
        take: limit,
        include: {
          enrollment: {
            include: {
              student: {
                select: {
                  id: true,
                  admissionNumber: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  photoUrl: true,
                },
              },
              class: { select: { id: true, name: true, code: true } },
              section: { select: { id: true, name: true } },
              academicYear: { select: { id: true, name: true } },
            },
          },
          feeStructure: {
            select: { id: true, name: true, totalAmount: true },
          },
          payments: {
            orderBy: { paidOn: 'desc' },
            take: 1,
            select: {
              id: true,
              receiptNumber: true,
              amountPaid: true,
              paidOn: true,
              paymentMode: true,
            },
          },
        },
        orderBy: [
          { enrollment: { class: { orderIndex: 'asc' } } },
          { enrollment: { section: { name: 'asc' } } },
          { enrollment: { rollNumber: 'asc' } },
        ],
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single student fee ledger details by ID or Enrollment ID
   */
  async getStudentFeeDetails(schoolId: string, idOrEnrollmentId: string) {
    const studentFee = await prisma.studentFee.findFirst({
      where: {
        schoolId,
        OR: [{ id: idOrEnrollmentId }, { enrollmentId: idOrEnrollmentId }],
      },
      include: {
        enrollment: {
          include: {
            student: true,
            class: true,
            section: true,
            academicYear: true,
          },
        },
        feeStructure: {
          include: {
            components: true,
          },
        },
        payments: {
          orderBy: { paidOn: 'desc' },
          include: {
            collectedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                primaryRole: true,
              },
            },
          },
        },
      },
    });

    if (!studentFee) throw new NotFoundError('Student fee ledger not found');
    return studentFee;
  }

  /**
   * Generate next sequential receipt number: REC-YYYY-0001
   */
  private async getNextReceiptNumber(schoolId: string, tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    const count = await tx.feePayment.count({
      where: {
        schoolId,
        receiptNumber: { startsWith: prefix },
      },
    });

    const nextSeq = count + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Atomically collect a fee payment and issue an immutable sequential receipt
   */
  async collectPayment(schoolId: string, actorId: string | undefined, data: CollectPaymentDto) {
    const amountPaid = Number(Number(data.amountPaid).toFixed(2));
    if (isNaN(amountPaid) || amountPaid <= 0) {
      throw new BadRequestError('Payment amount must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
      const studentFee = await tx.studentFee.findFirst({
        where: { id: data.studentFeeId, schoolId },
        include: {
          enrollment: {
            include: {
              student: true,
              class: true,
              section: true,
            },
          },
        },
      });

      if (!studentFee) {
        throw new NotFoundError('Student fee ledger not found');
      }

      if (amountPaid > studentFee.dueAmount) {
        throw new BadRequestError(
          `Payment amount (₹${amountPaid}) exceeds outstanding dues (₹${studentFee.dueAmount})`
        );
      }

      const receiptNumber = await this.getNextReceiptNumber(schoolId, tx);

      const payment = await tx.feePayment.create({
        data: {
          schoolId,
          studentFeeId: data.studentFeeId,
          receiptNumber,
          amountPaid,
          paymentMode: data.paymentMode || PaymentMode.UPI,
          transactionReference: data.transactionReference?.trim() || null,
          paidOn: data.paidOn ? new Date(data.paidOn) : new Date(),
          notes: data.notes?.trim() || null,
          collectedById: actorId || null,
        },
        include: {
          collectedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              primaryRole: true,
            },
          },
        },
      });

      const newPaid = Number((studentFee.paidAmount + amountPaid).toFixed(2));
      const newDue = Number((studentFee.netPayable - newPaid).toFixed(2));
      const newStatus =
        newDue <= 0 ? StudentFeeStatus.PAID : StudentFeeStatus.PARTIALLY_PAID;

      const updatedStudentFee = await tx.studentFee.update({
        where: { id: studentFee.id },
        data: {
          paidAmount: newPaid,
          dueAmount: newDue > 0 ? newDue : 0.0,
          status: newStatus,
        },
      });

      // Audit Log for financial integrity
      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: actorId || null,
          action: 'FEE_PAYMENT_COLLECTED',
          entityType: 'FeePayment',
          entityId: payment.id,
          diff: {
            receiptNumber,
            amountPaid,
            paymentMode: data.paymentMode,
            studentFeeId: studentFee.id,
            studentId: studentFee.enrollment.studentId,
            studentName: `${studentFee.enrollment.student.firstName} ${studentFee.enrollment.student.lastName}`,
            previousDue: studentFee.dueAmount,
            remainingDue: updatedStudentFee.dueAmount,
          },
        },
      });

      return {
        payment,
        studentFee: updatedStudentFee,
      };
    });
  }

  /**
   * Get official printable receipt by receipt number
   */
  async getReceipt(schoolId: string, receiptNumber: string) {
    const payment = await prisma.feePayment.findFirst({
      where: {
        schoolId,
        receiptNumber,
      },
      include: {
        school: true,
        collectedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            primaryRole: true,
          },
        },
        studentFee: {
          include: {
            feeStructure: {
              include: { components: true },
            },
            enrollment: {
              include: {
                student: true,
                class: true,
                section: true,
                academicYear: true,
              },
            },
          },
        },
      },
    });

    if (!payment) throw new NotFoundError(`Receipt '${receiptNumber}' not found`);

    const { school, studentFee, collectedBy } = payment;
    const { enrollment, feeStructure } = studentFee;
    const { student } = enrollment;

    return {
      receiptNumber: payment.receiptNumber,
      paidOn: payment.paidOn,
      amountPaid: payment.amountPaid,
      paymentMode: payment.paymentMode,
      transactionReference: payment.transactionReference,
      notes: payment.notes,
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        board: school.board,
        affiliationNumber: school.affiliationNumber,
        address: school.address,
        phone: school.phone,
        email: school.email,
      },
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        name: `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}`,
        className: enrollment.class.name,
        sectionName: enrollment.section.name,
        rollNumber: enrollment.rollNumber,
        academicYear: enrollment.academicYear.name,
      },
      feeStructure: {
        id: feeStructure.id,
        name: feeStructure.name,
        components: feeStructure.components.map((c) => ({
          title: c.title,
          amount: c.amount,
          frequency: c.frequency,
        })),
      },
      ledger: {
        grossAmount: studentFee.grossAmount,
        concessionAmount: studentFee.concessionAmount,
        concessionReason: studentFee.concessionReason,
        netPayable: studentFee.netPayable,
        totalPaidTillDate: studentFee.paidAmount,
        remainingDue: studentFee.dueAmount,
        status: studentFee.status,
      },
      collectedBy: collectedBy
        ? {
            name: `${collectedBy.firstName} ${collectedBy.lastName}`,
            role: collectedBy.primaryRole,
            email: collectedBy.email,
          }
        : null,
    };
  }

  /**
   * Get financial dues summary and collection analytics
   */
  async getFeeStatistics(schoolId: string, academicYearId?: string) {
    const where: any = { schoolId };
    if (academicYearId) {
      where.enrollment = { academicYearId };
    }

    const studentFees = await prisma.studentFee.findMany({
      where,
      select: {
        grossAmount: true,
        concessionAmount: true,
        netPayable: true,
        paidAmount: true,
        dueAmount: true,
        status: true,
        enrollment: {
          select: {
            class: { select: { id: true, name: true, orderIndex: true } },
          },
        },
      },
    });

    const paymentsWhere: any = { schoolId };
    if (academicYearId) {
      paymentsWhere.studentFee = {
        enrollment: { academicYearId },
      };
    }

    const payments = await prisma.feePayment.findMany({
      where: paymentsWhere,
      select: {
        amountPaid: true,
        paymentMode: true,
      },
    });

    let totalGrossInvoiced = 0;
    let totalConcessions = 0;
    let totalNetExpected = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    const statusCounts: Record<string, number> = {
      PAID: 0,
      PARTIALLY_PAID: 0,
      UNPAID: 0,
      OVERDUE: 0,
    };

    const classStatsMap: Record<
      string,
      { className: string; expected: number; collected: number; due: number; count: number }
    > = {};

    for (const f of studentFees) {
      totalGrossInvoiced += f.grossAmount;
      totalConcessions += f.concessionAmount;
      totalNetExpected += f.netPayable;
      totalPaid += f.paidAmount;
      totalOutstanding += f.dueAmount;

      statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;

      const className = f.enrollment.class.name;
      if (!classStatsMap[className]) {
        classStatsMap[className] = {
          className,
          expected: 0,
          collected: 0,
          due: 0,
          count: 0,
        };
      }
      const classEntry = classStatsMap[className]!;
      classEntry.expected += f.netPayable;
      classEntry.collected += f.paidAmount;
      classEntry.due += f.dueAmount;
      classEntry.count += 1;
    }

    const paymentModeBreakdown: Record<string, { count: number; totalAmount: number }> = {};
    for (const p of payments) {
      const modeKey = p.paymentMode;
      if (!paymentModeBreakdown[modeKey]) {
        paymentModeBreakdown[modeKey] = { count: 0, totalAmount: 0 };
      }
      const modeEntry = paymentModeBreakdown[modeKey]!;
      modeEntry.count += 1;
      modeEntry.totalAmount += p.amountPaid;
    }

    const collectionRate =
      totalNetExpected > 0 ? (totalPaid / totalNetExpected) * 100 : 0;

    return {
      totalGrossInvoiced: Number(totalGrossInvoiced.toFixed(2)),
      totalConcessions: Number(totalConcessions.toFixed(2)),
      totalNetExpected: Number(totalNetExpected.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      collectionRatePercentage: Number(collectionRate.toFixed(1)),
      totalStudentsEnrolledInFeePlans: studentFees.length,
      statusCounts,
      paymentModeBreakdown,
      classBreakdown: Object.values(classStatsMap).map((c) => ({
        ...c,
        expected: Number(c.expected.toFixed(2)),
        collected: Number(c.collected.toFixed(2)),
        due: Number(c.due.toFixed(2)),
        collectionRate: c.expected > 0 ? Number(((c.collected / c.expected) * 100).toFixed(1)) : 0,
      })),
    };
  }
}

export const feesService = new FeesService();
