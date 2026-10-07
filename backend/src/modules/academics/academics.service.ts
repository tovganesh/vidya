import { prisma } from '../../database/db.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors/index.js';
import {
  AcademicStage,
  AcademicYearStatus,
  SubjectType,
  Prisma,
} from '@prisma/client';

export interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAcademicYearDto {
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  status?: AcademicYearStatus;
  isCurrent?: boolean;
}

export interface UpdateAcademicYearDto {
  name?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: AcademicYearStatus;
  isCurrent?: boolean;
}

export interface CreateClassDto {
  name: string;
  code: string;
  stage?: AcademicStage;
  orderIndex?: number;
}

export interface UpdateClassDto {
  name?: string;
  code?: string;
  stage?: AcademicStage;
  orderIndex?: number;
}

export interface CreateSectionDto {
  classId: string;
  name: string;
  roomNumber?: string | null;
  capacity?: number;
}

export interface UpdateSectionDto {
  name?: string;
  roomNumber?: string | null;
  capacity?: number;
}

export interface CreateSubjectDto {
  name: string;
  code: string;
  type?: SubjectType;
}

export interface UpdateSubjectDto {
  name?: string;
  code?: string;
  type?: SubjectType;
}

export interface AssignSubjectDto {
  subjectId: string;
  isCompulsory?: boolean;
  weeklyPeriods?: number;
}

export interface SetupWizardDto {
  academicYearName: string;
  startDate: string | Date;
  endDate: string | Date;
  curriculumType: 'CBSE' | 'ICSE' | 'STATE';
  includePrePrimary: boolean;
  includeHigherSecondary: boolean;
  sectionsPerClass: string[]; // e.g. ['A', 'B']
  sectionCapacity?: number;
}

export class AcademicsService {
  // ==========================================================================
  // Academic Years
  // ==========================================================================

