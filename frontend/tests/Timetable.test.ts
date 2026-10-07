import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTimetableStore } from '../src/stores/timetable.js';

describe('Frontend TimetableStore (Milestone 6)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with empty periods and allocations', () => {
    const store = useTimetableStore();
    expect(store.periods).toEqual([]);
    expect(store.currentTimetable).toBeNull();
    expect(store.allocations).toEqual([]);
    expect(store.loading).toBe(false);
  });

  it('fetches periods list and updates state', async () => {
    const mockPeriods = [
      { id: 'p-1', schoolId: 'sch-1', name: 'Assembly', periodNumber: 0, startTime: '08:30', endTime: '08:50', isBreak: true },
      { id: 'p-2', schoolId: 'sch-1', name: 'Period 1', periodNumber: 1, startTime: '08:50', endTime: '09:35', isBreak: false },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockPeriods }),
    });

    const store = useTimetableStore();
    const data = await store.fetchPeriods();

    expect(data.length).toBe(2);
    expect(store.periods).toEqual(mockPeriods);
  });

  it('fetches section timetable grid', async () => {
    const mockTimetable = {
      section: { id: 'sec-1', name: 'A', className: 'Class 10', roomNumber: 'Room-10A' },
      academicYearId: 'ay-1',
      periods: [],
      days: ['MONDAY', 'TUESDAY'],
      grid: { MONDAY: [], TUESDAY: [] },
      rawSlots: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockTimetable }),
    });

    const store = useTimetableStore();
    const data = await store.fetchSectionTimetable('sec-1');

    expect(data.section.id).toBe('sec-1');
    expect(store.currentTimetable).toEqual(mockTimetable);
  });
});
