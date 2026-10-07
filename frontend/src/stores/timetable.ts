import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.js';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export interface Period {
  id: string;
  schoolId: string;
  name: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface TimetableSlot {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  dayOfWeek: DayOfWeek;
  periodId: string;
  subjectId?: string | null;
  teacherId?: string | null;
  roomNumber?: string | null;
  period: Period;
  subject?: {
    id: string;
    name: string;
    code: string;
  } | null;
  teacher?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface SectionTimetableResponse {
  section: {
    id: string;
    name: string;
    className: string;
    roomNumber?: string | null;
  };
  academicYearId: string;
  periods: Period[];
  days: DayOfWeek[];
  grid: Record<DayOfWeek, TimetableSlot[]>;
  rawSlots: TimetableSlot[];
}

export interface TeacherAllocationItem {
  id: string;
  schoolId: string;
  teacherId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId?: string | null;
  isClassTeacher: boolean;
  teacher: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    specialization?: string | null;
  };
  class: {
    id: string;
    name: string;
    code: string;
  };
  section: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export const useTimetableStore = defineStore('timetable', () => {
  const periods = ref<Period[]>([]);
  const currentTimetable = ref<SectionTimetableResponse | null>(null);
  const allocations = ref<TeacherAllocationItem[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  function getAuthHeaders(): HeadersInit {
    const authStore = useAuthStore();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authStore.accessToken}`,
    };
  }

  async function fetchPeriods() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/timetable/periods', { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch periods');
      periods.value = json.data;
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSectionTimetable(sectionId: string, academicYearId?: string) {
    loading.value = true;
    error.value = null;
    try {
      let url = `/api/v1/timetable/section/${encodeURIComponent(sectionId)}`;
      if (academicYearId) url += `?academicYearId=${encodeURIComponent(academicYearId)}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch section timetable');
      currentTimetable.value = json.data;
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveSlot(payload: {
    sectionId: string;
    academicYearId?: string;
    dayOfWeek: DayOfWeek;
    periodId: string;
    subjectId?: string | null;
    teacherId?: string | null;
    roomNumber?: string | null;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/timetable/slots', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to save timetable slot');
      }
      // Refresh section timetable
      if (payload.sectionId) {
        await fetchSectionTimetable(payload.sectionId, payload.academicYearId);
      }
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function deleteSlot(slotId: string, sectionId?: string, academicYearId?: string) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/timetable/slots/${encodeURIComponent(slotId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to delete slot');
      if (sectionId) {
        await fetchSectionTimetable(sectionId, academicYearId);
      }
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function fetchAllocations(sectionId?: string, academicYearId?: string) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (sectionId) params.append('sectionId', sectionId);
      if (academicYearId) params.append('academicYearId', academicYearId);

      const url = `/api/v1/timetable/allocations?${params.toString()}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch allocations');
      allocations.value = json.data;
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveAllocation(payload: {
    teacherId: string;
    classId: string;
    sectionId: string;
    subjectId?: string | null;
    isClassTeacher?: boolean;
    academicYearId?: string;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/timetable/allocations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save teacher allocation');
      await fetchAllocations(payload.sectionId, payload.academicYearId);
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  return {
    periods,
    currentTimetable,
    allocations,
    loading,
    saving,
    error,
    fetchPeriods,
    fetchSectionTimetable,
    saveSlot,
    deleteSlot,
    fetchAllocations,
    saveAllocation,
  };
});
