import { prisma } from '../../database/db.js';
import { DayOfWeek } from '@prisma/client';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/index.js';

export interface SavePeriodItemDto {
  id?: string;
  periodNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export interface SaveTimetableSlotDto {
  id?: string;
  academicYearId?: string;
  classId?: string;
  sectionId: string;
  dayOfWeek: DayOfWeek;
  periodId: string;
  subjectId?: string | null;
  teacherId?: string | null;
  roomNumber?: string | null;
}

export interface SaveTeacherAllocationDto {
  id?: string;
  academicYearId?: string;
  teacherId: string;
  classId: string;
  sectionId: string;
  subjectId?: string | null;
  isClassTeacher?: boolean;
}

export class TimetableService {
  /**
   * Helper: Get current active academic year ID for a school
   */
  private async getActiveAcademicYearId(schoolId: string, overrideId?: string): Promise<string> {
    if (overrideId) return overrideId;
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!activeYear) {
      throw new BadRequestError('No active academic session found for this school', undefined, 'NO_ACTIVE_ACADEMIC_YEAR');
    }
    return activeYear.id;
  }

  // ==========================================================================
  // Periods
  // ==========================================================================

  async getPeriods(schoolId: string) {
    return prisma.period.findMany({
      where: { schoolId },
      orderBy: { periodNumber: 'asc' },
    });
  }

  async savePeriods(schoolId: string, items: SavePeriodItemDto[]) {
    if (!items || items.length === 0) {
      throw new BadRequestError('Periods list cannot be empty', undefined, 'EMPTY_PERIODS');
    }

    return prisma.$transaction(async (tx) => {
      const saved = [];
      for (const item of items) {
        const period = await tx.period.upsert({
          where: {
            schoolId_periodNumber: {
              schoolId,
              periodNumber: item.periodNumber,
            },
          },
          update: {
            name: item.name,
            startTime: item.startTime,
            endTime: item.endTime,
            isBreak: Boolean(item.isBreak),
          },
          create: {
            schoolId,
            periodNumber: item.periodNumber,
            name: item.name,
            startTime: item.startTime,
            endTime: item.endTime,
            isBreak: Boolean(item.isBreak),
          },
        });
        saved.push(period);
      }
      return saved;
    });
  }

  // ==========================================================================
  // Timetable Slots
  // ==========================================================================

