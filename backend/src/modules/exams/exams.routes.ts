import { FastifyInstance } from 'fastify';
import { ExamsService } from './exams.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { ExamTermType, AssessmentType } from '@prisma/client';

export async function examsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // Exam Terms
  // ============================================================================

  fastify.get(
    '/terms',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { academicYearId } = request.query as { academicYearId?: string };

      const result = await ExamsService.getTerms(schoolId, academicYearId);
      return reply.send(result);
    },
  );

  fastify.get(
    '/terms/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { id } = request.params as { id: string };

      const term = await ExamsService.getTermById(schoolId, id);
      return reply.send(term);
    },
  );

  fastify.post(
    '/terms',
    {
      preHandler: [authenticate, requirePermission(['school:manage'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const body = request.body as {
        academicYearId: string;
        name: string;
        type?: ExamTermType;
        startDate: string;
        endDate: string;
        isCurrent?: boolean;
      };

      const term = await ExamsService.createTerm(schoolId, body);
      return reply.status(201).send(term);
    },
  );

  fastify.delete(
    '/terms/:id',
    {
      preHandler: [authenticate, requirePermission(['school:manage'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { id } = request.params as { id: string };

      const result = await ExamsService.deleteTerm(schoolId, id);
      return reply.send(result);
    },
  );

  // ============================================================================
  // Exams
  // ============================================================================

  fastify.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const query = request.query as { termId?: string; classId?: string };

      const result = await ExamsService.getExams(schoolId, query);
      return reply.send(result);
    },
  );

  fastify.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { id } = request.params as { id: string };

      const exam = await ExamsService.getExamById(schoolId, id);
      return reply.send(exam);
    },
  );

  fastify.post(
    '/',
    {
      preHandler: [authenticate, requirePermission(['school:manage', 'attendance:mark'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const body = request.body as {
        termId: string;
        classId: string;
        name: string;
        startDate: string;
        endDate: string;
      };

      const exam = await ExamsService.createExam(schoolId, body);
      return reply.status(201).send(exam);
    },
  );

  // ============================================================================
  // Assessments
  // ============================================================================

  fastify.get(
    '/:id/assessments',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { id } = request.params as { id: string };

      const result = await ExamsService.getAssessments(schoolId, id);
      return reply.send(result);
    },
  );

  fastify.post(
    '/:id/assessments',
    {
      preHandler: [authenticate, requirePermission(['school:manage', 'attendance:mark'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { id: examId } = request.params as { id: string };
      const body = request.body as {
        subjectId: string;
        type?: AssessmentType;
        maxMarks: number;
        passingMarks?: number;
        weightage?: number;
        date: string;
      };

      const assessment = await ExamsService.createAssessment(schoolId, {
        ...body,
        examId,
      });
      return reply.status(201).send(assessment);
    },
  );

  // ============================================================================
  // Marks Sheet & Bulk Recording
  // ============================================================================

  fastify.get(
    '/assessments/:id/marks-sheet',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { id } = request.params as { id: string };

      const result = await ExamsService.getMarksSheet(schoolId, id);
      return reply.send(result);
    },
  );

  fastify.post(
    '/assessments/:id/marks/batch',
    {
      preHandler: [authenticate, requirePermission(['attendance:mark', 'school:manage'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const userId = user.sub;
      const { id: assessmentId } = request.params as { id: string };
      const body = request.body as {
        records: Array<{
          enrollmentId: string;
          marksObtained?: number | null;
          isAbsent?: boolean;
          remarks?: string;
        }>;
      };

      const result = await ExamsService.recordBulkMarks(
        schoolId,
        assessmentId,
        body.records,
        userId,
        {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      );

      return reply.status(201).send(result);
    },
  );

  // ============================================================================
  // Report Card Generation (CBSE Standard)
  // ============================================================================

  fastify.get(
    '/report-card/:enrollmentId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;
      const { enrollmentId } = request.params as { enrollmentId: string };
      const { termId } = request.query as { termId?: string };

      const reportCard = await ExamsService.generateReportCard(schoolId, enrollmentId, termId);
      return reply.send(reportCard);
    },
  );

  // ============================================================================
  // Grading Scales Master
  // ============================================================================

  fastify.get(
    '/grading-scales',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const schoolId = user.schoolId!;

      const result = await ExamsService.getGradingScales(schoolId);
      return reply.send(result);
    },
  );
}