  async getAcademicYears(schoolId: string) {
    return prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getAcademicYearById(schoolId: string, id: string) {
    const year = await prisma.academicYear.findFirst({
      where: { id, schoolId },
    });
    if (!year) {
      throw new NotFoundError('Academic year not found', 'ACADEMIC_YEAR_NOT_FOUND');
    }
    return year;
  }

  async createAcademicYear(
    schoolId: string,
    data: CreateAcademicYearDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError('Invalid start or end date format', undefined, 'INVALID_DATE');
    }

    if (start >= end) {
      throw new BadRequestError('Start date must be strictly before end date', undefined, 'INVALID_DATE_RANGE');
    }

    const existingName = await prisma.academicYear.findUnique({
      where: {
        schoolId_name: { schoolId, name: data.name },
      },
    });

    if (existingName) {
      throw new ConflictError(
        `Academic year "${data.name}" already exists for this school`,
        'DUPLICATE_ACADEMIC_YEAR',
      );
    }

    const isCurrent = data.isCurrent ?? false;
    const status = data.status ?? (isCurrent ? AcademicYearStatus.ACTIVE : AcademicYearStatus.PLANNING);

    const year = await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.academicYear.updateMany({
          where: { schoolId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.create({
        data: {
          schoolId,
          name: data.name,
          startDate: start,
          endDate: end,
          status,
          isCurrent,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'ACADEMIC_YEAR_CREATE',
        entityType: 'AcademicYear',
        entityId: year.id,
        diff: { name: year.name, isCurrent: year.isCurrent, status: year.status },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return year;
  }

  async updateAcademicYear(
    schoolId: string,
    id: string,
    data: UpdateAcademicYearDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await this.getAcademicYearById(schoolId, id);

    let start = existing.startDate;
    let end = existing.endDate;

    if (data.startDate) {
      start = new Date(data.startDate);
      if (isNaN(start.getTime())) throw new BadRequestError('Invalid start date');
    }

    if (data.endDate) {
      end = new Date(data.endDate);
      if (isNaN(end.getTime())) throw new BadRequestError('Invalid end date');
    }

    if (start >= end) {
      throw new BadRequestError('Start date must be strictly before end date', undefined, 'INVALID_DATE_RANGE');
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.academicYear.findUnique({
        where: { schoolId_name: { schoolId, name: data.name } },
      });
      if (duplicate) {
        throw new ConflictError(`Academic year "${data.name}" already exists`, 'DUPLICATE_ACADEMIC_YEAR');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isCurrent === true && !existing.isCurrent) {
        await tx.academicYear.updateMany({
          where: { schoolId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.startDate && { startDate: start }),
          ...(data.endDate && { endDate: end }),
          ...(data.status && { status: data.status }),
          ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'ACADEMIC_YEAR_UPDATE',
        entityType: 'AcademicYear',
        entityId: id,
        diff: { before: existing, after: updated },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return updated;
  }

  /**
   * Activate Academic Year (Sets isCurrent: true, status: ACTIVE, and deactivates others)
   */
  async activateAcademicYear(
    schoolId: string,
    id: string,
    actorId: string,
    context?: ClientContext,
  ) {
    const target = await this.getAcademicYearById(schoolId, id);

    const activated = await prisma.$transaction(async (tx) => {
      // Mark all other years as not current
      await tx.academicYear.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false },
      });

      // Activate the targeted year
      return tx.academicYear.update({
        where: { id },
        data: {
          isCurrent: true,
          status: AcademicYearStatus.ACTIVE,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'ACADEMIC_YEAR_ACTIVATE',
        entityType: 'AcademicYear',
        entityId: id,
        diff: { activatedYear: activated.name },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return activated;
  }

  async deleteAcademicYear(
    schoolId: string,
    id: string,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await this.getAcademicYearById(schoolId, id);

    if (existing.isCurrent) {
      throw new BadRequestError(
        'Cannot delete the currently active academic year. Switch active year first.',
        undefined,
        'CANNOT_DELETE_ACTIVE_YEAR',
      );
    }

    await prisma.academicYear.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'ACADEMIC_YEAR_DELETE',
        entityType: 'AcademicYear',
        entityId: id,
        diff: { deleted: existing },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return { success: true, message: 'Academic year deleted successfully' };
  }

  // ==========================================================================
  // Classes
  // ==========================================================================

  async getClasses(schoolId: string) {
    return prisma.class.findMany({
      where: { schoolId },
      orderBy: { orderIndex: 'asc' },
      include: {
        sections: {
          orderBy: { name: 'asc' },
        },
        classSubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            sections: true,
            classSubjects: true,
          },
        },
      },
    });
  }

  async getClassById(schoolId: string, id: string) {
    const cls = await prisma.class.findFirst({
      where: { id, schoolId },
      include: {
        sections: true,
        classSubjects: {
          include: { subject: true },
        },
      },
    });

    if (!cls) {
      throw new NotFoundError('Class not found', 'CLASS_NOT_FOUND');
    }
    return cls;
  }

  async createClass(
    schoolId: string,
    data: CreateClassDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const existingCode = await prisma.class.findUnique({
      where: { schoolId_code: { schoolId, code: data.code } },
    });

    if (existingCode) {
      throw new ConflictError(`Class code "${data.code}" already exists in this school`, 'DUPLICATE_CLASS_CODE');
    }

    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await prisma.class.aggregate({
        where: { schoolId },
        _max: { orderIndex: true },
      });
      orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    }

    const cls = await prisma.class.create({
      data: {
        schoolId,
        name: data.name,
        code: data.code,
        stage: data.stage ?? AcademicStage.SECONDARY,
        orderIndex,
      },
      include: {
        sections: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'CLASS_CREATE',
        entityType: 'Class',
        entityId: cls.id,
        diff: { name: cls.name, code: cls.code, orderIndex: cls.orderIndex },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return cls;
  }

  async updateClass(
    schoolId: string,
    id: string,
    data: UpdateClassDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await this.getClassById(schoolId, id);

    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.class.findUnique({
        where: { schoolId_code: { schoolId, code: data.code } },
      });
      if (duplicate) {
        throw new ConflictError(`Class code "${data.code}" already exists`, 'DUPLICATE_CLASS_CODE');
      }
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code }),
        ...(data.stage && { stage: data.stage }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
      include: {
        sections: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'CLASS_UPDATE',
        entityType: 'Class',
        entityId: id,
        diff: { before: existing, after: updated },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return updated;
  }

  async deleteClass(
    schoolId: string,
    id: string,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await this.getClassById(schoolId, id);

    await prisma.class.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'CLASS_DELETE',
        entityType: 'Class',
        entityId: id,
        diff: { deleted: existing },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return { success: true, message: 'Class deleted successfully' };
  }

  // ==========================================================================
  // Sections
  // ==========================================================================

  async getSections(schoolId: string, classId?: string) {
    return prisma.section.findMany({
      where: {
        schoolId,
        ...(classId && { classId }),
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            code: true,
            stage: true,
            orderIndex: true,
          },
        },
      },
      orderBy: [
        { class: { orderIndex: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  async createSection(
    schoolId: string,
    data: CreateSectionDto,
    actorId: string,
    context?: ClientContext,
  ) {
    // Validate parent class belongs to this school
    const parentClass = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });

    if (!parentClass) {
      throw new NotFoundError('Class not found in this school', 'CLASS_NOT_FOUND');
    }

    const trimmedName = data.name.trim();

    const existing = await prisma.section.findUnique({
      where: {
        classId_name: { classId: data.classId, name: trimmedName },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Section "${trimmedName}" already exists for class ${parentClass.name}`,
        'DUPLICATE_SECTION_NAME',
      );
    }

    const section = await prisma.section.create({
      data: {
        schoolId,
        classId: data.classId,
        name: trimmedName,
        roomNumber: data.roomNumber || null,
        capacity: data.capacity !== undefined ? data.capacity : 40,
      },
      include: {
        class: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'SECTION_CREATE',
        entityType: 'Section',
        entityId: section.id,
        diff: { name: section.name, class: parentClass.name },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return section;
  }

  async updateSection(
    schoolId: string,
    id: string,
    data: UpdateSectionDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await prisma.section.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundError('Section not found', 'SECTION_NOT_FOUND');
    }

    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await prisma.section.findUnique({
        where: {
          classId_name: { classId: existing.classId, name: data.name.trim() },
        },
      });
      if (duplicate) {
        throw new ConflictError(`Section "${data.name.trim()}" already exists for this class`, 'DUPLICATE_SECTION_NAME');
      }
    }

    const updated = await prisma.section.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
      },
      include: {
        class: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'SECTION_UPDATE',
        entityType: 'Section',
        entityId: id,
        diff: { before: existing, after: updated },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return updated;
  }

  async deleteSection(
    schoolId: string,
    id: string,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await prisma.section.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundError('Section not found', 'SECTION_NOT_FOUND');
    }

    await prisma.section.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'SECTION_DELETE',
        entityType: 'Section',
        entityId: id,
        diff: { deleted: existing },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return { success: true, message: 'Section deleted successfully' };
  }

  // ==========================================================================
  // Subjects
  // ==========================================================================

  async getSubjects(schoolId: string, type?: SubjectType) {
    return prisma.subject.findMany({
      where: {
        schoolId,
        ...(type && { type }),
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { classSubjects: true },
        },
      },
    });
  }

  async getSubjectById(schoolId: string, id: string) {
    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
    });
    if (!subject) {
      throw new NotFoundError('Subject not found', 'SUBJECT_NOT_FOUND');
    }
    return subject;
  }

  async createSubject(
    schoolId: string,
    data: CreateSubjectDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const code = data.code.trim().toUpperCase();

    const existingCode = await prisma.subject.findUnique({
      where: { schoolId_code: { schoolId, code } },
    });

    if (existingCode) {
      throw new ConflictError(`Subject code "${code}" already exists in this school`, 'DUPLICATE_SUBJECT_CODE');
    }

    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name: data.name.trim(),
        code,
        type: data.type ?? SubjectType.THEORY,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'SUBJECT_CREATE',
        entityType: 'Subject',
        entityId: subject.id,
        diff: { name: subject.name, code: subject.code, type: subject.type },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return subject;
  }

  async updateSubject(
    schoolId: string,
    id: string,
    data: UpdateSubjectDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await this.getSubjectById(schoolId, id);

    if (data.code) {
      const code = data.code.trim().toUpperCase();
      if (code !== existing.code) {
        const duplicate = await prisma.subject.findUnique({
          where: { schoolId_code: { schoolId, code } },
        });
        if (duplicate) {
          throw new ConflictError(`Subject code "${code}" already exists`, 'DUPLICATE_SUBJECT_CODE');
        }
      }
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.trim().toUpperCase() }),
        ...(data.type && { type: data.type }),
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'SUBJECT_UPDATE',
        entityType: 'Subject',
        entityId: id,
        diff: { before: existing, after: updated },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return updated;
  }

  async deleteSubject(
    schoolId: string,
    id: string,
    actorId: string,
    context?: ClientContext,
  ) {
    const existing = await this.getSubjectById(schoolId, id);

    await prisma.subject.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'SUBJECT_DELETE',
        entityType: 'Subject',
        entityId: id,
        diff: { deleted: existing },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return { success: true, message: 'Subject deleted successfully' };
  }

  // ==========================================================================
  // Class-Subject Assignments
  // ==========================================================================

  async getClassSubjects(schoolId: string, classId: string) {
    const cls = await this.getClassById(schoolId, classId);
    return prisma.classSubject.findMany({
      where: { classId: cls.id },
      include: {
        subject: true,
      },
    });
  }

  async assignSubjectsToClass(
    schoolId: string,
    classId: string,
    assignments: AssignSubjectDto[],
    actorId: string,
    context?: ClientContext,
  ) {
    const cls = await this.getClassById(schoolId, classId);

    // Verify all subjectIds exist in this school
    const subjectIds = assignments.map((a) => a.subjectId);
    const existingSubjects = await prisma.subject.findMany({
      where: { schoolId, id: { in: subjectIds } },
    });

    if (existingSubjects.length !== subjectIds.length) {
      throw new BadRequestError('One or more subject IDs do not exist in this school', undefined, 'INVALID_SUBJECT_IDS');
    }

    const results = await prisma.$transaction(
      assignments.map((item) =>
        prisma.classSubject.upsert({
          where: {
            classId_subjectId: {
              classId: cls.id,
              subjectId: item.subjectId,
            },
          },
          update: {
            isCompulsory: item.isCompulsory ?? true,
            weeklyPeriods: item.weeklyPeriods ?? 5,
          },
          create: {
            classId: cls.id,
            subjectId: item.subjectId,
            isCompulsory: item.isCompulsory ?? true,
            weeklyPeriods: item.weeklyPeriods ?? 5,
          },
          include: {
            subject: true,
          },
        }),
      ),
    );

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'CLASS_SUBJECTS_ASSIGN',
        entityType: 'Class',
        entityId: cls.id,
        diff: { assignedCount: assignments.length, class: cls.name },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return results;
  }

  async unassignSubjectFromClass(
    schoolId: string,
    classId: string,
    subjectId: string,
    actorId: string,
    context?: ClientContext,
  ) {
    await this.getClassById(schoolId, classId);

    const mapping = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: { classId, subjectId },
      },
    });

    if (!mapping) {
      throw new NotFoundError('Subject is not assigned to this class', 'ASSIGNMENT_NOT_FOUND');
    }

    await prisma.classSubject.delete({
      where: {
        classId_subjectId: { classId, subjectId },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'CLASS_SUBJECT_UNASSIGN',
        entityType: 'ClassSubject',
        entityId: `${classId}_${subjectId}`,
        diff: { unassigned: mapping },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return { success: true, message: 'Subject unassigned from class successfully' };
  }

  // ==========================================================================
  // Academic Setup Onboarding Wizard / Bulk Bootstrap
  // ==========================================================================

  async bootstrapAcademicSetup(
    schoolId: string,
    data: SetupWizardDto,
    actorId: string,
    context?: ClientContext,
  ) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundError('School not found', 'SCHOOL_NOT_FOUND');
    }

    // 1. Create or ensure Academic Year
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    const academicYear = await prisma.academicYear.upsert({
      where: {
        schoolId_name: { schoolId, name: data.academicYearName },
      },
      update: {
        startDate: start,
        endDate: end,
        isCurrent: true,
        status: AcademicYearStatus.ACTIVE,
      },
      create: {
        schoolId,
        name: data.academicYearName,
        startDate: start,
        endDate: end,
        isCurrent: true,
        status: AcademicYearStatus.ACTIVE,
      },
    });

    // Mark any other years as not current
    await prisma.academicYear.updateMany({
      where: {
        schoolId,
        id: { not: academicYear.id },
        isCurrent: true,
      },
      data: { isCurrent: false },
    });

    // 2. Prepare Class list
    const classesToCreate: Array<{ name: string; code: string; stage: AcademicStage; order: number }> = [];

    if (data.includePrePrimary) {
      classesToCreate.push(
        { name: 'Nursery', code: 'NUR', stage: AcademicStage.PRE_PRIMARY, order: 0 },
        { name: 'LKG', code: 'LKG', stage: AcademicStage.PRE_PRIMARY, order: 1 },
        { name: 'UKG', code: 'UKG', stage: AcademicStage.PRE_PRIMARY, order: 2 },
      );
    }

    // Standard Primary & Middle & Secondary (1 to 10)
    const primaryStages = [
      { name: 'Class 1', code: 'STD-01', stage: AcademicStage.PRIMARY, order: 3 },
      { name: 'Class 2', code: 'STD-02', stage: AcademicStage.PRIMARY, order: 4 },
      { name: 'Class 3', code: 'STD-03', stage: AcademicStage.PRIMARY, order: 5 },
      { name: 'Class 4', code: 'STD-04', stage: AcademicStage.PRIMARY, order: 6 },
      { name: 'Class 5', code: 'STD-05', stage: AcademicStage.PRIMARY, order: 7 },
      { name: 'Class 6', code: 'STD-06', stage: AcademicStage.MIDDLE, order: 8 },
      { name: 'Class 7', code: 'STD-07', stage: AcademicStage.MIDDLE, order: 9 },
      { name: 'Class 8', code: 'STD-08', stage: AcademicStage.MIDDLE, order: 10 },
      { name: 'Class 9', code: 'STD-09', stage: AcademicStage.SECONDARY, order: 11 },
      { name: 'Class 10', code: 'STD-10', stage: AcademicStage.SECONDARY, order: 12 },
    ];
    classesToCreate.push(...primaryStages);

    if (data.includeHigherSecondary) {
      classesToCreate.push(
        { name: 'Class 11', code: 'STD-11', stage: AcademicStage.HIGHER_SECONDARY, order: 13 },
        { name: 'Class 12', code: 'STD-12', stage: AcademicStage.HIGHER_SECONDARY, order: 14 },
      );
    }

    const sectionNames = data.sectionsPerClass && data.sectionsPerClass.length > 0 ? data.sectionsPerClass : ['A', 'B'];
    const capacity = data.sectionCapacity || 40;

    let createdClassesCount = 0;
    let createdSectionsCount = 0;

    for (const c of classesToCreate) {
      const cls = await prisma.class.upsert({
        where: { schoolId_code: { schoolId, code: c.code } },
        update: { name: c.name, stage: c.stage, orderIndex: c.order },
        create: {
          schoolId,
          name: c.name,
          code: c.code,
          stage: c.stage,
          orderIndex: c.order,
        },
      });
      createdClassesCount++;

      for (const sName of sectionNames) {
        await prisma.section.upsert({
          where: {
            classId_name: { classId: cls.id, name: sName.trim() },
          },
          update: { capacity },
          create: {
            schoolId,
            classId: cls.id,
            name: sName.trim(),
            capacity,
          },
        });
        createdSectionsCount++;
      }
    }

    // Record audit event
    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId,
        action: 'ACADEMIC_BOOTSTRAP_WIZARD',
        entityType: 'School',
        entityId: schoolId,
        diff: {
          academicYear: academicYear.name,
          classesCount: createdClassesCount,
          sectionsCount: createdSectionsCount,
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });

    return {
      academicYear,
      classesConfigured: createdClassesCount,
      sectionsConfigured: createdSectionsCount,
    };
  }
}

export const academicsService = new AcademicsService();
