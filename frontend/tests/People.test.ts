import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePeopleStore } from '../src/stores/people.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('Frontend PeopleStore (Milestone 5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should initialize with empty collections and null active student', () => {
    const store = usePeopleStore();
    expect(store.students).toEqual([]);
    expect(store.guardians).toEqual([]);
    expect(store.teachers).toEqual([]);
    expect(store.enrollments).toEqual([]);
    expect(store.stats).toBeNull();
    expect(store.activeStudent).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.pagination.page).toBe(1);
  });

  it('should store and retrieve student records with current enrollment and primary guardian', () => {
    const store = usePeopleStore();
    store.students = [
      {
        id: 'std-001',
        schoolId: 'sch-001',
        admissionNumber: 'VS-2024-0101',
        admissionDate: '2024-06-01',
        firstName: 'Aarav',
        lastName: 'Kumar',
        fullName: 'Aarav Kumar',
        gender: 'MALE',
        dateOfBirth: '2011-04-14',
        bloodGroup: 'O_POS',
        apaarId: '984512345678',
        nationality: 'Indian',
        category: 'GENERAL',
        status: 'ENROLLED',
        createdAt: new Date().toISOString(),
        currentEnrollment: {
          id: 'enr-001',
          academicYear: '2026-2027',
          academicYearId: 'ay-2026',
          className: 'Class 10',
          classId: 'cls-10',
          sectionName: 'A',
          sectionId: 'sec-10a',
          rollNumber: 1,
          status: 'ACTIVE',
        },
        primaryGuardian: {
          id: 'grd-001',
          name: 'Suresh Kumar',
          relationship: 'FATHER',
          phone: '+91 98000 00005',
        },
      },
    ];

    expect(store.students.length).toBe(1);
    const student = store.students[0];
    expect(student.fullName).toBe('Aarav Kumar');
    expect(student.apaarId).toBe('984512345678');
    expect(student.currentEnrollment?.className).toBe('Class 10');
    expect(student.primaryGuardian?.name).toBe('Suresh Kumar');
  });

  it('should maintain Student 360 profile with multi-year trajectory timeline', () => {
    const store = usePeopleStore();
    store.activeStudent = {
      id: 'std-001',
      schoolId: 'sch-001',
      admissionNumber: 'VS-2024-0101',
      admissionDate: '2024-06-01',
      firstName: 'Aarav',
      lastName: 'Kumar',
      fullName: 'Aarav Kumar',
      gender: 'MALE',
      dateOfBirth: '2011-04-14',
      bloodGroup: 'O_POS',
      apaarId: '984512345678',
      aadhaarLastFour: '4512',
      nationality: 'Indian',
      category: 'GENERAL',
      status: 'ENROLLED',
      createdAt: new Date().toISOString(),
      guardians: [
        {
          id: 'grd-001',
          relationId: 'sg-001',
          name: 'Suresh Kumar',
          relationship: 'FATHER',
          phone: '+91 98000 00005',
          isPrimaryContact: true,
          isAuthorizedPickup: true,
          receivesNotifications: true,
        },
        {
          id: 'grd-002',
          relationId: 'sg-002',
          name: 'Sunita Kumar',
          relationship: 'MOTHER',
          phone: '+91 98000 00015',
          isPrimaryContact: false,
          isAuthorizedPickup: true,
          receivesNotifications: true,
        },
      ],
      enrollmentHistory: [
        {
          id: 'enr-hist-1',
          academicYearId: 'ay-2025',
          academicYearName: '2025-2026',
          isCurrentYear: false,
          classId: 'cls-9',
          className: 'Class 9',
          sectionId: 'sec-9a',
          sectionName: 'A',
          rollNumber: 15,
          status: 'PROMOTED',
          enrollmentDate: '2025-06-01',
          remarks: 'Promoted to Class 10 with distinction',
        },
        {
          id: 'enr-hist-2',
          academicYearId: 'ay-2026',
          academicYearName: '2026-2027',
          isCurrentYear: true,
          classId: 'cls-10',
          className: 'Class 10',
          sectionId: 'sec-10a',
          sectionName: 'A',
          rollNumber: 1,
          status: 'ACTIVE',
          enrollmentDate: '2026-06-01',
        },
      ],
    };

    expect(store.activeStudent.guardians.length).toBe(2);
    expect(store.activeStudent.guardians[0].isPrimaryContact).toBe(true);
    expect(store.activeStudent.enrollmentHistory.length).toBe(2);
    expect(store.activeStudent.enrollmentHistory[0].status).toBe('PROMOTED');
    expect(store.activeStudent.enrollmentHistory[1].status).toBe('ACTIVE');
  });

  it('should store aggregate people statistics', () => {
    const store = usePeopleStore();
    store.stats = {
      totalStudents: 120,
      enrolledStudents: 118,
      totalTeachers: 14,
      activeTeachers: 14,
      totalGuardians: 95,
      activeEnrollments: 118,
      genderRatio: {
        male: 65,
        female: 52,
        other: 1,
      },
      classDistribution: [
        { classId: 'cls-9', className: 'Class 9', studentCount: 40 },
        { classId: 'cls-10', className: 'Class 10', studentCount: 38 },
      ],
    };

    expect(store.stats.totalStudents).toBe(120);
    expect(store.stats.activeTeachers).toBe(14);
    expect(store.stats.genderRatio.male).toBe(65);
    expect(store.stats.classDistribution.length).toBe(2);
  });
});
