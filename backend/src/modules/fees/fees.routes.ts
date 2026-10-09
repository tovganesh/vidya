import { FastifyInstance } from 'fastify';
import { feesService } from './fees.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { FeeFrequency, StudentFeeStatus, PaymentMode } from '@prisma/client';

export async function feesRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // Statistics & Dashboard Overview
  // ============================================================================

  fastify.get(
    '/stats',
    {
      preHandler: [authenticate, requirePermission(['fee:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const { academicYearId } = request.query as { academicYearId?: string };

      const stats = await feesService.getFeeStatistics(schoolId, academicYearId);
      return reply.send({ success: true, data: stats });
    }
  );

  // ============================================================================
  // Fee Structures & Components
  // ============================================================================

  fastify.get(
    '/structures',
    {
      preHandler: [authenticate, requirePermission(['fee:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const filter = request.query as { academicYearId?: string; classId?: string };

      const structures = await feesService.listFeeStructures(schoolId, filter);
      return reply.send({ success: true, data: structures });
    }
  );

  fastify.get(
    '/structures/:id',
    {
      preHandler: [authenticate, requirePermission(['fee:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const { id } = request.params as { id: string };

      const structure = await feesService.getFeeStructure(schoolId, id);
      return reply.send({ success: true, data: structure });
    }
  );

  fastify.post(
    '/structures',
    {
      preHandler: [authenticate, requirePermission(['fee:collect', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const body = request.body as {
        academicYearId: string;
        classId: string;
        name: string;
        description?: string;
        components: Array<{
          title: string;
          amount: number;
          frequency?: FeeFrequency;
          dueDate?: string;
        }>;
      };

      const structure = await feesService.createFeeStructure(schoolId, body);
      return reply.status(201).send({ success: true, data: structure });
    }
  );

  // ============================================================================
  // Fee Allocations (Student & Class)
  // ============================================================================

  fastify.post(
    '/allocate/student',
    {
      preHandler: [authenticate, requirePermission(['fee:collect', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const body = request.body as {
        enrollmentId: string;
        feeStructureId: string;
        concessionAmount?: number;
        concessionReason?: string;
        dueDate?: string;
      };

      const allocation = await feesService.allocateFeeStructureToStudent(schoolId, body);
      return reply.status(201).send({ success: true, data: allocation });
    }
  );

  fastify.post(
    '/allocate/class',
    {
      preHandler: [authenticate, requirePermission(['fee:collect', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const body = request.body as {
        academicYearId: string;
        classId: string;
        feeStructureId: string;
        sectionId?: string;
        defaultConcessionAmount?: number;
        defaultConcessionReason?: string;
      };

      const result = await feesService.batchAllocateFeeStructureToClass(schoolId, body);
      return reply.status(200).send({ success: true, data: result });
    }
  );

  // ============================================================================
  // Student Fee Ledgers
  // ============================================================================

  fastify.get(
    '/students',
    {
      preHandler: [authenticate, requirePermission(['fee:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const query = request.query as {
        academicYearId?: string;
        classId?: string;
        sectionId?: string;
        status?: StudentFeeStatus;
        search?: string;
        page?: string;
        limit?: string;
      };

      const parsedQuery = {
        ...query,
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
      };

      const result = await feesService.listStudentFees(schoolId, parsedQuery);
      return reply.send({ success: true, ...result });
    }
  );

  fastify.get(
    '/students/:enrollmentId',
    {
      preHandler: [authenticate, requirePermission(['fee:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const { enrollmentId } = request.params as { enrollmentId: string };

      const details = await feesService.getStudentFeeDetails(schoolId, enrollmentId);
      return reply.send({ success: true, data: details });
    }
  );

  // ============================================================================
  // Payment Collection & Receipts
  // ============================================================================

  fastify.post(
    '/payments/collect',
    {
      preHandler: [authenticate, requirePermission(['fee:collect', 'school:manage'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const body = request.body as {
        studentFeeId: string;
        amountPaid: number;
        paymentMode: PaymentMode;
        transactionReference?: string;
        notes?: string;
        paidOn?: string;
      };

      const result = await feesService.collectPayment(schoolId, user.sub, body);
      return reply.status(201).send({ success: true, data: result });
    }
  );

  fastify.get(
    '/receipts/:receiptNumber',
    {
      preHandler: [
        authenticate,
        requirePermission(['fee:read', 'fee:collect', 'school:manage']),
      ],
    },
    async (request, reply) => {
      const schoolId = request.user!.schoolId!;
      const { receiptNumber } = request.params as { receiptNumber: string };

      const receipt = await feesService.getReceipt(schoolId, receiptNumber);
      return reply.send({ success: true, data: receipt });
    }
  );
}
