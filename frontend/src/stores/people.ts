import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.js';

export interface StudentListItem {
  id: string;
  schoolId: string;
  admissionNumber: string;
  admissionDate: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  bloodGroup: string;
  apaarId?: string | null;
  aadhaarLastFour?: string | null;
  nationality: string;
  category: 'GENERAL' | 'OBC' | 'SC' | 'ST' | 'EWS';
  photoUrl?: string | null;
  status: 'ENROLLED' | 'ALUMNI' | 'TRANSFERRED' | 'WITHDRAWN';
  createdAt: string;
  currentEnrollment?: {
    id: string;
    academicYear: string;
    academicYearId: string;
    className: string;
    classId: string;
    sectionName: string;
    sectionId: string;
    rollNumber?: number | null;
    status: string;
  } | null;
  primaryGuardian?: {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string | null;
  } | null;
}

export interface Student360 {
  id: string;
  schoolId: string;
  admissionNumber: string;
  admissionDate: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  bloodGroup: string;
  apaarId?: string | null;
  aadhaarLastFour?: string | null;
  nationality: string;
  religion?: string | null;
  category: 'GENERAL' | 'OBC' | 'SC' | 'ST' | 'EWS';
  permanentAddress?: any;
  currentAddress?: any;
  photoUrl?: string | null;
  status: 'ENROLLED' | 'ALUMNI' | 'TRANSFERRED' | 'WITHDRAWN';
  createdAt: string;
  user?: {
    id: string;
    email: string;
    status: string;
    lastLoginAt?: string | null;
  } | null;
  currentEnrollment?: any;
  guardians: Array<{
    id: string;
    relationId: string;
    name: string;
    relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
    phone: string;
    email?: string | null;
    occupation?: string | null;
    annualIncome?: string | null;
    address?: any;
    isPrimaryContact: boolean;
    isAuthorizedPickup: boolean;
    receivesNotifications: boolean;
  }>;
  enrollmentHistory: Array<{
    id: string;
    academicYearId: string;
    academicYearName: string;
    isCurrentYear: boolean;
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    rollNumber?: number | null;
    status: 'ACTIVE' | 'PROMOTED' | 'RETAINED' | 'TRANSFERRED_OUT' | 'DROPPED';
    enrollmentDate: string;
    remarks?: string | null;
  }>;
}

export interface GuardianItem {
  id: string;
  schoolId: string;
  name: string;
  relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  phone: string;
  email?: string | null;
  occupation?: string | null;
  annualIncome?: string | null;
  address?: any;
  createdAt: string;
  children: Array<{
    studentId: string;
    admissionNumber: string;
    fullName: string;
    status: string;
    isPrimaryContact: boolean;
    isAuthorizedPickup: boolean;
    receivesNotifications: boolean;
  }>;
  childrenCount: number;
}

export interface TeacherItem {
  id: string;
  schoolId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  joiningDate: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
  userStatus: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface EnrollmentItem {
  id: string;
  studentId: string;
  admissionNumber: string;
  fullName: string;
  gender: string;
  studentStatus: string;
  photoUrl?: string | null;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  rollNumber?: number | null;
  status: string;
  enrollmentDate: string;
  remarks?: string | null;
}

export interface PeopleStats {
  totalStudents: number;
  enrolledStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  totalGuardians: number;
  activeEnrollments: number;
  genderRatio: {
    male: number;
    female: number;
    other: number;
  };
  classDistribution: Array<{
    classId: string;
    className: string;
    studentCount: number;
  }>;
}

export const usePeopleStore = defineStore('people', () => {
  const authStore = useAuthStore();

  const students = ref<StudentListItem[]>([]);
  const activeStudent = ref<Student360 | null>(null);
  const guardians = ref<GuardianItem[]>([]);
  const teachers = ref<TeacherItem[]>([]);
  const enrollments = ref<EnrollmentItem[]>([]);
  const stats = ref<PeopleStats | null>(null);

  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authStore.accessToken}`,
    };
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================
  async function fetchStats() {
    try {
      const res = await fetch('/api/v1/people/stats', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch directory statistics');
      stats.value = data.data;
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      return null;
    }
  }

  // ==========================================================================
  // Students
  // ==========================================================================
  async function fetchStudents(params: Record<string, any> = {}) {
    loading.value = true;
    error.value = null;
    try {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      }

      const res = await fetch(`/api/v1/students?${searchParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch students');

      students.value = data.data;
      if (data.pagination) {
        pagination.value = data.pagination;
      }
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStudentById(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/students/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch student profile');

      activeStudent.value = data.data;
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function admitStudent(payload: any) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/students', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to admit student');

      // Refresh list & stats
      await fetchStudents();
      await fetchStats();
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateStudent(id: string, payload: any) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/students/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update student profile');

      if (activeStudent.value?.id === id) {
        await fetchStudentById(id);
      }
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function linkGuardian(studentId: string, payload: any) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/students/${studentId}/guardians`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to link guardian');

      await fetchStudentById(studentId);
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function unlinkGuardian(studentId: string, guardianId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/students/${studentId}/guardians/${guardianId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to unlink guardian');

      await fetchStudentById(studentId);
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ==========================================================================
  // Guardians
  // ==========================================================================
  async function fetchGuardians(params: Record<string, any> = {}) {
    loading.value = true;
    error.value = null;
    try {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      }

      const res = await fetch(`/api/v1/guardians?${searchParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch guardians');

      guardians.value = data.data;
      if (data.pagination) {
        pagination.value = data.pagination;
      }
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ==========================================================================
  // Teachers
  // ==========================================================================
  async function fetchTeachers(params: Record<string, any> = {}) {
    loading.value = true;
    error.value = null;
    try {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      }

      const res = await fetch(`/api/v1/teachers?${searchParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch teachers');

      teachers.value = data.data;
      if (data.pagination) {
        pagination.value = data.pagination;
      }
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function onboardTeacher(payload: any) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/teachers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to onboard teacher');

      await fetchTeachers();
      await fetchStats();
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateTeacher(id: string, payload: any) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/teachers/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update teacher');

      await fetchTeachers();
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ==========================================================================
  // Enrollments & Promotion
  // ==========================================================================
  async function fetchEnrollments(params: Record<string, any> = {}) {
    loading.value = true;
    error.value = null;
    try {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      }

      const res = await fetch(`/api/v1/enrollments?${searchParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch enrollments');

      enrollments.value = data.data;
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function batchPromote(payload: any) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/enrollments/batch-promote', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Batch promotion failed');

      await fetchStats();
      return data.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    students,
    activeStudent,
    guardians,
    teachers,
    enrollments,
    stats,
    loading,
    error,
    pagination,
    fetchStats,
    fetchStudents,
    fetchStudentById,
    admitStudent,
    updateStudent,
    linkGuardian,
    unlinkGuardian,
    fetchGuardians,
    fetchTeachers,
    onboardTeacher,
    updateTeacher,
    fetchEnrollments,
    batchPromote,
  };
});
