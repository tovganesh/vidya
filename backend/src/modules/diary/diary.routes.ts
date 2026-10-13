import { FastifyInstance, FastifyRequest } from 'fastify';
import { diaryService, SaveDiaryEntryDto, DiaryFilterParams } from './diary.service.js';
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

export async function diaryRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/diary
   * Fetch daily diary (classwork & homework) entries
   */
  app.get(
    '/diary',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as DiaryFilterParams;

      const entries = await diaryService.getEntries(schoolId, query);
      return reply.send({ success: true, data: entries });
    },
  );

  /**
   * POST /api/v1/diary
   * Create or update daily diary entry (Teachers & Leadership)
   */
  app.post(
    '/diary',
    {
      preHandler: [
        authenticate,
        requirePermission(['academics:write', 'attendance:mark', 'school:manage', 'exam:marks_entry']),
      ],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as SaveDiaryEntryDto;

      const entry = await diaryService.saveEntry(schoolId, body, request.user.sub);
      return reply.send({ success: true, data: entry });
    },
  );

  /**
   * DELETE /api/v1/diary/:id
   * Delete a diary entry
   */
  app.delete(
    '/diary/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };

      const result = await diaryService.deleteEntry(schoolId, id);
      return reply.send({ success: true, data: result });
    },
  );
}
