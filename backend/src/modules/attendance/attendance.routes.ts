import { FastifyInstance, FastifyRequest } from 'fastify';
import { attendanceService, RecordBulkAttendanceDto } from './attendance.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { BadRequestError } from '../../shared/errors/index.js';
import { prisma } from '../../database/db.js';

async function resolveSchoolId(request: FastifyRequest): Promise<string> {
  if (request.user.schoolId) {
    return request.user.schoolId;
  }
  const query = request.query as { schoolId?: string };
  if (query.schoolId) {
    return query.schoolId;
  }
  if (request.user.role === 'SUPER_ADMIN') {
    const firstSchool = await prisma.school.findFirst();
    if (firstSchool) return firstSchool.id;
  }
  throw new BadRequestError('Tenant context required: schoolId must be specified', undefined, 'SCHOOL_ID_REQUIRED');
}

export async function attendanceRoutes(app: FastifyInstance): Promise<void> {
  // 1. Get Daily Attendance Sheet for Roll Call
  app.get(
    '/attendance/sheet',
    {
      preHandler: [authenticate, requirePermission(['attendance:read', 'attendance:mark'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as { sectionId?: string; date?: string };
      const sectionId = query.sectionId;

      if (!sectionId) {
        throw new BadRequestError('Query parameter sectionId is required', undefined, 'MISSING_SECTION_ID');
      }

      const dateStr = query.date || new Date().toISOString().split('T')[0]!;
      const sheet = await attendanceService.getAttendanceSheet(schoolId, sectionId, dateStr);
      return reply.send({ success: true, data: sheet });
    },
  );

  // 2. Submit Bulk Attendance Roll Call
  app.post(
    '/attendance/batch',
    {
      preHandler: [authenticate, requirePermission(['attendance:mark'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as RecordBulkAttendanceDto;

      if (!body.sectionId || !body.date || !body.records) {
        throw new BadRequestError('Invalid payload: sectionId, date, and records required', undefined, 'INVALID_PAYLOAD');
      }

      const result = await attendanceService.recordBulkAttendance(
        schoolId,
        body,
        request.user.sub,
        {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );

  // 3. Monthly Attendance Register Report
  app.get(
    '/attendance/reports/monthly',
    {
      preHandler: [authenticate, requirePermission(['attendance:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as { sectionId?: string; year?: string; month?: string };
      const sectionId = query.sectionId;

      if (!sectionId) {
        throw new BadRequestError('Query parameter sectionId is required', undefined, 'MISSING_SECTION_ID');
      }

      const now = new Date();
      const year = query.year ? parseInt(query.year, 10) : now.getFullYear();
      const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1;

      const report = await attendanceService.getMonthlyRegister(schoolId, {
        sectionId,
        year,
        month,
      });

      return reply.send({ success: true, data: report });
    },
  );

  // 4. Student Individual Attendance Summary
  app.get(
    '/attendance/student/:enrollmentId',
    {
      preHandler: [authenticate, requirePermission(['attendance:read', 'student:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const params = request.params as { enrollmentId: string };

      const summary = await attendanceService.getStudentAttendanceSummary(schoolId, params.enrollmentId);
      return reply.send({ success: true, data: summary });
    },
  );
}
