import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.js';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED';

export interface AttendanceStudentRosterItem {
  enrollmentId: string;
  studentId: string;
  rollNumber: number | null;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  photoUrl: string | null;
  status: AttendanceStatus;
  remarks: string | null;
  isMarked: boolean;
}

export interface AttendanceSheetData {
  section: {
    id: string;
    name: string;
    className: string;
    classCode: string;
  };
  date: string;
  isMarked: boolean;
  totalStudents: number;
  stats: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    excused: number;
    attendancePercentage: number;
  };
  students: AttendanceStudentRosterItem[];
}

export interface MonthlyRegisterStudentItem {
  enrollmentId: string;
  studentId: string;
  rollNumber: number | null;
  admissionNumber: string;
  studentName: string;
  dailyAttendance: Record<string, AttendanceStatus | null>;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDayDays: number;
  totalMarked: number;
  percentage: number;
  isBelowThreshold: boolean;
}

export interface MonthlyRegisterData {
  section: {
    id: string;
    name: string;
    className: string;
  };
  year: number;
  month: number;
  daysInMonth: number;
  totalWorkingDays: number;
  classAveragePercentage: number;
  students: MonthlyRegisterStudentItem[];
}

export const useAttendanceStore = defineStore('attendance', () => {
  const currentSheet = ref<AttendanceSheetData | null>(null);
  const monthlyRegister = ref<MonthlyRegisterData | null>(null);
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

  async function fetchSheet(sectionId: string, date: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/attendance/sheet?sectionId=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(date)}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch attendance sheet');
      currentSheet.value = json.data;
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function recordBatch(
    sectionId: string,
    date: string,
    records: Array<{ enrollmentId: string; status: AttendanceStatus; remarks?: string }>,
  ) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/attendance/batch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sectionId, date, records }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to submit attendance roll call');
      // Refresh sheet to update stats
      await fetchSheet(sectionId, date);
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function fetchMonthlyRegister(sectionId: string, year: number, month: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(
        `/api/v1/attendance/reports/monthly?sectionId=${encodeURIComponent(sectionId)}&year=${year}&month=${month}`,
        {
          headers: getAuthHeaders(),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch monthly attendance register');
      monthlyRegister.value = json.data;
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStudentAttendance(enrollmentId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/attendance/student/${encodeURIComponent(enrollmentId)}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch student attendance profile');
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    currentSheet,
    monthlyRegister,
    loading,
    saving,
    error,
    fetchSheet,
    recordBatch,
    fetchMonthlyRegister,
    fetchStudentAttendance,
  };
});
