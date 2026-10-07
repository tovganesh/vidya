import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAttendanceStore } from '../src/stores/attendance.js';

describe('Frontend AttendanceStore (Milestone 6)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with null sheet and not loading', () => {
    const store = useAttendanceStore();
    expect(store.currentSheet).toBeNull();
    expect(store.monthlyRegister).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.saving).toBe(false);
  });

  it('fetches attendance sheet and populates state', async () => {
    const mockSheet = {
      section: { id: 'sec-1', name: 'A', className: 'Class 10', classCode: 'STD-10' },
      date: '2026-10-08',
      isMarked: true,
      totalStudents: 2,
      stats: { present: 2, absent: 0, late: 0, halfDay: 0, excused: 0, attendancePercentage: 100 },
      students: [
        {
          enrollmentId: 'enr-1',
          studentId: 'st-1',
          rollNumber: 1,
          admissionNumber: 'VS-01',
          firstName: 'Aarav',
          lastName: 'Kumar',
          fullName: 'Aarav Kumar',
          gender: 'MALE',
          photoUrl: null,
          status: 'PRESENT',
          remarks: null,
          isMarked: true,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockSheet }),
    });

    const store = useAttendanceStore();
    const data = await store.fetchSheet('sec-1', '2026-10-08');

    expect(data.section.id).toBe('sec-1');
    expect(store.currentSheet).toEqual(mockSheet);
    expect(store.loading).toBe(false);
  });

  it('submits bulk attendance batch', async () => {
    const mockSheet = {
      section: { id: 'sec-1', name: 'A', className: 'Class 10', classCode: 'STD-10' },
      date: '2026-10-08',
      isMarked: true,
      totalStudents: 1,
      stats: { present: 1, absent: 0, late: 0, halfDay: 0, excused: 0, attendancePercentage: 100 },
      students: [],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { count: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSheet }),
      });

    const store = useAttendanceStore();
    const res = await store.recordBatch('sec-1', '2026-10-08', [
      { enrollmentId: 'enr-1', status: 'PRESENT' },
    ]);

    expect(res.count).toBe(1);
    expect(store.saving).toBe(false);
  });
});
