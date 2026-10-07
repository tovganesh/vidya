import { FastifyInstance, FastifyRequest } from 'fastify';
import { studentsService } from './students.service.js';
import { teachersService, GetTeachersQuery } from './teachers.service.js';
import { guardiansService, GetGuardiansQuery } from './guardians.service.js';
import { enrollmentsService, GetEnrollmentsQuery } from './enrollments.service.js';
import { peopleService } from './people.service.js';
import {
  AdmitStudentDto,
  UpdateStudentDto,
  LinkGuardianDto,
  OnboardTeacherDto,
  UpdateTeacherDto,
  BatchPromoteDto,
  GetStudentsQuery,
} from './people.types.js';
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

export async function peopleRoutes(app: FastifyInstance): Promise<void> {
  // ==========================================================================
  // People Statistics
  // ==========================================================================

  app.get(
    '/people/stats',
    {
      preHandler: [authenticate, requirePermission(['student:read', 'school:manage', 'academics:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const stats = await peopleService.getPeopleStats(schoolId);
      return reply.send({ success: true, data: stats });
    },
  );

  // ==========================================================================
  // Students
  // ==========================================================================

  app.get(
    '/students',
    {
      preHandler: [authenticate, requirePermission(['student:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as GetStudentsQuery;
      const result = await studentsService.getStudents(schoolId, query);
      return reply.send({ success: true, data: result.students, pagination: result.pagination });
    },
  );

  app.get(
    '/students/:id',
    {
      preHandler: [authenticate, requirePermission(['student:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const student = await studentsService.getStudentById(schoolId, id);
      return reply.send({ success: true, data: student });
    },
  );

  app.post(
    '/students',
    {
      preHandler: [authenticate, requirePermission(['student:write'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as AdmitStudentDto;
      const student = await studentsService.admitStudent(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(201).send({ success: true, data: student });
    },
  );

  app.put(
    '/students/:id',
    {
      preHandler: [authenticate, requirePermission(['student:write'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateStudentDto;
      const student = await studentsService.updateStudent(schoolId, id, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({ success: true, data: student });
    },
  );

  app.post(
    '/students/:id/guardians',
    {
      preHandler: [authenticate, requirePermission(['student:write'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const body = request.body as LinkGuardianDto;
      const link = await studentsService.linkGuardian(schoolId, id, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(201).send({ success: true, data: link });
    },
  );

  app.delete(
    '/students/:id/guardians/:guardianId',
    {
      preHandler: [authenticate, requirePermission(['student:write'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id, guardianId } = request.params as { id: string; guardianId: string };
      const result = await studentsService.unlinkGuardian(schoolId, id, guardianId, request.user.sub);
      return reply.send({ success: true, data: result });
    },
  );

  // ==========================================================================
  // Guardians
  // ==========================================================================

  app.get(
    '/guardians',
    {
      preHandler: [authenticate, requirePermission(['student:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as GetGuardiansQuery;
      const result = await guardiansService.getGuardians(schoolId, query);
      return reply.send({ success: true, data: result.guardians, pagination: result.pagination });
    },
  );

  app.get(
    '/guardians/:id',
    {
      preHandler: [authenticate, requirePermission(['student:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const guardian = await guardiansService.getGuardianById(schoolId, id);
      return reply.send({ success: true, data: guardian });
    },
  );

  // ==========================================================================
  // Teachers
  // ==========================================================================

  app.get(
    '/teachers',
    {
      preHandler: [authenticate, requirePermission(['student:read', 'school:manage', 'user:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as GetTeachersQuery;
      const result = await teachersService.getTeachers(schoolId, query);
      return reply.send({ success: true, data: result.teachers, pagination: result.pagination });
    },
  );

  app.get(
    '/teachers/:id',
    {
      preHandler: [authenticate, requirePermission(['student:read', 'school:manage', 'user:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const teacher = await teachersService.getTeacherById(schoolId, id);
      return reply.send({ success: true, data: teacher });
    },
  );

  app.post(
    '/teachers',
    {
      preHandler: [authenticate, requirePermission(['school:manage', 'user:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as OnboardTeacherDto;
      const teacher = await teachersService.onboardTeacher(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(201).send({ success: true, data: teacher });
    },
  );

  app.put(
    '/teachers/:id',
    {
      preHandler: [authenticate, requirePermission(['school:manage', 'user:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateTeacherDto;
      const teacher = await teachersService.updateTeacher(schoolId, id, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({ success: true, data: teacher });
    },
  );

  // ==========================================================================
  // Enrollments & Batch Promotion
  // ==========================================================================

  app.get(
    '/enrollments',
    {
      preHandler: [authenticate, requirePermission(['student:read', 'academics:read'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as GetEnrollmentsQuery;
      const result = await enrollmentsService.getEnrollments(schoolId, query);
      return reply.send({ success: true, data: result.enrollments, pagination: result.pagination });
    },
  );

  app.post(
    '/enrollments/batch-promote',
    {
      preHandler: [authenticate, requirePermission(['student:write', 'academics:write'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as BatchPromoteDto;
      const result = await enrollmentsService.batchPromote(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({ success: true, data: result });
    },
  );
}
