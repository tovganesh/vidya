import { prisma } from '../../database/db.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors/index.js';
import { Prisma } from '@prisma/client';
import {
  AdmitStudentDto,
  UpdateStudentDto,
  GetStudentsQuery,
  LinkGuardianDto,
  ClientContext,
  StudentStatus,
  EnrollmentStatus,
} from './people.types.js';

export class StudentsService {
  /**
   * Get paginated students with tenant scoping, flexible filters, and enrollment context.
   */
  async getStudents(schoolId: string, query: GetStudentsQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { admissionNumber: { contains: term, mode: 'insensitive' } },
        { apaarId: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Filter by academic year, class, or section if specified
    if (query.academicYearId || query.classId || query.sectionId) {
      const enrollmentFilter: any = {};
      if (query.academicYearId) enrollmentFilter.academicYearId = query.academicYearId;
      if (query.classId) enrollmentFilter.classId = query.classId;
      if (query.sectionId) enrollmentFilter.sectionId = query.sectionId;

      where.enrollments = {
        some: enrollmentFilter,
      };
    }

    // Determine target academic year for active enrollment display
    let targetYearId = query.academicYearId;
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      targetYearId = activeYear?.id;
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          enrollments: {
            where: targetYearId ? { academicYearId: targetYearId } : undefined,
            take: 1,
            include: {
              academicYear: { select: { id: true, name: true, isCurrent: true } },
              class: { select: { id: true, name: true, code: true, stage: true } },
              section: { select: { id: true, name: true, roomNumber: true } },
            },
          },
          guardians: {
            where: { isPrimaryContact: true },
            take: 1,
            include: {
              guardian: {
                select: {
                  id: true,
                  name: true,
                  relationship: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedStudents = students.map((s) => {
      const currentEnrollment = s.enrollments[0] || null;
      const primaryGuardian = s.guardians[0]?.guardian || null;
      return {
        id: s.id,
        schoolId: s.schoolId,
        admissionNumber: s.admissionNumber,
        admissionDate: s.admissionDate,
        firstName: s.firstName,
        middleName: s.middleName,
        lastName: s.lastName,
        fullName: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        bloodGroup: s.bloodGroup,
        apaarId: s.apaarId,
        aadhaarLastFour: s.aadhaarLastFour,
        nationality: s.nationality,
        category: s.category,
        photoUrl: s.photoUrl,
        status: s.status,
        createdAt: s.createdAt,
        currentEnrollment: currentEnrollment
          ? {
              id: currentEnrollment.id,
              academicYear: currentEnrollment.academicYear.name,
              academicYearId: currentEnrollment.academicYear.id,
              className: currentEnrollment.class.name,
              classId: currentEnrollment.class.id,
              sectionName: currentEnrollment.section.name,
              sectionId: currentEnrollment.section.id,
              rollNumber: currentEnrollment.rollNumber,
              status: currentEnrollment.status,
            }
          : null,
        primaryGuardian: primaryGuardian
          ? {
              id: primaryGuardian.id,
              name: primaryGuardian.name,
              relationship: primaryGuardian.relationship,
              phone: primaryGuardian.phone,
              email: primaryGuardian.email,
            }
          : null,
      };
    });

    return {
      students: formattedStudents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get full 360 Student Profile with demographics, guardians, and multi-year trajectory.
   */
  async getStudentById(schoolId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId, deletedAt: null },
      include: {
        user: { select: { id: true, email: true, status: true, lastLoginAt: true } },
        guardians: {
          include: {
            guardian: true,
          },
          orderBy: { isPrimaryContact: 'desc' },
        },
        enrollments: {
          include: {
            academicYear: true,
            class: true,
            section: true,
          },
          orderBy: {
            academicYear: { startDate: 'desc' },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found`, 'STUDENT_NOT_FOUND');
    }

    const currentEnrollment =
      student.enrollments.find((e) => e.academicYear.isCurrent) ||
      student.enrollments[0] ||
      null;

    return {
      ...student,
      fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
      currentEnrollment,
      guardians: student.guardians.map((sg) => ({
        id: sg.guardian.id,
        relationId: sg.id,
        name: sg.guardian.name,
        relationship: sg.guardian.relationship,
        phone: sg.guardian.phone,
        email: sg.guardian.email,
        occupation: sg.guardian.occupation,
        annualIncome: sg.guardian.annualIncome,
        address: sg.guardian.address,
        isPrimaryContact: sg.isPrimaryContact,
        isAuthorizedPickup: sg.isAuthorizedPickup,
        receivesNotifications: sg.receivesNotifications,
      })),
      enrollmentHistory: student.enrollments.map((e) => ({
        id: e.id,
        academicYearId: e.academicYearId,
        academicYearName: e.academicYear.name,
        isCurrentYear: e.academicYear.isCurrent,
        classId: e.classId,
        className: e.class.name,
        sectionId: e.sectionId,
        sectionName: e.section.name,
        rollNumber: e.rollNumber,
        status: e.status,
        enrollmentDate: e.enrollmentDate,
        remarks: e.remarks,
      })),
    };
  }

  /**
   * Admit a new student with atomic transaction (Personal -> Guardian -> Placement).
   */
  async admitStudent(
    schoolId: string,
    dto: AdmitStudentDto,
    actorId?: string,
    clientContext?: ClientContext,
  ) {
    if (!dto.admissionNumber || !dto.admissionNumber.trim()) {
      throw new BadRequestError('Admission number is required', undefined, 'ADMISSION_NUMBER_REQUIRED');
    }
    if (!dto.firstName || !dto.lastName) {
      throw new BadRequestError('First name and last name are required', undefined, 'STUDENT_NAME_REQUIRED');
    }
    if (!dto.dateOfBirth) {
      throw new BadRequestError('Date of birth is required', undefined, 'DOB_REQUIRED');
    }
    if (!dto.gender) {
      throw new BadRequestError('Gender is required', undefined, 'GENDER_REQUIRED');
    }

    const trimmedAdmissionNo = dto.admissionNumber.trim();

    // Check admission number uniqueness
    const existing = await prisma.student.findUnique({
      where: {
        schoolId_admissionNumber: {
          schoolId,
          admissionNumber: trimmedAdmissionNo,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Student with admission number '${trimmedAdmissionNo}' already exists in this school`,
        'ADMISSION_NUMBER_CONFLICT',
      );
    }

    // Verify academic enrollment target if provided
    if (dto.enrollment) {
      const { academicYearId, classId, sectionId } = dto.enrollment;
      const [ay, cls, sec] = await Promise.all([
        prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } }),
        prisma.class.findFirst({ where: { id: classId, schoolId } }),
        prisma.section.findFirst({ where: { id: sectionId, schoolId, classId } }),
      ]);

      if (!ay) throw new NotFoundError('Target academic year not found', 'ACADEMIC_YEAR_NOT_FOUND');
      if (!cls) throw new NotFoundError('Target class not found', 'CLASS_NOT_FOUND');
      if (!sec) throw new NotFoundError('Target section not found for the given class', 'SECTION_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Student
      const student = await tx.student.create({
        data: {
          schoolId,
          admissionNumber: trimmedAdmissionNo,
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : new Date(),
          firstName: dto.firstName.trim(),
          middleName: dto.middleName?.trim() || null,
          lastName: dto.lastName.trim(),
          gender: dto.gender,
          dateOfBirth: new Date(dto.dateOfBirth),
          bloodGroup: dto.bloodGroup || 'UNKNOWN',
          apaarId: dto.apaarId?.trim() || null,
          aadhaarLastFour: dto.aadhaarLastFour?.trim() || null,
          nationality: dto.nationality?.trim() || 'Indian',
          religion: dto.religion?.trim() || null,
          category: dto.category || 'GENERAL',
          permanentAddress: (dto.permanentAddress as Prisma.InputJsonValue) || Prisma.JsonNull,
          currentAddress: (dto.currentAddress as Prisma.InputJsonValue) || Prisma.JsonNull,
          photoUrl: dto.photoUrl?.trim() || null,
          status: StudentStatus.ENROLLED,
        },
      });

      // 2. Link Guardians
      if (dto.guardians && dto.guardians.length > 0) {
        for (const [i, g] of dto.guardians.entries()) {
          const isPrimary = g.isPrimaryContact ?? i === 0;

          // Check if guardian with same phone already exists in this school
          let guardianRecord = await tx.guardian.findFirst({
            where: { schoolId, phone: g.phone.trim() },
          });

          if (!guardianRecord) {
            guardianRecord = await tx.guardian.create({
              data: {
                schoolId,
                name: g.name.trim(),
                relationship: g.relationship,
                phone: g.phone.trim(),
                email: g.email?.trim() || null,
                occupation: g.occupation?.trim() || null,
                annualIncome: g.annualIncome?.trim() || null,
              },
            });
          }

          await tx.studentGuardian.create({
            data: {
              studentId: student.id,
              guardianId: guardianRecord.id,
              isPrimaryContact: isPrimary,
              isAuthorizedPickup: g.isAuthorizedPickup ?? true,
              receivesNotifications: g.receivesNotifications ?? true,
            },
          });
        }
      }

      // 3. Create Initial Enrollment
      let createdEnrollment = null;
      if (dto.enrollment) {
        createdEnrollment = await tx.enrollment.create({
          data: {
            schoolId,
            studentId: student.id,
            academicYearId: dto.enrollment.academicYearId,
            classId: dto.enrollment.classId,
            sectionId: dto.enrollment.sectionId,
            rollNumber: dto.enrollment.rollNumber ? Number(dto.enrollment.rollNumber) : null,
            status: EnrollmentStatus.ACTIVE,
            remarks: dto.enrollment.remarks?.trim() || 'Initial admission placement',
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          actorId,
          action: 'STUDENT_ADMITTED',
          entityType: 'Student',
          entityId: student.id,
          diff: {
            admissionNumber: student.admissionNumber,
            name: `${student.firstName} ${student.lastName}`,
            enrollment: createdEnrollment
              ? {
                  academicYearId: createdEnrollment.academicYearId,
                  classId: createdEnrollment.classId,
                  sectionId: createdEnrollment.sectionId,
                }
              : null,
          },
          ipAddress: clientContext?.ipAddress,
          userAgent: clientContext?.userAgent,
        },
      });

      return {
        ...student,
        enrollment: createdEnrollment,
      };
    });
  }

  /**
   * Update student profile.
   */
  async updateStudent(
    schoolId: string,
    studentId: string,
    dto: UpdateStudentDto,
    actorId?: string,
    clientContext?: ClientContext,
  ) {
    const existing = await prisma.student.findFirst({
      where: { id: studentId, schoolId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Student with ID '${studentId}' not found`, 'STUDENT_NOT_FOUND');
    }

    const data: Prisma.StudentUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.middleName !== undefined) data.middleName = dto.middleName?.trim() || null;
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.bloodGroup !== undefined) data.bloodGroup = dto.bloodGroup;
    if (dto.apaarId !== undefined) data.apaarId = dto.apaarId?.trim() || null;
    if (dto.aadhaarLastFour !== undefined) data.aadhaarLastFour = dto.aadhaarLastFour?.trim() || null;
    if (dto.nationality !== undefined) data.nationality = dto.nationality.trim();
    if (dto.religion !== undefined) data.religion = dto.religion?.trim() || null;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.permanentAddress !== undefined) {
      data.permanentAddress = (dto.permanentAddress as Prisma.InputJsonValue) || Prisma.JsonNull;
    }
    if (dto.currentAddress !== undefined) {
      data.currentAddress = (dto.currentAddress as Prisma.InputJsonValue) || Prisma.JsonNull;
    }
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl?.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await prisma.student.update({
      where: { id: studentId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'STUDENT_UPDATED',
        entityType: 'Student',
        entityId: studentId,
        diff: { previous: existing as any, updated: dto as any },
        ipAddress: clientContext?.ipAddress,
        userAgent: clientContext?.userAgent,
      },
    });

    return updated;
  }

  /**
   * Link a guardian to a student.
   */
  async linkGuardian(
    schoolId: string,
    studentId: string,
    dto: LinkGuardianDto,
    actorId?: string,
    clientContext?: ClientContext,
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId, deletedAt: null },
    });
    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found`, 'STUDENT_NOT_FOUND');
    }

    return await prisma.$transaction(async (tx) => {
      let guardianId = dto.guardianId;

      if (!guardianId) {
        if (!dto.name || !dto.phone) {
          throw new BadRequestError('Guardian name and phone are required', undefined, 'GUARDIAN_INFO_REQUIRED');
        }

        // Check if guardian with phone exists
        let guardian = await tx.guardian.findFirst({
          where: { schoolId, phone: dto.phone.trim() },
        });

        if (!guardian) {
          guardian = await tx.guardian.create({
            data: {
              schoolId,
              name: dto.name.trim(),
              relationship: dto.relationship || 'GUARDIAN',
              phone: dto.phone.trim(),
              email: dto.email?.trim() || null,
              occupation: dto.occupation?.trim() || null,
              annualIncome: dto.annualIncome?.trim() || null,
              address: (dto.address as Prisma.InputJsonValue) || Prisma.JsonNull,
            },
          });
        }
        guardianId = guardian.id;
      }

      if (dto.isPrimaryContact) {
        // Demote other guardians for this student
        await tx.studentGuardian.updateMany({
          where: { studentId },
          data: { isPrimaryContact: false },
        });
      }

      const link = await tx.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId,
            guardianId,
          },
        },
        update: {
          isPrimaryContact: dto.isPrimaryContact ?? false,
          isAuthorizedPickup: dto.isAuthorizedPickup ?? true,
          receivesNotifications: dto.receivesNotifications ?? true,
        },
        create: {
          studentId,
          guardianId,
          isPrimaryContact: dto.isPrimaryContact ?? false,
          isAuthorizedPickup: dto.isAuthorizedPickup ?? true,
          receivesNotifications: dto.receivesNotifications ?? true,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId,
          action: 'GUARDIAN_LINKED',
          entityType: 'StudentGuardian',
          entityId: link.id,
          diff: { studentId, guardianId, isPrimary: dto.isPrimaryContact },
          ipAddress: clientContext?.ipAddress,
          userAgent: clientContext?.userAgent,
        },
      });

      return link;
    });
  }

  /**
   * Unlink a guardian from a student.
   */
  async unlinkGuardian(schoolId: string, studentId: string, guardianId: string, actorId?: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId, deletedAt: null },
    });
    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found`, 'STUDENT_NOT_FOUND');
    }

    const link = await prisma.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId, guardianId } },
    });

    if (!link) {
      throw new NotFoundError('Guardian is not linked to this student', 'LINK_NOT_FOUND');
    }

    await prisma.studentGuardian.delete({
      where: { id: link.id },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'GUARDIAN_UNLINKED',
        entityType: 'StudentGuardian',
        entityId: link.id,
        diff: { studentId, guardianId },
      },
    });

    return { success: true };
  }
}

export const studentsService = new StudentsService();
