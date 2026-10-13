import { prisma } from '../../database/db.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/index.js';
import { NotificationType, EnrollmentStatus } from '@prisma/client';

export interface SaveDiaryEntryDto {
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  date: string; // 'YYYY-MM-DD'
  classwork: string;
  homework?: string | null;
  dueDate?: string | null; // 'YYYY-MM-DD'
  teacherId?: string | null;
}

export interface DiaryFilterParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  academicYearId?: string;
}

export class DiaryService {
  /**
   * Helper to normalize a date string 'YYYY-MM-DD' to UTC midnight Date
   */
  private normalizeDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      throw new BadRequestError('Invalid date format. Expected YYYY-MM-DD', undefined, 'INVALID_DATE');
    }
    const year = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1;
    const day = parseInt(parts[2]!, 10);
    const d = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    if (isNaN(d.getTime())) {
      throw new BadRequestError('Invalid date values provided', undefined, 'INVALID_DATE');
    }
    return d;
  }

  /**
   * Fetch daily diary entries for a school filtered by date, section, class, or subject
   */
  async getEntries(schoolId: string, filters: DiaryFilterParams) {
    const where: any = { schoolId };

    if (filters.sectionId) {
      where.sectionId = filters.sectionId;
    } else if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    if (filters.date) {
      where.date = this.normalizeDate(filters.date);
    } else if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = this.normalizeDate(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = this.normalizeDate(filters.endDate);
      }
    }

    const entries = await prisma.dailyDiaryEntry.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            employeeCode: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { subject: { name: 'asc' } }],
    });

    return entries;
  }

  /**
   * Create or update a daily diary entry
   */
  async saveEntry(schoolId: string, data: SaveDiaryEntryDto, currentUserId?: string) {
    if (!data.classId || !data.sectionId || !data.subjectId || !data.date || !data.classwork) {
      throw new BadRequestError('Missing required fields: classId, sectionId, subjectId, date, classwork');
    }

    const entryDate = this.normalizeDate(data.date);
    const dueDate = data.dueDate ? this.normalizeDate(data.dueDate) : null;

    // Resolve teacher ID if not provided explicitly
    let teacherId = data.teacherId || null;
    if (!teacherId && currentUserId) {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: currentUserId, schoolId },
      });
      if (teacher) {
        teacherId = teacher.id;
      }
    }

    // Ensure academicYearId is resolved
    let academicYearId = data.academicYearId;
    if (!academicYearId) {
      const currentAy = await prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      if (currentAy) {
        academicYearId = currentAy.id;
      } else {
        const anyAy = await prisma.academicYear.findFirst({
          where: { schoolId },
        });
        if (anyAy) academicYearId = anyAy.id;
        else throw new BadRequestError('No academic year configured for this school');
      }
    }

    const entry = await prisma.dailyDiaryEntry.upsert({
      where: {
        sectionId_subjectId_date: {
          sectionId: data.sectionId,
          subjectId: data.subjectId,
          date: entryDate,
        },
      },
      update: {
        classwork: data.classwork,
        homework: data.homework || null,
        dueDate,
        teacherId: teacherId ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        schoolId,
        academicYearId,
        classId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        teacherId,
        date: entryDate,
        classwork: data.classwork,
        homework: data.homework || null,
        dueDate,
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true, type: true },
        },
        class: {
          select: { id: true, name: true, code: true },
        },
        section: {
          select: { id: true, name: true },
        },
        teacher: {
          select: {
            id: true,
            employeeCode: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // If homework was given, optionally trigger background in-app notifications to parents of the section
    if (data.homework && data.homework.trim().length > 0) {
      this.notifySectionGuardians(schoolId, data.sectionId, entry).catch(() => {});
    }

    return entry;
  }

  /**
   * Delete a daily diary entry
   */
  async deleteEntry(schoolId: string, id: string) {
    const existing = await prisma.dailyDiaryEntry.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundError('Diary entry not found');
    }

    await prisma.dailyDiaryEntry.delete({
      where: { id },
    });

    return { success: true, message: 'Diary entry deleted' };
  }

  /**
   * Send notification to parents and students of the section when homework is assigned
   */
  private async notifySectionGuardians(
    schoolId: string,
    sectionId: string,
    entry: {
      date: Date;
      classwork: string;
      homework: string | null;
      subject: { name: string };
      class: { name: string };
      section: { name: string };
    },
  ) {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { sectionId, status: EnrollmentStatus.ACTIVE },
        include: {
          student: {
            include: {
              guardians: {
                include: {
                  guardian: {
                    select: { userId: true },
                  },
                },
              },
            },
          },
        },
      });

      const parentUserIds = new Set<string>();
      for (const enr of enrollments) {
        for (const sg of enr.student.guardians) {
          if (sg.guardian.userId) {
            parentUserIds.add(sg.guardian.userId);
          }
        }
      }

      const formattedDate = entry.date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });

      const title = `New Homework: ${entry.subject.name}`;
      const body = `${entry.class.name}-${entry.section.name} (${formattedDate}): ${entry.homework?.slice(0, 100)}`;

      for (const pUserId of parentUserIds) {
        await prisma.notification.create({
          data: {
            schoolId,
            userId: pUserId,
            title,
            body,
            type: NotificationType.TIMETABLE_UPDATE,
            data: { link: '/timetable?tab=diary' },
            isRead: false,
          },
        });
      }
    } catch {
      // Background notification non-blocking
    }
  }
}

export const diaryService = new DiaryService();
