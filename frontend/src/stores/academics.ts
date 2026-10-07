import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth.js';

export interface CampusItem {
  id: string;
  schoolId: string;
  name: string;
  address?: Record<string, any> | null;
  createdAt: string;
}

export interface AcademicYearItem {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'CONCLUDED' | 'ARCHIVED';
  isCurrent: boolean;
  createdAt: string;
}

export interface SectionItem {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  roomNumber?: string | null;
  capacity: number;
  class?: {
    id: string;
    name: string;
    code: string;
    stage: string;
    orderIndex: number;
  };
}

export interface SubjectItem {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  type: 'THEORY' | 'PRACTICAL' | 'CO_SCHOLASTIC' | 'VOCATIONAL';
  _count?: {
    classSubjects: number;
  };
}

export interface ClassSubjectMapping {
  id: string;
  classId: string;
  subjectId: string;
  isCompulsory: boolean;
  weeklyPeriods: number;
  subject: SubjectItem;
}

export interface ClassItem {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  stage: 'PRE_PRIMARY' | 'PRIMARY' | 'MIDDLE' | 'SECONDARY' | 'HIGHER_SECONDARY';
  orderIndex: number;
  sections: SectionItem[];
  classSubjects: ClassSubjectMapping[];
  _count: {
    sections: number;
    classSubjects: number;
  };
}

export interface SchoolProfile {
  id: string;
  name: string;
  code: string;
  board: string;
  affiliationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: Record<string, any> | null;
  currency: string;
  settings?: Record<string, any> | null;
  campuses: CampusItem[];
  currentAcademicYear?: AcademicYearItem | null;
  _count: {
    campuses: number;
    classes: number;
    sections: number;
    subjects: number;
    users: number;
  };
}

export interface SetupWizardData {
  academicYearName: string;
  startDate: string;
  endDate: string;
  curriculumType: 'CBSE' | 'ICSE' | 'STATE';
  includePrePrimary: boolean;
  includeHigherSecondary: boolean;
  sectionsPerClass: string[];
  sectionCapacity: number;
}

