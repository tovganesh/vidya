import { prisma } from '../../database/db.js';
import { PeopleStats, StudentStatus, TeacherStatus, Gender } from './people.types.js';

export class PeopleService {
  /**
   * Aggregate directory-wide statistics.
   */
  async getPeopleStats(schoolId: string): Promise<PeopleStats> {
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });

    const [
      totalStudents,
      enrolledStudents,
      totalTeachers,
      activeTeachers,
      totalGuardians,
      maleStudents,
      femaleStudents,
      otherStudents,
      classesWithEnrollments,
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId, deletedAt: null } }),
      prisma.student.count({ where: { schoolId, status: StudentStatus.ENROLLED, deletedAt: null } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId, status: TeacherStatus.ACTIVE } }),
      prisma.guardian.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, gender: Gender.MALE, deletedAt: null } }),
      prisma.student.count({ where: { schoolId, gender: Gender.FEMALE, deletedAt: null } }),
      prisma.student.count({ where: { schoolId, gender: Gender.OTHER, deletedAt: null } }),
      prisma.class.findMany({
        where: { schoolId },
        orderBy: { orderIndex: 'asc' },
        include: {
          enrollments: {
            where: activeYear ? { academicYearId: activeYear.id, status: 'ACTIVE' } : undefined,
            select: { id: true },
          },
        },
      }),
    ]);

    const activeEnrollments = classesWithEnrollments.reduce(
      (acc, cls) => acc + cls.enrollments.length,
      0,
    );

    const classDistribution = classesWithEnrollments.map((cls) => ({
      classId: cls.id,
      className: cls.name,
      studentCount: cls.enrollments.length,
    }));

    return {
      totalStudents,
      enrolledStudents,
      totalTeachers,
      activeTeachers,
      totalGuardians,
      activeEnrollments,
      genderRatio: {
        male: maleStudents,
        female: femaleStudents,
        other: otherStudents,
      },
      classDistribution,
    };
  }
}

export const peopleService = new PeopleService();
