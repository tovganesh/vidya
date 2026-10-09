import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, checkDatabaseConnection } from '../src/database/db.js';
import { Prisma } from '@prisma/client';

describe('Database Layer & Seed Verification (Milestone 2)', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should verify live PostgreSQL connection and latency', async () => {
    const health = await checkDatabaseConnection();
    expect(health.connected).toBe(true);
    expect(typeof health.latencyMs).toBe('number');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should find the seeded school: Vidya Academy, Bengaluru', async () => {
    const school = await prisma.school.findUnique({
      where: { code: 'VS-BLR-01' },
      include: { organization: true },
    });

    expect(school).not.toBeNull();
    expect(school?.name).toBe('Vidya Academy, Bengaluru');
    expect(school?.board).toBe('CBSE');
    expect(school?.currency).toBe('INR');
    expect(school?.organization?.name).toBe('Vidya Bharati Educational Trust');
  });

  it('should have exactly one active current academic year', async () => {
    const school = await prisma.school.findUniqueOrThrow({ where: { code: 'VS-BLR-01' } });
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, isCurrent: true },
    });

    expect(currentYear).not.toBeNull();
    expect(currentYear?.name).toBe('2026-2027');
    expect(currentYear?.status).toBe('ACTIVE');
  });

  it('should verify 15 classes from Nursery through Class 12 with sections', async () => {
    const school = await prisma.school.findUniqueOrThrow({ where: { code: 'VS-BLR-01' } });
    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
      include: { sections: true },
      orderBy: { orderIndex: 'asc' },
    });

    expect(classes.length).toBe(15);
    expect(classes[0]?.code).toBe('NUR');
    expect(classes[14]?.code).toBe('STD-12');

    // Every class must have Sections A and B
    for (const cls of classes) {
      expect(cls.sections.length).toBe(2);
      const sectionNames = cls.sections.map((s) => s.name).sort();
      expect(sectionNames).toEqual(['A', 'B']);
    }
  });

  it('should verify all 11 system roles exist', async () => {
    const roleCount = await prisma.role.count();
    expect(roleCount).toBe(11);

    const superAdmin = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    expect(superAdmin).not.toBeNull();
  });

  it('should verify demo users with proper role assignments', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@vidya.org' },
      include: { roles: { include: { role: true } } },
    });

    expect(admin).not.toBeNull();
    expect(admin?.primaryRole).toBe('SCHOOL_ADMIN');
    expect(admin?.roles.some((r) => r.role.name === 'SCHOOL_ADMIN')).toBe(true);
  });

  it('should reject creating an entity with a non-existent foreign key (referential integrity)', async () => {
    const nonExistentSchoolId = '99999999-9999-9999-9999-999999999999';

    await expect(
      prisma.academicYear.create({
        data: {
          schoolId: nonExistentSchoolId,
          name: '3000-3001',
          startDate: new Date(),
          endDate: new Date(),
        },
      }),
    ).rejects.toThrowError(Prisma.PrismaClientKnownRequestError);
  });

  it('should reject creating a duplicate class code within the same school (unique constraint)', async () => {
    const school = await prisma.school.findUniqueOrThrow({ where: { code: 'VS-BLR-01' } });

    await expect(
      prisma.class.create({
        data: {
          schoolId: school.id,
          name: 'Duplicate Class 10',
          code: 'STD-10', // already exists in seed
          stage: 'SECONDARY',
          orderIndex: 99,
        },
      }),
    ).rejects.toThrowError(Prisma.PrismaClientKnownRequestError);
  });
});
