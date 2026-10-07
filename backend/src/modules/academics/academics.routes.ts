import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  academicsService,
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateClassDto,
  UpdateClassDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  AssignSubjectDto,
  SetupWizardDto,
} from './academics.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { BadRequestError } from '../../shared/errors/index.js';
import { prisma } from '../../database/db.js';
import { SubjectType } from '@prisma/client';

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

export async function academicRoutes(app: FastifyInstance): Promise<void> {
  // ==========================================================================
  // Academic Years
  // ==========================================================================

  app.get(
    '/academics/years',
    {
      preHandler: [authenticate, requirePermission(['academics:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const years = await academicsService.getAcademicYears(schoolId);
      return reply.send({ success: true, data: years });
    },
  );

  app.post(
    '/academics/years',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as CreateAcademicYearDto;
      const year = await academicsService.createAcademicYear(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(201).send({
        success: true,
        message: 'Academic year created successfully',
        data: year,
      });
    },
  );

  app.put(
    '/academics/years/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateAcademicYearDto;
      const updated = await academicsService.updateAcademicYear(schoolId, id, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({
        success: true,
        message: 'Academic year updated successfully',
        data: updated,
      });
    },
  );

  app.post(
    '/academics/years/:id/activate',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const activated = await academicsService.activateAcademicYear(schoolId, id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({
        success: true,
        message: `Academic year "${activated.name}" is now the active session`,
        data: activated,
      });
    },
  );

  app.delete(
    '/academics/years/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const result = await academicsService.deleteAcademicYear(schoolId, id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send(result);
    },
  );

  // ==========================================================================
  // Classes
  // ==========================================================================

  app.get(
    '/academics/classes',
    {
      preHandler: [authenticate, requirePermission(['academics:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const classes = await academicsService.getClasses(schoolId);
      return reply.send({ success: true, data: classes });
    },
  );

  app.post(
    '/academics/classes',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as CreateClassDto;
      const cls = await academicsService.createClass(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(201).send({
        success: true,
        message: 'Class created successfully',
        data: cls,
      });
    },
  );

  app.put(
    '/academics/classes/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateClassDto;
      const updated = await academicsService.updateClass(schoolId, id, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({
        success: true,
        message: 'Class updated successfully',
        data: updated,
      });
    },
  );

  app.delete(
    '/academics/classes/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const result = await academicsService.deleteClass(schoolId, id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send(result);
    },
  );

  // ==========================================================================
  // Sections
  // ==========================================================================

  app.get(
    '/academics/sections',
    {
      preHandler: [authenticate, requirePermission(['academics:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as { classId?: string };
      const sections = await academicsService.getSections(schoolId, query.classId);
      return reply.send({ success: true, data: sections });
    },
  );

  app.post(
    '/academics/sections',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as CreateSectionDto;
      const section = await academicsService.createSection(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(201).send({
        success: true,
        message: 'Section created successfully',
        data: section,
      });
    },
  );

  app.put(
    '/academics/sections/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateSectionDto;
      const updated = await academicsService.updateSection(schoolId, id, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({
        success: true,
        message: 'Section updated successfully',
        data: updated,
      });
    },
  );

  app.delete(
    '/academics/sections/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const result = await academicsService.deleteSection(schoolId, id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send(result);
    },
  );

  // ==========================================================================
  // Subjects
  // ==========================================================================

  app.get(
    '/academics/subjects',
    {
      preHandler: [authenticate, requirePermission(['academics:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const query = request.query as { type?: SubjectType };
      const subjects = await academicsService.getSubjects(schoolId, query.type);
      return reply.send({ success: true, data: subjects });
    },
  );

  app.post(
    '/academics/subjects',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as CreateSubjectDto;
      const subject = await academicsService.createSubject(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(201).send({
        success: true,
        message: 'Subject created successfully',
        data: subject,
      });
    },
  );

  app.put(
    '/academics/subjects/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateSubjectDto;
      const updated = await academicsService.updateSubject(schoolId, id, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({
        success: true,
        message: 'Subject updated successfully',
        data: updated,
      });
    },
  );

  app.delete(
    '/academics/subjects/:id',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { id } = request.params as { id: string };
      const result = await academicsService.deleteSubject(schoolId, id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send(result);
    },
  );

  // ==========================================================================
  // Class-Subject Assignments
  // ==========================================================================

  app.get(
    '/academics/classes/:classId/subjects',
    {
      preHandler: [authenticate, requirePermission(['academics:read', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { classId } = request.params as { classId: string };
      const mappings = await academicsService.getClassSubjects(schoolId, classId);
      return reply.send({ success: true, data: mappings });
    },
  );

  app.post(
    '/academics/classes/:classId/subjects',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { classId } = request.params as { classId: string };
      const body = request.body as { assignments: AssignSubjectDto[] };
      const results = await academicsService.assignSubjectsToClass(
        schoolId,
        classId,
        body.assignments || [],
        request.user.sub,
        {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      );
      return reply.send({
        success: true,
        message: 'Subjects assigned to class successfully',
        data: results,
      });
    },
  );

  app.delete(
    '/academics/classes/:classId/subjects/:subjectId',
    {
      preHandler: [authenticate, requirePermission(['academics:write', 'school:manage'])],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const { classId, subjectId } = request.params as { classId: string; subjectId: string };
      const result = await academicsService.unassignSubjectFromClass(
        schoolId,
        classId,
        subjectId,
        request.user.sub,
        {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      );
      return reply.send(result);
    },
  );

  // ==========================================================================
  // Setup Wizard Bootstrap
  // ==========================================================================

  app.post(
    '/academics/wizard/bootstrap',
    {
      preHandler: [authenticate, requirePermission('school:manage')],
    },
    async (request, reply) => {
      const schoolId = await resolveSchoolId(request);
      const body = request.body as SetupWizardDto;
      const result = await academicsService.bootstrapAcademicSetup(schoolId, body, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({
        success: true,
        message: 'Academic setup configured successfully',
        data: result,
      });
    },
  );
}
