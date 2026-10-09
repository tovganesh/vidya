import { prisma } from '../../database/db.js';
import bcrypt from 'bcryptjs';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors/index.js';
import {
  OnboardTeacherDto,
  UpdateTeacherDto,
  ClientContext,
  TeacherStatus,
  UserRole,
} from './people.types.js';

export interface GetTeachersQuery {
  search?: string;
  status?: TeacherStatus;
  page?: number;
  limit?: number;
}

export class TeachersService {
  /**
   * Get paginated teachers.
   */
  async getTeachers(schoolId: string, query: GetTeachersQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { employeeCode: { contains: term, mode: 'insensitive' } },
        { specialization: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, teachers] = await Promise.all([
      prisma.teacher.count({ where }),
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              status: true,
              lastLoginAt: true,
            },
          },
        },
      }),
    ]);

    const formatted = teachers.map((t) => ({
      id: t.id,
      schoolId: t.schoolId,
      employeeCode: t.employeeCode,
      firstName: t.firstName,
      lastName: t.lastName,
      fullName: `${t.firstName} ${t.lastName}`,
      email: t.user.email,
      phone: t.phone || t.user.phone,
      qualification: t.qualification,
      specialization: t.specialization,
      joiningDate: t.joiningDate,
      status: t.status,
      userStatus: t.user.status,
      lastLoginAt: t.user.lastLoginAt,
      createdAt: t.createdAt,
    }));

    return {
      teachers: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get teacher by ID.
   */
  async getTeacherById(schoolId: string, teacherId: string) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundError(`Teacher with ID '${teacherId}' not found`, 'TEACHER_NOT_FOUND');
    }

    return {
      ...teacher,
      fullName: `${teacher.firstName} ${teacher.lastName}`,
      email: teacher.user.email,
    };
  }

  /**
   * Onboard a new educator with account credentials and teacher profile.
   */
  async onboardTeacher(
    schoolId: string,
    dto: OnboardTeacherDto,
    actorId?: string,
    clientContext?: ClientContext,
  ) {
    if (!dto.employeeCode?.trim()) {
      throw new BadRequestError('Employee code is required', undefined, 'EMP_CODE_REQUIRED');
    }
    if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
      throw new BadRequestError('First name and last name are required', undefined, 'TEACHER_NAME_REQUIRED');
    }
    if (!dto.email?.trim()) {
      throw new BadRequestError('Email address is required', undefined, 'EMAIL_REQUIRED');
    }

    const employeeCode = dto.employeeCode.trim();
    const email = dto.email.trim().toLowerCase();

    // Check employee code uniqueness in school
    const existingCode = await prisma.teacher.findUnique({
      where: { schoolId_employeeCode: { schoolId, employeeCode } },
    });
    if (existingCode) {
      throw new ConflictError(
        `Teacher with employee code '${employeeCode}' already exists in this school`,
        'EMP_CODE_CONFLICT',
      );
    }

    // Check user email uniqueness globally
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError(`User with email '${email}' already exists`, 'USER_EMAIL_CONFLICT');
    }

    const rawPassword = dto.password || 'Vidya@2026';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    return await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          schoolId,
          email,
          phone: dto.phone?.trim() || null,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          primaryRole: UserRole.TEACHER,
          status: 'ACTIVE',
        },
      });

      // 2. Assign TEACHER system role
      const teacherRole = await tx.role.findUnique({ where: { name: 'TEACHER' } });
      if (teacherRole) {
        await tx.userRoleAssignment.create({
          data: {
            userId: user.id,
            roleId: teacherRole.id,
          },
        });
      }

      // 3. Create Teacher profile
      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          userId: user.id,
          employeeCode,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          qualification: dto.qualification?.trim() || null,
          specialization: dto.specialization?.trim() || null,
          phone: dto.phone?.trim() || null,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
          status: TeacherStatus.ACTIVE,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              status: true,
            },
          },
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          actorId,
          action: 'TEACHER_ONBOARDED',
          entityType: 'Teacher',
          entityId: teacher.id,
          diff: {
            employeeCode: teacher.employeeCode,
            fullName: `${teacher.firstName} ${teacher.lastName}`,
            email: user.email,
          },
          ipAddress: clientContext?.ipAddress,
          userAgent: clientContext?.userAgent,
        },
      });

      return {
        ...teacher,
        fullName: `${teacher.firstName} ${teacher.lastName}`,
      };
    });
  }

  /**
   * Update teacher details.
   */
  async updateTeacher(
    schoolId: string,
    teacherId: string,
    dto: UpdateTeacherDto,
    actorId?: string,
    clientContext?: ClientContext,
  ) {
    const existing = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });

    if (!existing) {
      throw new NotFoundError(`Teacher with ID '${teacherId}' not found`, 'TEACHER_NOT_FOUND');
    }

    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.qualification !== undefined) data.qualification = dto.qualification?.trim() || null;
    if (dto.specialization !== undefined) data.specialization = dto.specialization?.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data,
      include: {
        user: { select: { id: true, email: true, phone: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'TEACHER_UPDATED',
        entityType: 'Teacher',
        entityId: teacherId,
        diff: { previous: existing as any, updated: dto as any },
        ipAddress: clientContext?.ipAddress,
        userAgent: clientContext?.userAgent,
      },
    });

    return {
      ...updated,
      fullName: `${updated.firstName} ${updated.lastName}`,
    };
  }
}

export const teachersService = new TeachersService();
