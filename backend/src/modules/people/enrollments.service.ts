import { prisma } from '../../database/db.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors/index.js';
import {
  BatchPromoteDto,
  ClientContext,
  EnrollmentStatus,
  StudentStatus,
} from './people.types.js';

export interface GetEnrollmentsQuery {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: EnrollmentStatus;
  page?: number;
  limit?: number;
}

export class EnrollmentsService {
  /**
   * Get enrollments filtered by academic year, class, and section.
   */
  async getEnrollments(schoolId: string, query: GetEnrollmentsQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.academicYearId) {
      where.academicYearId = query.academicYearId;
    } else {
      // Default to active academic year if none provided
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      if (activeYear) {
        where.academicYearId = activeYear.id;
      }
    }

    if (query.classId) where.classId = query.classId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.status) where.status = query.status;

    const [total, enrollments] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { class: { orderIndex: 'asc' } },
          { section: { name: 'asc' } },
          { rollNumber: 'asc' },
          { student: { lastName: 'asc' } },
        ],
        include: {
          student: {
            select: {
              id: true,
              admissionNumber: true,
              firstName: true,
              lastName: true,
              gender: true,
              status: true,
              photoUrl: true,
            },
          },
          academicYear: { select: { id: true, name: true, isCurrent: true } },
          class: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true, roomNumber: true } },
        },
      }),
    ]);

    const formatted = enrollments.map((e) => ({
      id: e.id,
      studentId: e.student.id,
      admissionNumber: e.student.admissionNumber,
      fullName: `${e.student.firstName} ${e.student.lastName}`,
      gender: e.student.gender,
      studentStatus: e.student.status,
      photoUrl: e.student.photoUrl,
      academicYearId: e.academicYear.id,
      academicYearName: e.academicYear.name,
      classId: e.class.id,
      className: e.class.name,
      sectionId: e.section.id,
      sectionName: e.section.name,
      rollNumber: e.rollNumber,
      status: e.status,
      enrollmentDate: e.enrollmentDate,
      remarks: e.remarks,
    }));

    return {
      enrollments: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Batch promote or progress students across academic years.
   * Ensures historical records remain immutable while creating new session placements.
   */
  async batchPromote(
    schoolId: string,
    dto: BatchPromoteDto,
    actorId?: string,
    clientContext?: ClientContext,
  ) {
    if (!dto.sourceAcademicYearId || !dto.targetAcademicYearId) {
      throw new BadRequestError('Both source and target academic years are required', undefined, 'YEARS_REQUIRED');
    }
    if (dto.sourceAcademicYearId === dto.targetAcademicYearId) {
      throw new BadRequestError('Source and target academic years cannot be identical', undefined, 'SAME_YEAR');
    }
    if (!dto.targetClassId || !dto.targetSectionId) {
      throw new BadRequestError('Target class and section are required', undefined, 'TARGET_CLASS_SECTION_REQUIRED');
    }
    if (!dto.promotions || dto.promotions.length === 0) {
      throw new BadRequestError('At least one student promotion record must be provided', undefined, 'EMPTY_PROMOTIONS');
    }

    // Verify academic years exist in school
    const [sourceYear, targetYear] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: dto.sourceAcademicYearId, schoolId } }),
      prisma.academicYear.findFirst({ where: { id: dto.targetAcademicYearId, schoolId } }),
    ]);

    if (!sourceYear) throw new NotFoundError('Source academic year not found', 'SOURCE_YEAR_NOT_FOUND');
    if (!targetYear) throw new NotFoundError('Target academic year not found', 'TARGET_YEAR_NOT_FOUND');

    // Verify target class & section exist in school
    const [targetClass, targetSection] = await Promise.all([
      prisma.class.findFirst({ where: { id: dto.targetClassId, schoolId } }),
      prisma.section.findFirst({ where: { id: dto.targetSectionId, schoolId, classId: dto.targetClassId } }),
    ]);

    if (!targetClass) throw new NotFoundError('Target class not found', 'TARGET_CLASS_NOT_FOUND');
    if (!targetSection) throw new NotFoundError('Target section not found for the specified target class', 'TARGET_SECTION_NOT_FOUND');

    return await prisma.$transaction(async (tx) => {
      let promotedCount = 0;
      let retainedCount = 0;
      let transferredCount = 0;
      let droppedCount = 0;

      for (const item of dto.promotions) {
        // 1. Locate student source enrollment
        const sourceEnrollment = await tx.enrollment.findUnique({
          where: {
            studentId_academicYearId: {
              studentId: item.studentId,
              academicYearId: dto.sourceAcademicYearId,
            },
          },
        });

        if (sourceEnrollment) {
          // Update historical status on source enrollment
          await tx.enrollment.update({
            where: { id: sourceEnrollment.id },
            data: {
              status: item.status,
              remarks: item.remarks || (item.status === EnrollmentStatus.PROMOTED ? 'Promoted' : 'Retained'),
            },
          });
        }

        // 2. Handle placement into target academic year
        if (item.status === EnrollmentStatus.PROMOTED || item.status === EnrollmentStatus.RETAINED) {
          // Upsert target enrollment (a student can only have one enrollment per year)
          await tx.enrollment.upsert({
            where: {
              studentId_academicYearId: {
                studentId: item.studentId,
                academicYearId: dto.targetAcademicYearId,
              },
            },
            update: {
              classId: dto.targetClassId,
              sectionId: dto.targetSectionId,
              rollNumber: item.targetRollNumber ?? undefined,
              status: EnrollmentStatus.ACTIVE,
              remarks: item.remarks || `Enrolled via batch ${item.status.toLowerCase()}`,
            },
            create: {
              schoolId,
              studentId: item.studentId,
              academicYearId: dto.targetAcademicYearId,
              classId: dto.targetClassId,
              sectionId: dto.targetSectionId,
              rollNumber: item.targetRollNumber ?? null,
              status: EnrollmentStatus.ACTIVE,
              remarks: item.remarks || `Enrolled via batch ${item.status.toLowerCase()}`,
            },
          });

          // Ensure student status is ENROLLED
          await tx.student.update({
            where: { id: item.studentId },
            data: { status: StudentStatus.ENROLLED },
          });

          if (item.status === EnrollmentStatus.PROMOTED) promotedCount++;
          if (item.status === EnrollmentStatus.RETAINED) retainedCount++;
        } else if (item.status === EnrollmentStatus.TRANSFERRED_OUT) {
          // Student transferred
          await tx.student.update({
            where: { id: item.studentId },
            data: { status: StudentStatus.TRANSFERRED },
          });
          transferredCount++;
        } else if (item.status === EnrollmentStatus.DROPPED) {
          // Student withdrawn/dropped
          await tx.student.update({
            where: { id: item.studentId },
            data: { status: StudentStatus.WITHDRAWN },
          });
          droppedCount++;
        }
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          actorId,
          action: 'BATCH_PROMOTION_EXECUTED',
          entityType: 'Enrollment',
          entityId: dto.targetAcademicYearId,
          diff: {
            sourceAcademicYearId: dto.sourceAcademicYearId,
            targetAcademicYearId: dto.targetAcademicYearId,
            targetClass: targetClass.name,
            targetSection: targetSection.name,
            totalStudents: dto.promotions.length,
            promotedCount,
            retainedCount,
            transferredCount,
            droppedCount,
          },
          ipAddress: clientContext?.ipAddress,
          userAgent: clientContext?.userAgent,
        },
      });

      return {
        success: true,
        summary: {
          totalProcessed: dto.promotions.length,
          promotedCount,
          retainedCount,
          transferredCount,
          droppedCount,
          targetClass: targetClass.name,
          targetSection: targetSection.name,
          targetAcademicYear: targetYear.name,
        },
      };
    });
  }
}

export const enrollmentsService = new EnrollmentsService();
