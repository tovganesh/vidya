import { PrismaClient, BoardType, AcademicStage, SubjectType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VidyaSetu Database Seeding...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Vidya Bharati Educational Trust',
      registrationNumber: 'TRUST/BLR/2012/8492',
    },
  });
  console.log(`✅ Organization seeded: ${org.name}`);

  // 2. School
  const school = await prisma.school.upsert({
    where: { code: 'VS-BLR-01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organizationId: org.id,
      name: 'VidyaSetu Academy, Bengaluru',
      code: 'VS-BLR-01',
      board: BoardType.CBSE,
      affiliationNumber: '830412',
      email: 'contact@vidyasetu.org',
      phone: '+91 80 2525 0142',
      currency: 'INR',
      address: {
        street: '14/B, 100ft Road, HAL 2nd Stage, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'India',
      },
      settings: {
        academicStartMonth: 6, // June start (South India convention)
        attendanceType: 'ONCE_DAILY',
        enableWebPush: true,
      },
    },
  });
  console.log(`✅ School seeded: ${school.name} (Code: ${school.code})`);

  // 3. Campus
  const campus = await prisma.campus.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      schoolId: school.id,
      name: 'Indiranagar Main Campus',
      address: {
        building: 'Main Administrative Block',
        floors: 4,
      },
    },
  });
  console.log(`✅ Campus seeded: ${campus.name}`);

  // 4. Academic Years (Current 2026-27, and 2025-26 archived)
  const ayCurrent = await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: '2026-2027',
      },
    },
    update: { isCurrent: true, status: 'ACTIVE' },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      schoolId: school.id,
      name: '2026-2027',
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2027-04-30T23:59:59Z'),
      status: 'ACTIVE',
      isCurrent: true,
    },
  });

  await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: '2025-2026',
      },
    },
    update: { isCurrent: false, status: 'CONCLUDED' },
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      schoolId: school.id,
      name: '2025-2026',
      startDate: new Date('2025-06-01T00:00:00Z'),
      endDate: new Date('2026-04-30T23:59:59Z'),
      status: 'CONCLUDED',
      isCurrent: false,
    },
  });
  console.log(`✅ Academic Year seeded: ${ayCurrent.name} (ACTIVE)`);

  // 5. Classes & Sections (Nursery to Class 12)
  const classConfigs = [
    { name: 'Nursery', code: 'NUR', stage: AcademicStage.PRE_PRIMARY, order: 0 },
    { name: 'LKG', code: 'LKG', stage: AcademicStage.PRE_PRIMARY, order: 1 },
    { name: 'UKG', code: 'UKG', stage: AcademicStage.PRE_PRIMARY, order: 2 },
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
    { name: 'Class 11', code: 'STD-11', stage: AcademicStage.HIGHER_SECONDARY, order: 13 },
    { name: 'Class 12', code: 'STD-12', stage: AcademicStage.HIGHER_SECONDARY, order: 14 },
  ];

  for (const cfg of classConfigs) {
    const cls = await prisma.class.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: cfg.code,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: cfg.name,
        code: cfg.code,
        stage: cfg.stage,
        orderIndex: cfg.order,
      },
    });

    // Create Sections A and B for each class
    for (const secName of ['A', 'B']) {
      await prisma.section.upsert({
        where: {
          classId_name: {
            classId: cls.id,
            name: secName,
          },
        },
        update: {},
        create: {
          schoolId: school.id,
          classId: cls.id,
          name: secName,
          roomNumber: `Room-${cfg.order + 1}${secName}`,
          capacity: 40,
        },
      });
    }
  }
  console.log('✅ Classes (Nursery–12) and Sections (A & B) seeded');

  // 6. Subjects Registry
  const subjectsData = [
    { name: 'English Language & Literature', code: 'ENG', type: SubjectType.THEORY },
    { name: 'Mathematics', code: 'MATH', type: SubjectType.THEORY },
    { name: 'Science', code: 'SCI', type: SubjectType.THEORY },
    { name: 'Social Science', code: 'SOC', type: SubjectType.THEORY },
    { name: 'Hindi Course A', code: 'HIN', type: SubjectType.THEORY },
    { name: 'Kannada (2nd Language)', code: 'KAN', type: SubjectType.THEORY },
    { name: 'Sanskrit', code: 'SAN', type: SubjectType.THEORY },
    { name: 'Computer Applications', code: 'CA', type: SubjectType.PRACTICAL },
    { name: 'Physical Education', code: 'PHE', type: SubjectType.CO_SCHOLASTIC },
    { name: 'Art & Craft', code: 'ART', type: SubjectType.CO_SCHOLASTIC },
  ];

  for (const sub of subjectsData) {
    await prisma.subject.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: sub.code,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: sub.name,
        code: sub.code,
        type: sub.type,
      },
    });
  }
  console.log(`✅ Subjects seeded: ${subjectsData.length} core and elective subjects`);

  // 7. System Roles
  const roles = [
    { name: 'SUPER_ADMIN', desc: 'Platform Super Administrator' },
    { name: 'SCHOOL_ADMIN', desc: 'School IT and Administrative Supervisor' },
    { name: 'PRINCIPAL', desc: 'Head of Institution and Academic Supervisor' },
    { name: 'VICE_PRINCIPAL', desc: 'Vice Principal & Senior Coordinator' },
    { name: 'TEACHER', desc: 'Classroom and Subject Educator' },
    { name: 'ACCOUNTANT', desc: 'Fee Collection and Accounts Manager' },
    { name: 'LIBRARIAN', desc: 'Library Operations Manager' },
    { name: 'TRANSPORT_MANAGER', desc: 'Fleet and Logistics Coordinator' },
    { name: 'HR_MANAGER', desc: 'Staff and Payroll Administrator' },
    { name: 'PARENT', desc: 'Guardian Portal Account' },
    { name: 'STUDENT', desc: 'Student Portal Account' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.desc },
      create: {
        name: r.name,
        description: r.desc,
        isSystem: true,
      },
    });
  }
  console.log(`✅ System Roles seeded: ${roles.length} roles`);

  // 8. Core Permissions
  const permissionsData = [
    { code: 'student:read', category: 'STUDENTS', desc: 'View student directory and 360 profile' },
    { code: 'student:write', category: 'STUDENTS', desc: 'Admit and modify student records' },
    { code: 'attendance:read', category: 'ATTENDANCE', desc: 'View attendance registers and analytics' },
    { code: 'attendance:mark', category: 'ATTENDANCE', desc: 'Record daily classroom attendance roll call' },
    { code: 'academics:read', category: 'ACADEMICS', desc: 'View academic structures, classes, and subjects' },
    { code: 'academics:write', category: 'ACADEMICS', desc: 'Manage curriculum, periods, and timetable' },
    { code: 'exam:marks_entry', category: 'EXAMS', desc: 'Enter and submit student examination marks' },
    { code: 'fee:read', category: 'FINANCE', desc: 'View fee structures and student dues' },
    { code: 'fee:collect', category: 'FINANCE', desc: 'Collect fee payments and issue receipts' },
    { code: 'school:manage', category: 'ADMIN', desc: 'Manage school configuration and academic sessions' },
    { code: 'user:manage', category: 'ADMIN', desc: 'Create and assign user accounts and roles' },
    { code: 'audit:read', category: 'ADMIN', desc: 'Inspect immutable system audit trail' },
  ];

  for (const p of permissionsData) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.desc, category: p.category },
      create: {
        code: p.code,
        category: p.category,
        description: p.desc,
      },
    });
  }
  console.log(`✅ Permissions seeded: ${permissionsData.length} permission keys`);

  // 9. Assign Permissions to Roles
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SCHOOL_ADMIN' } });
  const teacherRole = await prisma.role.findUniqueOrThrow({ where: { name: 'TEACHER' } });
  const accountantRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ACCOUNTANT' } });

  const allPerms = await prisma.permission.findMany();

  // Admin gets all permissions
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: p.id,
      },
    });
  }

  // Teacher gets attendance, student:read, exam:marks_entry
  const teacherPermCodes = ['student:read', 'attendance:read', 'attendance:mark', 'academics:read', 'exam:marks_entry'];
  for (const code of teacherPermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: teacherRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: teacherRole.id,
          permissionId: p.id,
        },
      });
    }
  }

  // Accountant gets fee:read, fee:collect, student:read
  const accountantPermCodes = ['student:read', 'fee:read', 'fee:collect'];
  for (const code of accountantPermCodes) {
    const p = allPerms.find((item) => item.code === code);
    if (p) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: accountantRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: accountantRole.id,
          permissionId: p.id,
        },
      });
    }
  }
  console.log('✅ Role-Permission mappings assigned');

  // 10. Seed Realistic Demo Users (Password: VidyaSetu@2026)
  const defaultPasswordHash = await bcrypt.hash('VidyaSetu@2026', 10);

  const demoUsers = [
    {
      email: 'superadmin@vidyasetu.org',
      firstName: 'Vikram',
      lastName: 'Aditya',
      role: UserRole.SUPER_ADMIN,
      phone: '+91 98000 00001',
      schoolId: null,
    },
    {
      email: 'principal@vidyasetu.org',
      firstName: 'Dr. Ramesh',
      lastName: 'Sharma',
      role: UserRole.PRINCIPAL,
      phone: '+91 98000 00002',
      schoolId: school.id,
    },
    {
      email: 'admin@vidyasetu.org',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      role: UserRole.SCHOOL_ADMIN,
      phone: '+91 98000 00003',
      schoolId: school.id,
    },
    {
      email: 'teacher@vidyasetu.org',
      firstName: 'Ananya',
      lastName: 'Rao',
      role: UserRole.TEACHER,
      phone: '+91 98000 00004',
      schoolId: school.id,
    },
    {
      email: 'accountant@vidyasetu.org',
      firstName: 'Suresh',
      lastName: 'Patel',
      role: UserRole.ACCOUNTANT,
      phone: '+91 98000 00005',
      schoolId: school.id,
    },
    {
      email: 'parent@vidyasetu.org',
      firstName: 'Priya',
      lastName: 'Sundaram',
      role: UserRole.PARENT,
      phone: '+91 98000 00006',
      schoolId: school.id,
    },
    {
      email: 'student@vidyasetu.org',
      firstName: 'Aarav',
      lastName: 'Sundaram',
      role: UserRole.STUDENT,
      phone: '+91 98000 00007',
      schoolId: school.id,
    },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        primaryRole: u.role,
        passwordHash: defaultPasswordHash,
      },
      create: {
        schoolId: u.schoolId,
        email: u.email,
        phone: u.phone,
        passwordHash: defaultPasswordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        primaryRole: u.role,
        status: 'ACTIVE',
      },
    });

    // Assign role mapping
    const assignedRole = await prisma.role.findUnique({ where: { name: u.role } });
    if (assignedRole) {
      await prisma.userRoleAssignment.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: assignedRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: assignedRole.id,
        },
      });
    }
  }
  console.log(`✅ Demo accounts seeded (${demoUsers.length} users with password: VidyaSetu@2026)`);

  // 11. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      schoolId: school.id,
      action: 'INITIAL_SEED_COMPLETED',
      entityType: 'System',
      entityId: school.id,
      diff: {
        message: 'Initial demo school setup completed for VidyaSetu Academy, Bengaluru',
        academicYear: '2026-2027',
        board: 'CBSE',
      },
    },
  });
  console.log('✅ Audit log entry recorded');

  console.log('✨ VidyaSetu database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
