import {
  PrismaClient,
  BoardType,
  AcademicStage,
  SubjectType,
  UserRole,
  Gender,
  BloodGroup,
  StudentCategory,
  StudentStatus,
  GuardianRelationship,
  EnrollmentStatus,
  TeacherStatus,
  AttendanceStatus,
  DayOfWeek,
  AnnouncementPriority,
  AnnouncementAudience,
  NotificationType,
  ExamTermType,
  AssessmentType,
} from '@prisma/client';
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

  const ayPast = await prisma.academicYear.upsert({
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

  // 11. Teachers
  const teacherUser = await prisma.user.findUnique({ where: { email: 'teacher@vidyasetu.org' } });
  if (teacherUser) {
    await prisma.teacher.upsert({
      where: { schoolId_employeeCode: { schoolId: school.id, employeeCode: 'EMP-2023-0101' } },
      update: {},
      create: {
        schoolId: school.id,
        userId: teacherUser.id,
        employeeCode: 'EMP-2023-0101',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        qualification: 'M.Sc (Mathematics), B.Ed',
        specialization: 'Secondary Mathematics & Statistics',
        phone: '+91 98000 00004',
        status: TeacherStatus.ACTIVE,
        joiningDate: new Date('2023-06-01T00:00:00Z'),
      },
    });
  }

  // 12. Guardians (Parents)
  const parentUser = await prisma.user.findUnique({ where: { email: 'parent@vidyasetu.org' } });
  const guardianFather = await prisma.guardian.upsert({
    where: { id: '00000000-0000-0000-0000-000000000050' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000050',
      schoolId: school.id,
      userId: parentUser ? parentUser.id : undefined,
      name: 'Suresh Kumar',
      relationship: GuardianRelationship.FATHER,
      phone: '+91 98000 00005',
      email: 'parent@vidyasetu.org',
      occupation: 'Software Engineer',
      annualIncome: '1800000',
      address: {
        street: 'Flat 302, Palm Meadows, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560066',
      },
    },
  });

  const guardianMother = await prisma.guardian.upsert({
    where: { id: '00000000-0000-0000-0000-000000000051' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000051',
      schoolId: school.id,
      name: 'Sunita Kumar',
      relationship: GuardianRelationship.MOTHER,
      phone: '+91 98000 00015',
      email: 'sunita.k@example.com',
      occupation: 'Architect',
      annualIncome: '1600000',
    },
  });

  // 13. Students & Lifelong Trajectory
  const studentUser = await prisma.user.findUnique({ where: { email: 'student@vidyasetu.org' } });
  const student1 = await prisma.student.upsert({
    where: { schoolId_admissionNumber: { schoolId: school.id, admissionNumber: 'VS-2024-0101' } },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000060',
      schoolId: school.id,
      userId: studentUser ? studentUser.id : undefined,
      admissionNumber: 'VS-2024-0101',
      admissionDate: new Date('2024-06-01T00:00:00Z'),
      firstName: 'Aarav',
      middleName: 'S',
      lastName: 'Kumar',
      gender: Gender.MALE,
      dateOfBirth: new Date('2011-04-14T00:00:00Z'),
      bloodGroup: BloodGroup.O_POS,
      apaarId: '984512345678',
      aadhaarLastFour: '4512',
      nationality: 'Indian',
      category: StudentCategory.GENERAL,
      currentAddress: {
        street: 'Flat 302, Palm Meadows, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560066',
      },
      status: StudentStatus.ENROLLED,
    },
  });

  // Link Aarav to Guardians
  await prisma.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: student1.id, guardianId: guardianFather.id } },
    update: {},
    create: {
      studentId: student1.id,
      guardianId: guardianFather.id,
      isPrimaryContact: true,
      isAuthorizedPickup: true,
      receivesNotifications: true,
    },
  });

  await prisma.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: student1.id, guardianId: guardianMother.id } },
    update: {},
    create: {
      studentId: student1.id,
      guardianId: guardianMother.id,
      isPrimaryContact: false,
      isAuthorizedPickup: true,
      receivesNotifications: true,
    },
  });

  // Additional Students
  const student2 = await prisma.student.upsert({
    where: { schoolId_admissionNumber: { schoolId: school.id, admissionNumber: 'VS-2024-0102' } },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000061',
      schoolId: school.id,
      admissionNumber: 'VS-2024-0102',
      admissionDate: new Date('2024-06-01T00:00:00Z'),
      firstName: 'Diya',
      lastName: 'Sharma',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('2011-08-22T00:00:00Z'),
      bloodGroup: BloodGroup.B_POS,
      apaarId: '876543210987',
      category: StudentCategory.GENERAL,
      status: StudentStatus.ENROLLED,
    },
  });

  const student3 = await prisma.student.upsert({
    where: { schoolId_admissionNumber: { schoolId: school.id, admissionNumber: 'VS-2024-0103' } },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000062',
      schoolId: school.id,
      admissionNumber: 'VS-2024-0103',
      admissionDate: new Date('2024-06-05T00:00:00Z'),
      firstName: 'Rohan',
      lastName: 'Verma',
      gender: Gender.MALE,
      dateOfBirth: new Date('2011-01-10T00:00:00Z'),
      bloodGroup: BloodGroup.A_POS,
      apaarId: '654321098765',
      category: StudentCategory.OBC,
      status: StudentStatus.ENROLLED,
    },
  });

  console.log('✅ Students & Guardians seeded');

  // 14. Enrollments (Historical 2025-26 & Current 2026-27)
  const class9 = await prisma.class.findFirst({ where: { schoolId: school.id, code: 'STD-09' } });
  const class10 = await prisma.class.findFirst({ where: { schoolId: school.id, code: 'STD-10' } });
  const section9A = class9 ? await prisma.section.findFirst({ where: { classId: class9.id, name: 'A' } }) : null;
  const section10A = class10 ? await prisma.section.findFirst({ where: { classId: class10.id, name: 'A' } }) : null;

  if (class9 && section9A) {
    // Historical 2025-26 Enrollment for Aarav (Promoted)
    await prisma.enrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: student1.id,
          academicYearId: ayPast.id,
        },
      },
      update: {
        classId: class9.id,
        sectionId: section9A.id,
        rollNumber: 15,
        status: EnrollmentStatus.PROMOTED,
      },
      create: {
        schoolId: school.id,
        studentId: student1.id,
        academicYearId: ayPast.id,
        classId: class9.id,
        sectionId: section9A.id,
        rollNumber: 15,
        status: EnrollmentStatus.PROMOTED,
        remarks: 'Promoted to Class 10 with distinction',
      },
    });
  }

  if (class10 && section10A) {
    // Current 2026-27 Enrollments
    await prisma.enrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: student1.id,
          academicYearId: ayCurrent.id,
        },
      },
      update: {
        classId: class10.id,
        sectionId: section10A.id,
        rollNumber: 1,
        status: EnrollmentStatus.ACTIVE,
      },
      create: {
        schoolId: school.id,
        studentId: student1.id,
        academicYearId: ayCurrent.id,
        classId: class10.id,
        sectionId: section10A.id,
        rollNumber: 1,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    await prisma.enrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: student2.id,
          academicYearId: ayCurrent.id,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        studentId: student2.id,
        academicYearId: ayCurrent.id,
        classId: class10.id,
        sectionId: section10A.id,
        rollNumber: 2,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    await prisma.enrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: student3.id,
          academicYearId: ayCurrent.id,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        studentId: student3.id,
        academicYearId: ayCurrent.id,
        classId: class10.id,
        sectionId: section10A.id,
        rollNumber: 3,
        status: EnrollmentStatus.ACTIVE,
      },
    });
  }
  console.log('✅ Enrollments seeded (Active & Historical Multi-Year)');

  // 15. Standard Indian School Periods
  const periodsData = [
    { periodNumber: 0, name: 'Morning Assembly', startTime: '08:30', endTime: '08:50', isBreak: true },
    { periodNumber: 1, name: 'Period 1', startTime: '08:50', endTime: '09:35', isBreak: false },
    { periodNumber: 2, name: 'Period 2', startTime: '09:35', endTime: '10:20', isBreak: false },
    { periodNumber: 3, name: 'Short Break', startTime: '10:20', endTime: '10:35', isBreak: true },
    { periodNumber: 4, name: 'Period 3', startTime: '10:35', endTime: '11:20', isBreak: false },
    { periodNumber: 5, name: 'Period 4', startTime: '11:20', endTime: '12:05', isBreak: false },
    { periodNumber: 6, name: 'Lunch Break', startTime: '12:05', endTime: '12:45', isBreak: true },
    { periodNumber: 7, name: 'Period 5', startTime: '12:45', endTime: '13:30', isBreak: false },
    { periodNumber: 8, name: 'Period 6', startTime: '13:30', endTime: '14:15', isBreak: false },
    { periodNumber: 9, name: 'Period 7', startTime: '14:15', endTime: '15:00', isBreak: false },
  ];

  const seededPeriods = [];
  for (const p of periodsData) {
    const period = await prisma.period.upsert({
      where: {
        schoolId_periodNumber: {
          schoolId: school.id,
          periodNumber: p.periodNumber,
        },
      },
      update: {
        name: p.name,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
      },
      create: {
        schoolId: school.id,
        name: p.name,
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
      },
    });
    seededPeriods.push(period);
  }
  console.log(`✅ Standard School Periods seeded (${seededPeriods.length} periods & breaks)`);

  // 16. Teacher Allocations
  const teacher = await prisma.teacher.findFirst({ where: { schoolId: school.id } });
  const mathSubject = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'MATH' } });
  const engSubject = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'ENG' } });
  const sciSubject = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'SCI' } });

  if (teacher && class10 && section10A) {
    await prisma.teacherAllocation.deleteMany({
      where: {
        schoolId: school.id,
        teacherId: teacher.id,
        academicYearId: ayCurrent.id,
        sectionId: section10A.id,
      },
    });

    await prisma.teacherAllocation.create({
      data: {
        schoolId: school.id,
        teacherId: teacher.id,
        academicYearId: ayCurrent.id,
        classId: class10.id,
        sectionId: section10A.id,
        subjectId: mathSubject?.id,
        isClassTeacher: true,
      },
    });
    console.log('✅ Class Teacher Allocation seeded for Class 10-A (Rajesh Sharma)');
  }

  // 17. Weekly Timetable Slots for Class 10-A
  if (class10 && section10A) {
    const days: DayOfWeek[] = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    const teachingPeriods = seededPeriods.filter((p) => !p.isBreak);
    const subjectsCycle = [mathSubject, sciSubject, engSubject].filter(Boolean);

    for (const day of days) {
      for (let i = 0; i < teachingPeriods.length; i++) {
        const period = teachingPeriods[i];
        const sub = subjectsCycle[(i + days.indexOf(day)) % subjectsCycle.length];
        const assignedTeacher = sub?.code === 'MATH' && teacher ? teacher.id : null;

        await prisma.timetableSlot.upsert({
          where: {
            sectionId_academicYearId_dayOfWeek_periodId: {
              sectionId: section10A.id,
              academicYearId: ayCurrent.id,
              dayOfWeek: day,
              periodId: period.id,
            },
          },
          update: {
            subjectId: sub?.id,
            teacherId: assignedTeacher,
            roomNumber: section10A.roomNumber || 'Room-10A',
          },
          create: {
            schoolId: school.id,
            academicYearId: ayCurrent.id,
            classId: class10.id,
            sectionId: section10A.id,
            dayOfWeek: day,
            periodId: period.id,
            subjectId: sub?.id,
            teacherId: assignedTeacher,
            roomNumber: section10A.roomNumber || 'Room-10A',
          },
        });
      }
    }
    console.log('✅ Weekly Timetable slots seeded for Class 10-A (Mon–Sat)');
  }

  // 18. Daily Attendance Records for Class 10-A
  if (section10A) {
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId: section10A.id, academicYearId: ayCurrent.id },
    });

    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@vidyasetu.org' } });

    const dates = [
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-02T00:00:00Z'),
      new Date('2026-10-05T00:00:00Z'),
      new Date('2026-10-06T00:00:00Z'),
      new Date('2026-10-07T00:00:00Z'),
    ];

    for (const d of dates) {
      for (const enr of enrollments) {
        let status = AttendanceStatus.PRESENT;
        let remarks: string | null = null;
        if (enr.rollNumber === 3 && d.toISOString().startsWith('2026-10-05')) {
          status = AttendanceStatus.ABSENT;
          remarks = 'Sick leave requested by parent';
        } else if (enr.rollNumber === 2 && d.toISOString().startsWith('2026-10-06')) {
          status = AttendanceStatus.LATE;
          remarks = 'School bus delayed due to traffic';
        }

        await prisma.attendanceRecord.upsert({
          where: {
            enrollmentId_date: {
              enrollmentId: enr.id,
              date: d,
            },
          },
          update: {
            status,
            remarks,
          },
          create: {
            schoolId: school.id,
            enrollmentId: enr.id,
            date: d,
            status,
            remarks,
            recordedById: adminUser?.id,
          },
        });
      }
    }
    console.log('✅ Daily Attendance Records seeded for Class 10-A');
  }

  // 19. School Announcements (Milestone 7)
  const commPrincipalUser = await prisma.user.findUnique({ where: { email: 'principal@vidyasetu.org' } });
  const commTeacherUser = await prisma.user.findUnique({ where: { email: 'teacher@vidyasetu.org' } });
  const commParentUser = await prisma.user.findUnique({ where: { email: 'parent@vidyasetu.org' } });
  const commAdminUser = await prisma.user.findUnique({ where: { email: 'admin@vidyasetu.org' } });

  const ann1 = await prisma.announcement.upsert({
    where: { id: '00000000-0000-0000-0000-000000000091' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000091',
      schoolId: school.id,
      title: 'Annual Sports Day 2026-27: Registration & Track Events',
      content: 'We are delighted to announce that Vidya Academy Annual Athletic Meet will be held on November 14, 2026. All students from Class 1 to 12 can register for track and field events with their respective house captains.',
      priority: AnnouncementPriority.NORMAL,
      targetAudience: AnnouncementAudience.ALL_SCHOOL,
      authorId: commPrincipalUser?.id || commAdminUser!.id,
      isPublished: true,
      publishedAt: new Date('2026-10-01T08:30:00Z'),
    },
  });

  const ann2 = await prisma.announcement.upsert({
    where: { id: '00000000-0000-0000-0000-000000000092' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000092',
      schoolId: school.id,
      title: 'Urgent Weather Advisory: Heavy Rainfall & Safety Protocols',
      content: 'In accordance with the district administration advisory for heavy monsoon rains, school transport routes will operate 30 minutes earlier in the afternoon. Parents are requested to track the bus alerts on the portal.',
      priority: AnnouncementPriority.URGENT,
      targetAudience: AnnouncementAudience.ALL_SCHOOL,
      authorId: commAdminUser!.id,
      isPublished: true,
      publishedAt: new Date('2026-10-06T06:00:00Z'),
    },
  });

  const ann3 = await prisma.announcement.upsert({
    where: { id: '00000000-0000-0000-0000-000000000093' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000093',
      schoolId: school.id,
      title: 'Class 10 CBSE Pre-Board Examination Schedule Released',
      content: 'The date sheet for CBSE Class 10 Pre-Board Assessment has been published. Mathematics Paper 1 will be held on October 25, followed by Science on October 28. Detailed syllabus breakdown is available in the academic section.',
      priority: AnnouncementPriority.NORMAL,
      targetAudience: AnnouncementAudience.SPECIFIC_CLASSES,
      targetClassIds: [class10!.id],
      authorId: commTeacherUser?.id || commAdminUser!.id,
      isPublished: true,
      publishedAt: new Date('2026-10-07T10:00:00Z'),
    },
  });

  const ann4 = await prisma.announcement.upsert({
    where: { id: '00000000-0000-0000-0000-000000000094' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000094',
      schoolId: school.id,
      title: 'Faculty Council: Term 1 Academic Progress & Remedial Classes',
      content: 'All secondary and senior secondary teachers are requested to attend the Term 1 progress evaluation meeting on Friday at 3:30 PM in the Conference Hall.',
      priority: AnnouncementPriority.NORMAL,
      targetAudience: AnnouncementAudience.TEACHERS_ONLY,
      authorId: commPrincipalUser?.id || commAdminUser!.id,
      isPublished: true,
      publishedAt: new Date('2026-10-07T14:00:00Z'),
    },
  });
  console.log('✅ Announcements seeded (All-School, Urgent, Class 10, Staff-Only)');

  // 20. In-App Notifications
  if (commParentUser) {
    await prisma.notification.upsert({
      where: { id: '00000000-0000-0000-0000-000000000081' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000081',
        schoolId: school.id,
        userId: commParentUser.id,
        title: 'Daily Attendance Update: Present',
        body: 'Aarav Sharma was marked PRESENT in Class 10-A for today (07 Oct 2026).',
        type: NotificationType.ATTENDANCE_ALERT,
        data: { link: '/attendance' },
        isRead: false,
      },
    });

    await prisma.notification.upsert({
      where: { id: '00000000-0000-0000-0000-000000000082' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000082',
        schoolId: school.id,
        userId: commParentUser.id,
        title: 'Urgent Weather Advisory Published',
        body: 'School transport routes will operate 30 minutes earlier today due to heavy monsoon rains.',
        type: NotificationType.ANNOUNCEMENT,
        data: { announcementId: ann2.id, link: '/announcements' },
        isRead: false,
      },
    });

    await prisma.notification.upsert({
      where: { id: '00000000-0000-0000-0000-000000000083' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000083',
        schoolId: school.id,
        userId: commParentUser.id,
        title: 'Class 10-A Timetable Updated',
        body: 'New timetable schedule for Academic Year 2026-27 is now active.',
        type: NotificationType.TIMETABLE_UPDATE,
        data: { link: '/timetable' },
        isRead: true,
        readAt: new Date('2026-10-07T12:00:00Z'),
      },
    });
  }

  if (commAdminUser) {
    await prisma.notification.upsert({
      where: { id: '00000000-0000-0000-0000-000000000084' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000084',
        schoolId: school.id,
        userId: commAdminUser.id,
        title: 'Daily Attendance Roll Call Complete',
        body: 'Attendance for Class 10 Section A has been submitted by Rajesh Sharma (Teacher).',
        type: NotificationType.ATTENDANCE_ALERT,
        data: { link: '/attendance/register' },
        isRead: false,
      },
    });
  }
  console.log('✅ In-App Notifications seeded');

  // 21. Sample Push Subscription
  if (commParentUser) {
    await prisma.pushSubscription.upsert({
      where: { endpoint: 'https://fcm.googleapis.com/fcm/send/demo-parent-subscription-token-123' },
      update: {},
      create: {
        schoolId: school.id,
        userId: commParentUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/demo-parent-subscription-token-123',
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVYOISxuj12ScpqqDTMR21WvKVW82K_6OO1aswQW7A',
        auth: 'tBHItJI5svbpez7KI4CCXg',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      },
    });
    console.log('✅ Sample Web Push Subscription registered');
  }

  // 22. CBSE 9-Point Grading Scale (Milestone 8)
  const cbseScales = [
    { grade: 'A1', min: 91.0, max: 100.0, gp: 10.0, desc: 'Outstanding' },
    { grade: 'A2', min: 81.0, max: 90.99, gp: 9.0, desc: 'Excellent' },
    { grade: 'B1', min: 71.0, max: 80.99, gp: 8.0, desc: 'Very Good' },
    { grade: 'B2', min: 61.0, max: 70.99, gp: 7.0, desc: 'Good' },
    { grade: 'C1', min: 51.0, max: 60.99, gp: 6.0, desc: 'Fair' },
    { grade: 'C2', min: 41.0, max: 50.99, gp: 5.0, desc: 'Average' },
    { grade: 'D',  min: 33.0, max: 40.99, gp: 4.0, desc: 'Pass' },
    { grade: 'E',  min: 0.0,  max: 32.99, gp: 0.0, desc: 'Essential Repeat' },
  ];

  for (const s of cbseScales) {
    await prisma.gradingScale.upsert({
      where: { schoolId_grade: { schoolId: school.id, grade: s.grade } },
      update: {},
      create: {
        schoolId: school.id,
        name: 'CBSE 9-Point Scale',
        grade: s.grade,
        minPercentage: s.min,
        maxPercentage: s.max,
        gradePoint: s.gp,
        description: s.desc,
      },
    });
  }
  console.log('✅ CBSE 9-Point Grading Scales seeded');

  // 23. Exam Terms (Term 1 & Term 2)
  const term1 = await prisma.examTerm.upsert({
    where: {
      schoolId_academicYearId_name: {
        schoolId: school.id,
        academicYearId: ayCurrent.id,
        name: 'Term 1 (Mid-Term Assessment)',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      schoolId: school.id,
      academicYearId: ayCurrent.id,
      name: 'Term 1 (Mid-Term Assessment)',
      type: ExamTermType.TERM_1,
      startDate: new Date('2026-09-15T00:00:00Z'),
      endDate: new Date('2026-09-30T00:00:00Z'),
      isCurrent: true,
    },
  });

  await prisma.examTerm.upsert({
    where: {
      schoolId_academicYearId_name: {
        schoolId: school.id,
        academicYearId: ayCurrent.id,
        name: 'Term 2 (Annual Assessment)',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      schoolId: school.id,
      academicYearId: ayCurrent.id,
      name: 'Term 2 (Annual Assessment)',
      type: ExamTermType.TERM_2,
      startDate: new Date('2027-02-15T00:00:00Z'),
      endDate: new Date('2027-03-05T00:00:00Z'),
      isCurrent: false,
    },
  });

  // 24. Class 10 Mid-Term Examination & Subject Assessments
  if (class10) {
    const examClass10 = await prisma.exam.upsert({
      where: {
        termId_classId_name: {
          termId: term1.id,
          classId: class10.id,
          name: 'Class 10 Mid-Term Examination 2026',
        },
      },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000103',
        schoolId: school.id,
        termId: term1.id,
        classId: class10.id,
        name: 'Class 10 Mid-Term Examination 2026',
        startDate: new Date('2026-09-15T00:00:00Z'),
        endDate: new Date('2026-09-30T00:00:00Z'),
      },
    });

    const subEng = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'ENG' } });
    const subMath = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'MATH' } });
    const subSci = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'SCI' } });
    const subSoc = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'SOC' } });
    const subHin = await prisma.subject.findFirst({ where: { schoolId: school.id, code: 'HIN' } });

    const assessmentSpecs = [
      { sub: subEng, type: AssessmentType.THEORY, max: 80, pass: 26, date: '2026-09-16' },
      { sub: subEng, type: AssessmentType.INTERNAL_ASSESSMENT, max: 20, pass: 7, date: '2026-09-17' },
      { sub: subMath, type: AssessmentType.THEORY, max: 80, pass: 26, date: '2026-09-19' },
      { sub: subMath, type: AssessmentType.INTERNAL_ASSESSMENT, max: 20, pass: 7, date: '2026-09-20' },
      { sub: subSci, type: AssessmentType.THEORY, max: 80, pass: 26, date: '2026-09-22' },
      { sub: subSci, type: AssessmentType.PRACTICAL, max: 20, pass: 7, date: '2026-09-23' },
      { sub: subSoc, type: AssessmentType.THEORY, max: 80, pass: 26, date: '2026-09-25' },
      { sub: subSoc, type: AssessmentType.INTERNAL_ASSESSMENT, max: 20, pass: 7, date: '2026-09-26' },
      { sub: subHin, type: AssessmentType.THEORY, max: 80, pass: 26, date: '2026-09-28' },
      { sub: subHin, type: AssessmentType.INTERNAL_ASSESSMENT, max: 20, pass: 7, date: '2026-09-29' },
    ];

    const createdAssessments: Record<string, string> = {};

    for (const spec of assessmentSpecs) {
      if (spec.sub) {
        const ass = await prisma.assessment.upsert({
          where: {
            examId_subjectId_type: {
              examId: examClass10.id,
              subjectId: spec.sub.id,
              type: spec.type,
            },
          },
          update: {},
          create: {
            schoolId: school.id,
            examId: examClass10.id,
            subjectId: spec.sub.id,
            type: spec.type,
            maxMarks: spec.max,
            passingMarks: spec.pass,
            date: new Date(spec.date),
          },
        });
        createdAssessments[`${spec.sub.code}_${spec.type}`] = ass.id;
      }
    }
    console.log('✅ Class 10 Mid-Term Assessments seeded');

    // 25. Marks for Aarav Kumar (student1) & Diya Sharma (student2)
    const enrAarav = await prisma.enrollment.findFirst({
      where: { studentId: student1.id, academicYearId: ayCurrent.id },
    });
    const enrDiya = await prisma.enrollment.findFirst({
      where: { studentId: student2.id, academicYearId: ayCurrent.id },
    });

    if (enrAarav) {
      const aaravMarks = [
        { key: 'ENG_THEORY', marks: 72.0 },
        { key: 'ENG_INTERNAL_ASSESSMENT', marks: 18.0 },
        { key: 'MATH_THEORY', marks: 76.0 },
        { key: 'MATH_INTERNAL_ASSESSMENT', marks: 19.0 },
        { key: 'SCI_THEORY', marks: 74.0 },
        { key: 'SCI_PRACTICAL', marks: 19.0 },
        { key: 'SOC_THEORY', marks: 70.0 },
        { key: 'SOC_INTERNAL_ASSESSMENT', marks: 18.0 },
        { key: 'HIN_THEORY', marks: 71.0 },
        { key: 'HIN_INTERNAL_ASSESSMENT', marks: 17.0 },
      ];

      for (const m of aaravMarks) {
        const assId = createdAssessments[m.key];
        if (assId) {
          await prisma.marksRecord.upsert({
            where: {
              assessmentId_enrollmentId: {
                assessmentId: assId,
                enrollmentId: enrAarav.id,
              },
            },
            update: { marksObtained: m.marks },
            create: {
              schoolId: school.id,
              assessmentId: assId,
              enrollmentId: enrAarav.id,
              marksObtained: m.marks,
              isAbsent: false,
              remarks: 'Excellent performance',
              enteredById: commTeacherUser?.id,
            },
          });
        }
      }
    }

    if (enrDiya) {
      const diyaMarks = [
        { key: 'ENG_THEORY', marks: 68.0 },
        { key: 'ENG_INTERNAL_ASSESSMENT', marks: 17.0 },
        { key: 'MATH_THEORY', marks: 65.0 },
        { key: 'MATH_INTERNAL_ASSESSMENT', marks: 16.0 },
        { key: 'SCI_THEORY', marks: 62.0 },
        { key: 'SCI_PRACTICAL', marks: 17.0 },
        { key: 'SOC_THEORY', marks: 64.0 },
        { key: 'SOC_INTERNAL_ASSESSMENT', marks: 17.0 },
        { key: 'HIN_THEORY', marks: 66.0 },
        { key: 'HIN_INTERNAL_ASSESSMENT', marks: 16.0 },
      ];

      for (const m of diyaMarks) {
        const assId = createdAssessments[m.key];
        if (assId) {
          await prisma.marksRecord.upsert({
            where: {
              assessmentId_enrollmentId: {
                assessmentId: assId,
                enrollmentId: enrDiya.id,
              },
            },
            update: { marksObtained: m.marks },
            create: {
              schoolId: school.id,
              assessmentId: assId,
              enrollmentId: enrDiya.id,
              marksObtained: m.marks,
              isAbsent: false,
              remarks: 'Good consistency',
              enteredById: commTeacherUser?.id,
            },
          });
        }
      }
    }
    console.log('✅ Student Marks Records seeded for Class 10');
  }

  // 26. Initial Audit Log
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
