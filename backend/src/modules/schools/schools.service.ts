import { prisma } from '../../database/db.js';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/index.js';
import { BoardType, Prisma } from '@prisma/client';

export interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateSchoolDto {
  name?: string;
  code?: string;
  board?: BoardType;
  affiliationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: Prisma.InputJsonValue | null;
  currency?: string;
  settings?: Prisma.InputJsonValue | null;
}

export interface CreateCampusDto {
  name: string;
  address?: Prisma.InputJsonValue | null;
}

export interface UpdateCampusDto {
  name?: string;
  address?: Prisma.InputJsonValue | null;
}

export class SchoolsService {
  /**
   * Retrieve school profile with campus and academic stats
   */
  async getSchoolProfile(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        campuses: {
          orderBy: { createdAt: 'asc' },
        },
        academicYears: {
          orderBy: { startDate: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            campuses: true,
            classes: true,
            sections: true,
            subjects: true,
            users: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundError(`School with ID ${schoolId} not found`, 'SCHOOL_NOT_FOUND');
    }

    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });

    return {
      ...school,
      currentAcademicYear: currentYear,
    };
  }

  /**
   * Update school configuration and metadata
   */
  async updateSchoolProfile(
    schoolId: string,
    data: UpdateSchoolDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!existing) {
      throw new NotFoundError(`School with ID ${schoolId} not found`, 'SCHOOL_NOT_FOUND');
    }

    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.school.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        throw new ConflictError(`School code "${data.code}" is already in use`, 'DUPLICATE_SCHOOL_CODE');
      }
    }

    const updatePayload: Prisma.SchoolUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.code && { code: data.code }),
      ...(data.board && { board: data.board }),
      ...(data.affiliationNumber !== undefined && { affiliationNumber: data.affiliationNumber }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.currency && { currency: data.currency }),
      ...(data.address !== undefined && { address: data.address === null ? Prisma.DbNull : data.address }),
      ...(data.settings !== undefined && { settings: data.settings === null ? Prisma.DbNull : data.settings }),
    };

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: updatePayload,
      include: {
        campuses: true,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'SCHOOL_PROFILE_UPDATE',
        entityType: 'School',
        entityId: schoolId,
        diff: { before: existing, after: updated },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return updated;
  }

  /**
   * List all campuses for a school
   */
  async getCampuses(schoolId: string) {
    return prisma.campus.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new physical campus/branch
   */
  async createCampus(
    schoolId: string,
    data: CreateCampusDto,
    actorId: string,
    context?: ClientContext,
  ) {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestError('Campus name is required', undefined, 'CAMPUS_NAME_REQUIRED');
    }

    const campus = await prisma.campus.create({
      data: {
        schoolId,
        name: data.name.trim(),
        address: data.address === null ? Prisma.DbNull : data.address,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'CAMPUS_CREATE',
        entityType: 'Campus',
        entityId: campus.id,
        diff: { name: campus.name },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return campus;
  }

  /**
   * Update an existing campus
   */
  async updateCampus(
    schoolId: string,
    campusId: string,
    data: UpdateCampusDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await prisma.campus.findFirst({
      where: { id: campusId, schoolId },
    });

    if (!existing) {
      throw new NotFoundError('Campus not found', 'CAMPUS_NOT_FOUND');
    }

    const updated = await prisma.campus.update({
      where: { id: campusId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.address !== undefined && {
          address: data.address === null ? Prisma.DbNull : data.address,
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'CAMPUS_UPDATE',
        entityType: 'Campus',
        entityId: campusId,
        diff: { before: existing, after: updated },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return updated;
  }

  /**
   * Delete a campus
   */
  async deleteCampus(
    schoolId: string,
    campusId: string,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await prisma.campus.findFirst({
      where: { id: campusId, schoolId },
    });

    if (!existing) {
      throw new NotFoundError('Campus not found', 'CAMPUS_NOT_FOUND');
    }

    await prisma.campus.delete({
      where: { id: campusId },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'CAMPUS_DELETE',
        entityType: 'Campus',
        entityId: campusId,
        diff: { deletedCampus: existing },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return { success: true, message: 'Campus deleted successfully' };
  }
}

export const schoolsService = new SchoolsService();