export const useAcademicsStore = defineStore('academics', () => {
  const authStore = useAuthStore();

  const school = ref<SchoolProfile | null>(null);
  const campuses = ref<CampusItem[]>([]);
  const academicYears = ref<AcademicYearItem[]>([]);
  const classes = ref<ClassItem[]>([]);
  const sections = ref<SectionItem[]>([]);
  const subjects = ref<SubjectItem[]>([]);

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const currentAcademicYear = computed(() =>
    academicYears.value.find((y) => y.isCurrent) || school.value?.currentAcademicYear,
  );

  // ==========================================================================
  // School Profile & Campuses
  // ==========================================================================

  async function fetchSchoolProfile() {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await authStore.apiFetch('/api/v1/schools/profile');
      school.value = data;
      campuses.value = data.campuses || [];
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to load school profile';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateSchoolProfile(payload: Partial<SchoolProfile>) {
    isLoading.value = true;
    error.value = null;
    try {
      const updated = await authStore.apiFetch('/api/v1/schools/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (school.value) {
        school.value = { ...school.value, ...updated };
      }
      return updated;
    } catch (err: any) {
      error.value = err.message || 'Failed to update school profile';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCampuses() {
    try {
      const data = await authStore.apiFetch('/api/v1/schools/campuses');
      campuses.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to load campuses';
      throw err;
    }
  }

  async function createCampus(payload: { name: string; address?: any }) {
    const created = await authStore.apiFetch('/api/v1/schools/campuses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    campuses.value.push(created);
    return created;
  }

  async function updateCampus(id: string, payload: { name?: string; address?: any }) {
    const updated = await authStore.apiFetch(`/api/v1/schools/campuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const idx = campuses.value.findIndex((c) => c.id === id);
    if (idx !== -1) campuses.value[idx] = updated;
    return updated;
  }

  async function deleteCampus(id: string) {
    await authStore.apiFetch(`/api/v1/schools/campuses/${id}`, {
      method: 'DELETE',
    });
    campuses.value = campuses.value.filter((c) => c.id !== id);
  }

  // ==========================================================================
  // Academic Years
  // ==========================================================================

  async function fetchAcademicYears() {
    isLoading.value = true;
    try {
      const data = await authStore.apiFetch('/api/v1/academics/years');
      academicYears.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to load academic years';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createAcademicYear(payload: Partial<AcademicYearItem>) {
    const created = await authStore.apiFetch('/api/v1/academics/years', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchAcademicYears();
    return created;
  }

  async function activateAcademicYear(id: string) {
    const updated = await authStore.apiFetch(`/api/v1/academics/years/${id}/activate`, {
      method: 'POST',
    });
    await fetchAcademicYears();
    if (school.value) {
      school.value.currentAcademicYear = updated;
    }
    return updated;
  }

  async function deleteAcademicYear(id: string) {
    await authStore.apiFetch(`/api/v1/academics/years/${id}`, {
      method: 'DELETE',
    });
    academicYears.value = academicYears.value.filter((y) => y.id !== id);
  }

  // ==========================================================================
  // Classes
  // ==========================================================================

  async function fetchClasses() {
    isLoading.value = true;
    try {
      const data = await authStore.apiFetch('/api/v1/academics/classes');
      classes.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to load classes';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createClass(payload: Partial<ClassItem>) {
    const created = await authStore.apiFetch('/api/v1/academics/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchClasses();
    return created;
  }

  async function updateClass(id: string, payload: Partial<ClassItem>) {
    const updated = await authStore.apiFetch(`/api/v1/academics/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchClasses();
    return updated;
  }

  async function deleteClass(id: string) {
    await authStore.apiFetch(`/api/v1/academics/classes/${id}`, {
      method: 'DELETE',
    });
    classes.value = classes.value.filter((c) => c.id !== id);
  }

  // ==========================================================================
  // Sections
  // ==========================================================================

  async function fetchSections(classId?: string) {
    try {
      const url = classId ? `/api/v1/academics/sections?classId=${classId}` : '/api/v1/academics/sections';
      const data = await authStore.apiFetch(url);
      sections.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to load sections';
      throw err;
    }
  }

  async function createSection(payload: { classId: string; name: string; roomNumber?: string; capacity?: number }) {
    const created = await authStore.apiFetch('/api/v1/academics/sections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchClasses();
    await fetchSections();
    return created;
  }

  async function updateSection(id: string, payload: Partial<SectionItem>) {
    const updated = await authStore.apiFetch(`/api/v1/academics/sections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchClasses();
    await fetchSections();
    return updated;
  }

  async function deleteSection(id: string) {
    await authStore.apiFetch(`/api/v1/academics/sections/${id}`, {
      method: 'DELETE',
    });
    await fetchClasses();
    await fetchSections();
  }

  // ==========================================================================
  // Subjects
  // ==========================================================================

  async function fetchSubjects(type?: string) {
    isLoading.value = true;
    try {
      const url = type ? `/api/v1/academics/subjects?type=${type}` : '/api/v1/academics/subjects';
      const data = await authStore.apiFetch(url);
      subjects.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to load subjects';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createSubject(payload: Partial<SubjectItem>) {
    const created = await authStore.apiFetch('/api/v1/academics/subjects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchSubjects();
    return created;
  }

  async function updateSubject(id: string, payload: Partial<SubjectItem>) {
    const updated = await authStore.apiFetch(`/api/v1/academics/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchSubjects();
    return updated;
  }

  async function deleteSubject(id: string) {
    await authStore.apiFetch(`/api/v1/academics/subjects/${id}`, {
      method: 'DELETE',
    });
    subjects.value = subjects.value.filter((s) => s.id !== id);
  }

  // ==========================================================================
  // Class-Subject Assignments
  // ==========================================================================

  async function fetchClassSubjects(classId: string) {
    return authStore.apiFetch(`/api/v1/academics/classes/${classId}/subjects`);
  }

  async function assignClassSubjects(
    classId: string,
    assignments: Array<{ subjectId: string; isCompulsory?: boolean; weeklyPeriods?: number }>,
  ) {
    const results = await authStore.apiFetch(`/api/v1/academics/classes/${classId}/subjects`, {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    });
    await fetchClasses();
    return results;
  }

  async function unassignClassSubject(classId: string, subjectId: string) {
    await authStore.apiFetch(`/api/v1/academics/classes/${classId}/subjects/${subjectId}`, {
      method: 'DELETE',
    });
    await fetchClasses();
  }

  // ==========================================================================
  // Onboarding Wizard
  // ==========================================================================

  async function bootstrapSetup(data: SetupWizardData) {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await authStore.apiFetch('/api/v1/academics/wizard/bootstrap', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await fetchSchoolProfile();
      await fetchAcademicYears();
      await fetchClasses();
      return result;
    } catch (err: any) {
      error.value = err.message || 'Failed to complete setup wizard';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    school,
    campuses,
    academicYears,
    classes,
    sections,
    subjects,
    isLoading,
    error,
    currentAcademicYear,
    fetchSchoolProfile,
    updateSchoolProfile,
    fetchCampuses,
    createCampus,
    updateCampus,
    deleteCampus,
    fetchAcademicYears,
    createAcademicYear,
    activateAcademicYear,
    deleteAcademicYear,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    fetchSections,
    createSection,
    updateSection,
    deleteSection,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    fetchClassSubjects,
    assignClassSubjects,
    unassignClassSubject,
    bootstrapSetup,
  };
});
