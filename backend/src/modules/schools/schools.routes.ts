import { FastifyInstance, FastifyRequest } from 'fastify';
import { schoolsService, UpdateSchoolDto, CreateCampusDto, UpdateCampusDto } from './schools.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { BadRequestError } from '../../shared/errors/index.js';
import { prisma } from '../../database/db.js';

function resolveSchoolId(request: FastifyRequest): string {
  if (request.user.schoolId) {
    return request.user.schoolId;
  }
  const query = request.query as { schoolId?: string };
  if (query.schoolId) {
    return query.schoolId;
  }
  throw new BadRequestError('Tenant context required: schoolId must be specified', undefined, 'SCHOOL_ID_REQUIRED');
}

export async function schoolRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /schools/profile
   * Retrieve active school profile
   */
  app.get(
    '/schools/profile',
    {
      preHandler: [authenticate, requirePermission(['school:manage', 'academics:read'])],
    },
    async (request, reply) => {
      let schoolId = request.user.schoolId;
      if (!schoolId && request.user.role === 'SUPER_ADMIN') {
        const query = request.query as { schoolId?: string };
        if (query.schoolId) {
          schoolId = query.schoolId;
        } else {
          const firstSchool = await prisma.school.findFirst();
          if (!firstSchool) {
            throw new BadRequestError('No schools found in system');
          }
          schoolId = firstSchool.id;
        }
      }

      if (!schoolId) {
        throw new BadRequestError('School ID is required');
      }

      const school = await schoolsService.getSchoolProfile(schoolId);
      return reply.send({ success: true, data: school });
    },
  );

  /**
   * PUT /schools/profile
   * Update active school profile
   */
  app.put(
    '/schools/profile',
    {
      preHandler: [authenticate, requirePermission('school:manage')],
    },
    async (request, reply) => {
      let schoolId = request.user.schoolId;
      if (!schoolId && request.user.role === 'SUPER_ADMIN') {
        const query = request.query as { schoolId?: string };
        if (query.schoolId) {
          schoolId = query.schoolId;
        } else {
          const firstSchool = await prisma.school.findFirst();
          if (!firstSchool) {
            throw new BadRequestError('No schools found in system');
          }
          schoolId = firstSchool.id;
        }
      }

      if (!schoolId) {
        throw new BadRequestError('School ID is required');
      }

      const body = request.body as UpdateSchoolDto;
      const updated = await schoolsService.updateSchoolProfile(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({
        success: true,
        message: 'School profile updated successfully',
        data: updated,
      });
    },
  );

  /**
   * GET /schools/campuses
   * List all campuses
   */
  app.get(
    '/schools/campuses',
    {
      preHandler: [authenticate, requirePermission(['school:manage', 'academics:read'])],
    },
    async (request, reply) => {
      const schoolId = resolveSchoolId(request);
      const campuses = await schoolsService.getCampuses(schoolId);
      return reply.send({ success: true, data: campuses });
    },
  );

  /**
   * POST /schools/campuses
   * Create new campus
   */
  app.post(
    '/schools/campuses',
    {
      preHandler: [authenticate, requirePermission('school:manage')],
    },
    async (request, reply) => {
      const schoolId = resolveSchoolId(request);
      const body = request.body as CreateCampusDto;
      const campus = await schoolsService.createCampus(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        success: true,
        message: 'Campus created successfully',
        data: campus,
      });
    },
  );

  /**
   * PUT /schools/campuses/:id
   * Update campus
   */
  app.put(
    '/schools/campuses/:id',
    {
      preHandler: [authenticate, requirePermission('school:manage')],
    },
    async (request, reply) => {
      const schoolId = resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateCampusDto;

      const updated = await schoolsService.updateCampus(schoolId, id, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({
        success: true,
        message: 'Campus updated successfully',
        data: updated,
      });
    },
  );

  /**
   * DELETE /schools/campuses/:id
   * Delete campus
   */
  app.delete(
    '/schools/campuses/:id',
    {
      preHandler: [authenticate, requirePermission('school:manage')],
    },
    async (request, reply) => {
      const schoolId = resolveSchoolId(request);
      const { id } = request.params as { id: string };

      const result = await schoolsService.deleteCampus(schoolId, id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send(result);
    },
  );
}