  async getSectionTimetable(schoolId: string, sectionId: string, academicYearId?: string) {
    const yearId = await this.getActiveAcademicYearId(schoolId, academicYearId);

    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId },
      include: { class: true },
    });

    if (!section) {
      throw new NotFoundError('Section not found', 'SECTION_NOT_FOUND');
    }

    const periods = await prisma.period.findMany({
      where: { schoolId },
      orderBy: { periodNumber: 'asc' },
    });

    const slots = await prisma.timetableSlot.findMany({
      where: {
        schoolId,
        sectionId,
        academicYearId: yearId,
      },
      include: {
        period: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by Day of Week
    const days: DayOfWeek[] = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    const grid: Record<DayOfWeek, typeof slots> = {
      [DayOfWeek.MONDAY]: [],
      [DayOfWeek.TUESDAY]: [],
      [DayOfWeek.WEDNESDAY]: [],
      [DayOfWeek.THURSDAY]: [],
      [DayOfWeek.FRIDAY]: [],
      [DayOfWeek.SATURDAY]: [],
    };

    for (const slot of slots) {
      if (grid[slot.dayOfWeek]) {
        grid[slot.dayOfWeek].push(slot);
      }
    }

    return {
      section: {
        id: section.id,
        name: section.name,
        className: section.class.name,
        roomNumber: section.roomNumber,
      },
      academicYearId: yearId,
      periods,
      days,
      grid,
      rawSlots: slots,
    };
  }

  async getTeacherTimetable(schoolId: string, teacherId: string, academicYearId?: string) {
    const yearId = await this.getActiveAcademicYearId(schoolId, academicYearId);

    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });

    if (!teacher) {
      throw new NotFoundError('Teacher not found', 'TEACHER_NOT_FOUND');
    }

    const slots = await prisma.timetableSlot.findMany({
      where: {
        schoolId,
        teacherId,
        academicYearId: yearId,
      },
      include: {
        period: true,
        class: true,
        section: true,
        subject: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: { periodNumber: 'asc' } },
      ],
    });

    return {
      teacher: {
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`.trim(),
        employeeCode: teacher.employeeCode,
      },
      academicYearId: yearId,
      totalWeeklyPeriods: slots.length,
      slots,
    };
  }

  async saveSlot(schoolId: string, dto: SaveTimetableSlotDto) {
    const yearId = await this.getActiveAcademicYearId(schoolId, dto.academicYearId);

    // Verify section
    const section = await prisma.section.findFirst({
      where: { id: dto.sectionId, schoolId },
      include: { class: true },
    });
    if (!section) {
      throw new NotFoundError('Section not found in this school', 'SECTION_NOT_FOUND');
    }

    // Verify period
    const period = await prisma.period.findFirst({
      where: { id: dto.periodId, schoolId },
    });
    if (!period) {
      throw new NotFoundError('Period not found in this school', 'PERIOD_NOT_FOUND');
    }

    // If teacher is assigned, perform Conflict Detection!
    if (dto.teacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: { id: dto.teacherId, schoolId },
      });
      if (!teacher) {
        throw new NotFoundError('Assigned teacher not found', 'TEACHER_NOT_FOUND');
      }

      // Check if teacher is already assigned to a DIFFERENT section at this exact period and day
      const conflictingSlot = await prisma.timetableSlot.findFirst({
        where: {
          schoolId,
          academicYearId: yearId,
          dayOfWeek: dto.dayOfWeek,
          periodId: dto.periodId,
          teacherId: dto.teacherId,
          sectionId: { not: dto.sectionId },
        },
        include: {
          class: true,
          section: true,
          period: true,
        },
      });

      if (conflictingSlot) {
        throw new ConflictError(
          `Schedule Conflict: Teacher ${teacher.firstName} ${teacher.lastName} is already scheduled for ${conflictingSlot.class.name} Section ${conflictingSlot.section.name} during ${conflictingSlot.period.name} on ${dto.dayOfWeek}. Double booking is not permitted.`,
          'TEACHER_SCHEDULE_CONFLICT',
        );
      }
    }

    // Save / Upsert slot
    const slot = await prisma.timetableSlot.upsert({
      where: {
        sectionId_academicYearId_dayOfWeek_periodId: {
          sectionId: dto.sectionId,
          academicYearId: yearId,
          dayOfWeek: dto.dayOfWeek,
          periodId: dto.periodId,
        },
      },
      update: {
        subjectId: dto.subjectId || null,
        teacherId: dto.teacherId || null,
        roomNumber: dto.roomNumber || section.roomNumber || null,
      },
      create: {
        schoolId,
        academicYearId: yearId,
        classId: section.classId,
        sectionId: dto.sectionId,
        dayOfWeek: dto.dayOfWeek,
        periodId: dto.periodId,
        subjectId: dto.subjectId || null,
        teacherId: dto.teacherId || null,
        roomNumber: dto.roomNumber || section.roomNumber || null,
      },
      include: {
        period: true,
        subject: true,
        teacher: true,
      },
    });

    return slot;
  }

  async deleteSlot(schoolId: string, slotId: string) {
    const slot = await prisma.timetableSlot.findFirst({
      where: { id: slotId, schoolId },
    });
    if (!slot) {
      throw new NotFoundError('Timetable slot not found', 'SLOT_NOT_FOUND');
    }

    await prisma.timetableSlot.delete({
      where: { id: slotId },
    });

    return { success: true, message: 'Timetable slot deleted' };
  }

  // ==========================================================================
  // Teacher Allocations
  // ==========================================================================

  async getAllocations(schoolId: string, academicYearId?: string, sectionId?: string) {
    const yearId = await this.getActiveAcademicYearId(schoolId, academicYearId);

    return prisma.teacherAllocation.findMany({
      where: {
        schoolId,
        academicYearId: yearId,
        ...(sectionId ? { sectionId } : {}),
      },
      include: {
        teacher: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        class: true,
        section: true,
        subject: true,
      },
      orderBy: [
        { class: { orderIndex: 'asc' } },
        { section: { name: 'asc' } },
        { isClassTeacher: 'desc' },
      ],
    });
  }

  async saveAllocation(schoolId: string, dto: SaveTeacherAllocationDto) {
    const yearId = await this.getActiveAcademicYearId(schoolId, dto.academicYearId);

    const teacher = await prisma.teacher.findFirst({
      where: { id: dto.teacherId, schoolId },
    });
    if (!teacher) {
      throw new NotFoundError('Teacher not found', 'TEACHER_NOT_FOUND');
    }

    const section = await prisma.section.findFirst({
      where: { id: dto.sectionId, schoolId },
      include: { class: true },
    });
    if (!section) {
      throw new NotFoundError('Section not found', 'SECTION_NOT_FOUND');
    }

    // If marked as Class Teacher, update existing class teacher flag for this section
    if (dto.isClassTeacher) {
      await prisma.teacherAllocation.updateMany({
        where: {
          schoolId,
          sectionId: dto.sectionId,
          academicYearId: yearId,
          isClassTeacher: true,
        },
        data: {
          isClassTeacher: false,
        },
      });
    }

    const allocation = await prisma.teacherAllocation.create({
      data: {
        schoolId,
        academicYearId: yearId,
        teacherId: dto.teacherId,
        classId: section.classId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId || null,
        isClassTeacher: Boolean(dto.isClassTeacher),
      },
      include: {
        teacher: true,
        class: true,
        section: true,
        subject: true,
      },
    });

    return allocation;
  }

  async deleteAllocation(schoolId: string, allocationId: string) {
    const allocation = await prisma.teacherAllocation.findFirst({
      where: { id: allocationId, schoolId },
    });
    if (!allocation) {
      throw new NotFoundError('Teacher allocation not found', 'ALLOCATION_NOT_FOUND');
    }

    await prisma.teacherAllocation.delete({
      where: { id: allocationId },
    });

    return { success: true, message: 'Teacher allocation removed' };
  }
}

export const timetableService = new TimetableService();
