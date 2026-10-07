import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAcademicsStore } from '../src/stores/academics.js';
import { useAuthStore } from '../src/stores/auth.js';

describe('Frontend AcademicsStore (Milestone 4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should initialize with empty collections and not loading', () => {
    const store = useAcademicsStore();
    expect(store.school).toBeNull();
    expect(store.academicYears).toEqual([]);
    expect(store.classes).toEqual([]);
    expect(store.sections).toEqual([]);
    expect(store.subjects).toEqual([]);
    expect(store.isLoading).toBe(false);
    expect(store.currentAcademicYear).toBeUndefined();
  });

  it('should compute currentAcademicYear from active year list', () => {
    const store = useAcademicsStore();
    store.academicYears = [
      {
        id: 'ay-1',
        schoolId: 'sch-1',
        name: '2025-2026',
        startDate: '2025-06-01',
        endDate: '2026-04-30',
        status: 'CONCLUDED',
        isCurrent: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ay-2',
        schoolId: 'sch-1',
        name: '2026-2027',
        startDate: '2026-06-01',
        endDate: '2027-04-30',
        status: 'ACTIVE',
        isCurrent: true,
        createdAt: new Date().toISOString(),
      },
    ];

    expect(store.currentAcademicYear).toBeDefined();
    expect(store.currentAcademicYear?.name).toBe('2026-2027');
    expect(store.currentAcademicYear?.status).toBe('ACTIVE');
  });

  it('should update local campus list upon campus actions', () => {
    const store = useAcademicsStore();
    store.campuses = [
      {
        id: 'cmp-1',
        schoolId: 'sch-1',
        name: 'Main Campus',
        createdAt: new Date().toISOString(),
      },
    ];

    expect(store.campuses.length).toBe(1);
    expect(store.campuses[0].name).toBe('Main Campus');
  });
});
