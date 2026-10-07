import { prisma } from '../../database/db.js';
import { NotFoundError } from '../../shared/errors/index.js';

export interface GetGuardiansQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export class GuardiansService {
  /**
   * Get paginated guardians with linked students.
   */
  async getGuardians(schoolId: string, query: GetGuardiansQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { occupation: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, guardians] = await Promise.all([
      prisma.guardian.count({ where }),
      prisma.guardian.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  admissionNumber: true,
                  firstName: true,
                  lastName: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = guardians.map((g) => ({
      id: g.id,
      schoolId: g.schoolId,
      name: g.name,
      relationship: g.relationship,
      phone: g.phone,
      email: g.email,
      occupation: g.occupation,
      annualIncome: g.annualIncome,
      address: g.address,
      createdAt: g.createdAt,
      children: g.students.map((sg) => ({
        studentId: sg.student.id,
        admissionNumber: sg.student.admissionNumber,
        fullName: `${sg.student.firstName} ${sg.student.lastName}`,
        status: sg.student.status,
        isPrimaryContact: sg.isPrimaryContact,
        isAuthorizedPickup: sg.isAuthorizedPickup,
        receivesNotifications: sg.receivesNotifications,
      })),
      childrenCount: g.students.length,
    }));

    return {
      guardians: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get guardian by ID.
   */
  async getGuardianById(schoolId: string, guardianId: string) {
    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, schoolId },
      include: {
        students: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { academicYear: { isCurrent: true } },
                  take: 1,
                  include: {
                    class: true,
                    section: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundError(`Guardian with ID '${guardianId}' not found`, 'GUARDIAN_NOT_FOUND');
    }

    return {
      ...guardian,
      children: guardian.students.map((sg) => {
        const activeEnrollment = sg.student.enrollments[0] || null;
        return {
          studentId: sg.student.id,
          admissionNumber: sg.student.admissionNumber,
          fullName: `${sg.student.firstName} ${sg.student.lastName}`,
          className: activeEnrollment?.class.name || null,
          sectionName: activeEnrollment?.section.name || null,
          rollNumber: activeEnrollment?.rollNumber || null,
          isPrimaryContact: sg.isPrimaryContact,
          isAuthorizedPickup: sg.isAuthorizedPickup,
          receivesNotifications: sg.receivesNotifications,
        };
      }),
    };
  }
}

export const guardiansService = new GuardiansService();
