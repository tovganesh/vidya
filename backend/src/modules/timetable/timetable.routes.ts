import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  timetableService,
  SavePeriodItemDto,
  SaveTimetableSlotDto,
  SaveTeacherAllocationDto,
} from './timetable.service.js';
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

export async function timetableRoutes(app: FastifyInstance): Promise<void> {
  // ==========================================================================
  // Periods
  // ==========================================================================

  app.get(
    '/timetable/periods',
    {
      preHandler: [authenticate, requirePermission(['academics:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const periods = await timetableService.getPeriods(schoolId);
      return reply.send({ success: true, data: periods });
    },
  );

  app.post(
    '/timetable/periods',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as { periods: SavePeriodItemDto[] };

      if (!body.periods || !Array.isArray(body.periods)) {
        throw new BadRequestError('Invalid payload: periods array required', undefined, 'INVALID_PAYLOAD');
      }

      const periods = await timetableService.savePeriods(schoolId, body.periods);
      return reply.send({ success: true, data: periods });
    },
  );

  // ==========================================================================
  // Timetable Slots
  // ==========================================================================

  app.get(
    '/timetable/section/:sectionId',
    {
      preHandler: [authenticate, requirePermission(['academics:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const params = request.params as { sectionId: string };
      const query = request.query as { academicYearId?: string };

      const timetable = await timetableService.getSectionTimetable(
        schoolId,
        params.sectionId,
        query.academicYearId,
      );
      return reply.send({ success: true, data: timetable });
    },
  );

  app.get(
    '/timetable/teacher/:teacherId',
    {
      preHandler: [authenticate, requirePermission(['academics:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const params = request.params as { teacherId: string };
      const query = request.query as { academicYearId?: string };

      const schedule = await timetableService.getTeacherTimetable(
        schoolId,
        params.teacherId,
        query.academicYearId,
      );
      return reply.send({ success: true, data: schedule });
    },
  );

  app.post(
    '/timetable/slots',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as SaveTimetableSlotDto;

      if (!body.sectionId || !body.dayOfWeek || !body.periodId) {
        throw new BadRequestError(
          'Invalid slot payload: sectionId, dayOfWeek, and periodId are required',
          undefined,
          'INVALID_PAYLOAD',
        );
      }

      const slot = await timetableService.saveSlot(schoolId, body);
      return reply.send({ success: true, data: slot });
    },
  );

  app.delete(
    '/timetable/slots/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const params = request.params as { id: string };

      const result = await timetableService.deleteSlot(schoolId, params.id);
      return reply.send({ success: true, data: result });
    },
  );

  // ==========================================================================
  // Teacher Allocations
  // ==========================================================================

  app.get(
    '/timetable/allocations',
    {
      preHandler: [authenticate, requirePermission(['academics:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as { academicYearId?: string; sectionId?: string };

      const allocations = await timetableService.getAllocations(
        schoolId,
        query.academicYearId,
        query.sectionId,
      );
      return reply.send({ success: true, data: allocations });
    },
  );

  app.post(
    '/timetable/allocations',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as SaveTeacherAllocationDto;

      if (!body.teacherId || !body.classId || !body.sectionId) {
        throw new BadRequestError(
          'teacherId, classId, and sectionId are required',
          undefined,
          'INVALID_PAYLOAD',
        );
      }

      const allocation = await timetableService.saveAllocation(schoolId, body);
      return reply.send({ success: true, data: allocation });
    },
  );

  app.delete(
    '/timetable/allocations/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const params = request.params as { id: string };

      const result = await timetableService.deleteAllocation(schoolId, params.id);
      return reply.send({ success: true, data: result });
    },
  );
}
