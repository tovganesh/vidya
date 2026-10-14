import { FastifyInstance, FastifyRequest } from 'fastify';
import { auditService, AuditQueryFilters } from './audit.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { BadRequestError } from '../../shared/errors/index.js';
import { prisma } from '../../database/db.js';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/audit',
    {
      preHandler: [authenticate, requirePermission(['audit:read', 'school:manage'])],
    },
    async (request: FastifyRequest, reply) => {
      let schoolId = request.user.schoolId;
      if (!schoolId && (request.user.role === 'SUPER_ADMIN' || request.user.role === 'SCHOOL_ADMIN')) {
        const query = request.query as { schoolId?: string };
        if (query.schoolId) {
          schoolId = query.schoolId;
        } else {
          const firstSchool = await prisma.school.findFirst();
          if (firstSchool) schoolId = firstSchool.id;
        }
      }

      if (!schoolId) {
        throw new BadRequestError('Tenant context required: schoolId must be specified');
      }

      const filters = request.query as AuditQueryFilters;
      const result = await auditService.getAuditLogs(schoolId, filters);

      return reply.send({
        success: true,
        data: result,
      });
    },
  );

  app.get(
    '/audit/metadata',
    {
      preHandler: [authenticate, requirePermission(['audit:read', 'school:manage'])],
    },
    async (request: FastifyRequest, reply) => {
      let schoolId = request.user.schoolId;
      if (!schoolId) {
        const firstSchool = await prisma.school.findFirst();
        if (firstSchool) schoolId = firstSchool.id;
      }

      if (!schoolId) {
        throw new BadRequestError('Tenant context required: schoolId must be specified');
      }

      const metadata = await auditService.getAuditMetadata(schoolId);
      return reply.send({
        success: true,
        data: metadata,
      });
    },
  );
}
