import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.js';

export interface DailyDiaryEntry {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId?: string | null;
  date: string;
  classwork: string;
  homework?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  subject: {
    id: string;
    name: string;
    code: string;
    type: string;
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
  teacher?: {
    id: string;
    employeeCode: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
    };
  } | null;
}

export interface SaveDiaryPayload {
  academicYearId?: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  date: string;
  classwork: string;
  homework?: string | null;
  dueDate?: string | null;
  teacherId?: string | null;
}

export interface DiaryFilterOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  academicYearId?: string;
}

export const useDiaryStore = defineStore('diary', () => {
  const entries = ref<DailyDiaryEntry[]>([]);
  const selectedDate = ref<string>(new Date().toISOString().slice(0, 10));
  const loading = ref<boolean>(false);
  const saving = ref<boolean>(false);
  const error = ref<string | null>(null);

  function getAuthHeaders(): HeadersInit {
    const authStore = useAuthStore();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authStore.accessToken}`,
    };
  }

  async function fetchEntries(filters: DiaryFilterOptions = {}) {
    loading.value = true;
    error.value = null;

    try {
      const queryParams = new URLSearchParams();
      if (filters.date) queryParams.append('date', filters.date);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.classId) queryParams.append('classId', filters.classId);
      if (filters.sectionId) queryParams.append('sectionId', filters.sectionId);
      if (filters.subjectId) queryParams.append('subjectId', filters.subjectId);
      if (filters.academicYearId) queryParams.append('academicYearId', filters.academicYearId);

      const qs = queryParams.toString();
      const url = qs ? `/api/v1/diary?${qs}` : '/api/v1/diary';

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to fetch diary entries');
      }

      entries.value = data.data || [];
      return entries.value;
    } catch (err: any) {
      error.value = err.message || 'Error fetching diary entries';
      entries.value = [];
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveEntry(payload: SaveDiaryPayload) {
    saving.value = true;
    error.value = null;

    try {
      const res = await fetch('/api/v1/diary', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to save diary entry');
      }

      const savedEntry: DailyDiaryEntry = data.data;

      // Update local cache
      const index = entries.value.findIndex(
        (e) =>
          e.sectionId === savedEntry.sectionId &&
          e.subjectId === savedEntry.subjectId &&
          e.date.slice(0, 10) === savedEntry.date.slice(0, 10),
      );

      if (index !== -1) {
        entries.value[index] = savedEntry;
      } else {
        entries.value.unshift(savedEntry);
      }

      return savedEntry;
    } catch (err: any) {
      error.value = err.message || 'Error saving diary entry';
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function deleteEntry(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const res = await fetch(`/api/v1/diary/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to delete diary entry');
      }

      entries.value = entries.value.filter((e) => e.id !== id);
      return true;
    } catch (err: any) {
      error.value = err.message || 'Error deleting diary entry';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    entries,
    selectedDate,
    loading,
    saving,
    error,
    fetchEntries,
    saveEntry,
    deleteEntry,
  };
});
