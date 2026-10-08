import { prisma } from '../../database/db.js';
import { AttendanceStatus } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../shared/errors/index.js';
import { CommunicationService } from '../communication/communication.service.js';

export interface RecordAttendanceItemDto {
  enrollmentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface RecordBulkAttendanceDto {
  sectionId: string;
  date: string; // ISO date string 'YYYY-MM-DD'
  records: RecordAttendanceItemDto[];
}

export interface MonthlyRegisterQuery {
  sectionId: string;
  year: number;
  month: number; // 1-12
}

export class AttendanceService {
  /**
   * Helper to normalize a date string 'YYYY-MM-DD' to UTC midnight Date
   */
  private normalizeDate(dateStr: string): Date {
    const [yStr, mStr, dStr] = dateStr.split('-');
    if (!yStr || !mStr || !dStr) {
      throw new BadRequestError('Invalid date format. Expected YYYY-MM-DD', undefined, 'INVALID_DATE');
    }
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);
    const d = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    if (isNaN(d.getTime())) {
      throw new BadRequestError('Invalid date values provided', undefined, 'INVALID_DATE');
    }
    return d;
  }

  /**
   * Get attendance sheet for a specific section and date
   */
  async getAttendanceSheet(schoolId: string, sectionId: string, dateStr: string) {
    const targetDate = this.normalizeDate(dateStr);

    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId },
      include: { class: true },
    });

    if (!section) {
      throw new NotFoundError('Section not found in this school', 'SECTION_NOT_FOUND');
    }

    // Find active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!activeYear) {
      throw new BadRequestError('No active academic session configured for this school', undefined, 'NO_ACTIVE_ACADEMIC_YEAR');
    }

    // Retrieve active enrollments in this section
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        sectionId,
        academicYearId: activeYear.id,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            gender: true,
            photoUrl: true,
          },
        },
      },
      orderBy: [
        { rollNumber: 'asc' },
        { student: { firstName: 'asc' } },
      ],
    });

    // Find existing attendance records for these enrollments on the target date
    const enrollmentIds = enrollments.map((e) => e.id);
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        enrollmentId: { in: enrollmentIds },
        date: targetDate,
      },
    });

    const recordMap = new Map(existingRecords.map((r) => [r.enrollmentId, r]));

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let excusedCount = 0;

    const roster = enrollments.map((enrollment) => {
      const existing = recordMap.get(enrollment.id);
      const status: AttendanceStatus = existing?.status ?? AttendanceStatus.PRESENT;

      if (status === AttendanceStatus.PRESENT) presentCount++;
      else if (status === AttendanceStatus.ABSENT) absentCount++;
      else if (status === AttendanceStatus.LATE) lateCount++;
      else if (status === AttendanceStatus.HALF_DAY) halfDayCount++;
      else if (status === AttendanceStatus.EXCUSED) excusedCount++;

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        rollNumber: enrollment.rollNumber,
        admissionNumber: enrollment.student.admissionNumber,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        fullName: [enrollment.student.firstName, enrollment.student.middleName, enrollment.student.lastName]
          .filter(Boolean)
          .join(' '),
        gender: enrollment.student.gender,
        photoUrl: enrollment.student.photoUrl,
        status,
        remarks: existing?.remarks || null,
        isMarked: Boolean(existing),
      };
    });

    return {
      section: {
        id: section.id,
        name: section.name,
        className: section.class.name,
        classCode: section.class.code,
      },
      date: dateStr,
      isMarked: existingRecords.length > 0,
      totalStudents: enrollments.length,
      stats: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        halfDay: halfDayCount,
        excused: excusedCount,
        attendancePercentage:
          enrollments.length > 0 ? Math.round((presentCount / enrollments.length) * 100) : 0,
      },
      students: roster,
    };
  }

  /**
   * Bulk record or update attendance for a section on a date
   */
  async recordBulkAttendance(
    schoolId: string,
    dto: RecordBulkAttendanceDto,
    actorId: string,
    auditContext?: { ipAddress?: string; userAgent?: string },
  ) {
    const targetDate = this.normalizeDate(dto.date);

    if (!dto.records || !Array.isArray(dto.records) || dto.records.length === 0) {
      throw new BadRequestError('Records list cannot be empty', undefined, 'EMPTY_RECORDS');
    }

    const section = await prisma.section.findFirst({
      where: { id: dto.sectionId, schoolId },
      include: { class: true },
    });

    if (!section) {
      throw new NotFoundError('Section not found in this school', 'SECTION_NOT_FOUND');
    }

    // Verify all enrollments belong to this school and section
    const enrollmentIds = dto.records.map((r) => r.enrollmentId);
    const validEnrollments = await prisma.enrollment.findMany({
      where: {
        id: { in: enrollmentIds },
        schoolId,
        sectionId: dto.sectionId,
      },
      select: { id: true },
    });

    if (validEnrollments.length !== enrollmentIds.length) {
      throw new BadRequestError('One or more enrollments are invalid or do not belong to this section', undefined, 'INVALID_ENROLLMENTS');
    }

    // Atomic transaction for bulk upsert
    await prisma.$transaction(async (tx) => {
      for (const record of dto.records) {
        await tx.attendanceRecord.upsert({
          where: {
            enrollmentId_date: {
              enrollmentId: record.enrollmentId,
              date: targetDate,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks?.trim() || null,
            recordedById: actorId,
          },
          create: {
            schoolId,
            enrollmentId: record.enrollmentId,
            date: targetDate,
            status: record.status,
            remarks: record.remarks?.trim() || null,
            recordedById: actorId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId,
          action: 'ATTENDANCE_RECORDED',
          entityType: 'Attendance',
          entityId: dto.sectionId,
          diff: {
            sectionId: dto.sectionId,
            date: dto.date,
            recordsCount: dto.records.length,
          },
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
        },
      });
    });

    // Asynchronously dispatch attendance notifications to guardians for absent/late students
    for (const record of dto.records) {
      if (record.status === AttendanceStatus.ABSENT || record.status === AttendanceStatus.LATE) {
        CommunicationService.dispatchAttendanceAlert(
          schoolId,
          record.enrollmentId,
          record.status,
          targetDate,
        ).catch(() => {});
      }
    }

    return {
      success: true,
      count: dto.records.length,
      date: dto.date,
      sectionId: dto.sectionId,
    };
  }

  /**
   * Monthly Attendance Register with day-by-day matrix and student percentages
   */
  async getMonthlyRegister(schoolId: string, query: MonthlyRegisterQuery) {
    const { sectionId, year, month } = query;

    if (month < 1 || month > 12) {
      throw new BadRequestError('Month must be between 1 and 12', undefined, 'INVALID_MONTH');
    }

    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId },
      include: { class: true },
    });

    if (!section) {
      throw new NotFoundError('Section not found in this school', 'SECTION_NOT_FOUND');
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const nextMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endDate = new Date(nextMonth.getTime() - 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Active enrollments
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!activeYear) {
      throw new BadRequestError('No active academic session found', undefined, 'NO_ACTIVE_ACADEMIC_YEAR');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        sectionId,
        academicYearId: activeYear.id,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            photoUrl: true,
          },
        },
      },
      orderBy: [
        { rollNumber: 'asc' },
        { student: { firstName: 'asc' } },
      ],
    });

    const enrollmentIds = enrollments.map((e) => e.id);

    // Fetch all attendance records in this month range
    const records = await prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        enrollmentId: { in: enrollmentIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group records by enrollmentId
    const recordsByEnrollment = new Map<string, Map<string, AttendanceStatus>>();
    const uniqueDatesMarked = new Set<string>();

    for (const r of records) {
      const dateKey = r.date.toISOString().split('T')[0];
      if (!dateKey) continue;
      uniqueDatesMarked.add(dateKey);

      let studentMap = recordsByEnrollment.get(r.enrollmentId);
      if (!studentMap) {
        studentMap = new Map();
        recordsByEnrollment.set(r.enrollmentId, studentMap);
      }
      studentMap.set(dateKey, r.status);
    }

    const totalWorkingDays = uniqueDatesMarked.size;

    let aggregatePresent = 0;
    let aggregateWorkingDays = 0;

    const studentRegisters = enrollments.map((enrollment) => {
      const studentMap = recordsByEnrollment.get(enrollment.id) || new Map();
      const dailyAttendance: Record<string, AttendanceStatus | null> = {};

      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let halfDayDays = 0;

      // Fill each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const monthStr = month < 10 ? `0${month}` : `${month}`;
        const dateStr = `${year}-${monthStr}-${dayStr}`;

        const status = studentMap.get(dateStr) || null;
        dailyAttendance[dateStr] = status;

        if (status === AttendanceStatus.PRESENT) presentDays++;
        else if (status === AttendanceStatus.ABSENT) absentDays++;
        else if (status === AttendanceStatus.LATE) lateDays++;
        else if (status === AttendanceStatus.HALF_DAY) halfDayDays++;
      }

      const totalMarked = presentDays + absentDays + lateDays + halfDayDays;
      const effectivePresent = presentDays + lateDays + halfDayDays * 0.5;
      const percentage = totalMarked > 0 ? Math.round((effectivePresent / totalMarked) * 100) : 100;

      aggregatePresent += effectivePresent;
      aggregateWorkingDays += totalMarked;

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        rollNumber: enrollment.rollNumber,
        admissionNumber: enrollment.student.admissionNumber,
        studentName: [enrollment.student.firstName, enrollment.student.middleName, enrollment.student.lastName]
          .filter(Boolean)
          .join(' '),
        dailyAttendance,
        presentDays,
        absentDays,
        lateDays,
        halfDayDays,
        totalMarked,
        percentage,
        isBelowThreshold: totalMarked > 0 && percentage < 75,
      };
    });

    const classAveragePercentage =
      aggregateWorkingDays > 0 ? Math.round((aggregatePresent / aggregateWorkingDays) * 100) : 100;

    return {
      section: {
        id: section.id,
        name: section.name,
        className: section.class.name,
      },
      year,
      month,
      daysInMonth,
      totalWorkingDays,
      classAveragePercentage,
      students: studentRegisters,
    };
  }

  /**
   * Student 360 Attendance Profile Summary
   */
  async getStudentAttendanceSummary(schoolId: string, enrollmentId: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: true,
        class: true,
        section: true,
        academicYear: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment record not found', 'ENROLLMENT_NOT_FOUND');
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { schoolId, enrollmentId },
      orderBy: { date: 'desc' },
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let excused = 0;

    for (const r of records) {
      if (r.status === AttendanceStatus.PRESENT) present++;
      else if (r.status === AttendanceStatus.ABSENT) absent++;
      else if (r.status === AttendanceStatus.LATE) late++;
      else if (r.status === AttendanceStatus.HALF_DAY) halfDay++;
      else if (r.status === AttendanceStatus.EXCUSED) excused++;
    }

    const totalDays = records.length;
    const effectivePresent = present + late + halfDay * 0.5;
    const percentage = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 100;

    return {
      student: {
        id: enrollment.student.id,
        name: `${enrollment.student.firstName} ${enrollment.student.lastName}`.trim(),
        admissionNumber: enrollment.student.admissionNumber,
        className: enrollment.class.name,
        sectionName: enrollment.section.name,
      },
      totalDays,
      present,
      absent,
      late,
      halfDay,
      excused,
      percentage,
      isBelowThreshold: totalDays > 0 && percentage < 75,
      recentRecords: records.slice(0, 30).map((r) => ({
        id: r.id,
        date: r.date.toISOString().split('T')[0],
        status: r.status,
        remarks: r.remarks,
      })),
    };
  }
}

export const attendanceService = new AttendanceService();
