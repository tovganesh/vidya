<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePeopleStore } from '../../stores/people.js';
import { useAcademicsStore } from '../../stores/academics.js';
import { useAuthStore } from '../../stores/auth.js';

const route = useRoute();
const router = useRouter();
const peopleStore = usePeopleStore();
const academicsStore = useAcademicsStore();
const authStore = useAuthStore();

// Tab state: 'students' | 'guardians' | 'teachers'
const activeTab = ref<'students' | 'guardians' | 'teachers'>('students');

// Sync tab with route query or path
if (route.query.tab === 'guardians' || route.path === '/guardians') {
  activeTab.value = 'guardians';
} else if (route.query.tab === 'teachers' || route.path === '/teachers') {
  activeTab.value = 'teachers';
}

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab === 'guardians' || newTab === 'teachers' || newTab === 'students') {
      activeTab.value = newTab;
    }
  },
);

function switchTab(tab: 'students' | 'guardians' | 'teachers') {
  activeTab.value = tab;
  router.replace({ query: { ...route.query, tab } });
}

// Filters
const searchQuery = ref('');
const selectedYearId = ref('');
const selectedClassId = ref('');
const selectedSectionId = ref('');
const selectedStatus = ref('');

// Modals
const showAdmitModal = ref(false);
const showTeacherModal = ref(false);
const modalLoading = ref(false);
const modalError = ref<string | null>(null);

// Student Admission Form Data
const admitForm = ref({
  admissionNumber: '',
  admissionDate: new Date().toISOString().slice(0, 10),
  firstName: '',
  middleName: '',
  lastName: '',
  gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
  dateOfBirth: '2015-06-01',
  bloodGroup: 'UNKNOWN',
  apaarId: '',
  aadhaarLastFour: '',
  category: 'GENERAL',
  permanentAddress: '',
  currentAddress: '',
  // Guardian info
  guardianName: '',
  guardianRelationship: 'FATHER' as 'FATHER' | 'MOTHER' | 'GUARDIAN',
  guardianPhone: '',
  guardianEmail: '',
  guardianOccupation: '',
  // Placement
  academicYearId: '',
  classId: '',
  sectionId: '',
  rollNumber: '',
});

// Teacher Onboard Form Data
const teacherForm = ref({
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  qualification: '',
  specialization: '',
  joiningDate: new Date().toISOString().slice(0, 10),
});

const canWriteStudent = computed(() =>
  authStore.hasPermission('student:write') || authStore.hasRole('SCHOOL_ADMIN') || authStore.hasRole('SUPER_ADMIN'),
);

const canManageStaff = computed(() =>
  authStore.hasPermission('user:manage') || authStore.hasRole('SCHOOL_ADMIN') || authStore.hasRole('SUPER_ADMIN'),
);

onMounted(async () => {
  await Promise.all([
    peopleStore.fetchStats(),
    academicsStore.fetchAcademicYears(),
    academicsStore.fetchClasses(),
  ]);

  const activeYear = academicsStore.currentAcademicYear;
  if (activeYear) {
    selectedYearId.value = activeYear.id;
    admitForm.value.academicYearId = activeYear.id;
  }

  await loadActiveTabData();
});

async function loadActiveTabData() {
  if (activeTab.value === 'students') {
    await peopleStore.fetchStudents({
      search: searchQuery.value,
      academicYearId: selectedYearId.value,
      classId: selectedClassId.value,
      sectionId: selectedSectionId.value,
      status: selectedStatus.value || undefined,
    });
  } else if (activeTab.value === 'guardians') {
    await peopleStore.fetchGuardians({
      search: searchQuery.value,
    });
  } else if (activeTab.value === 'teachers') {
    await peopleStore.fetchTeachers({
      search: searchQuery.value,
      status: selectedStatus.value || undefined,
    });
  }
}

// Filter sections based on selected class
const availableSections = computed(() => {
  if (!selectedClassId.value) return [];
  const cls = academicsStore.classes.find((c) => c.id === selectedClassId.value);
  return cls?.sections || [];
});

const modalAvailableSections = computed(() => {
  if (!admitForm.value.classId) return [];
  const cls = academicsStore.classes.find((c) => c.id === admitForm.value.classId);
  return cls?.sections || [];
});

function handleFilterChange() {
  loadActiveTabData();
}

let searchDebounce: any = null;
function handleSearchInput() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadActiveTabData();
  }, 350);
}

function openAdmitModal() {
  modalError.value = null;
  const num = Math.floor(1000 + Math.random() * 9000);
  admitForm.value.admissionNumber = `VS-2026-${num}`;
  if (academicsStore.currentAcademicYear) {
    admitForm.value.academicYearId = academicsStore.currentAcademicYear.id;
  }
  showAdmitModal.value = true;
}

async function submitStudentAdmission() {
  modalLoading.value = true;
  modalError.value = null;
  try {
    const payload: any = {
      admissionNumber: admitForm.value.admissionNumber,
      admissionDate: admitForm.value.admissionDate,
      firstName: admitForm.value.firstName,
      middleName: admitForm.value.middleName || undefined,
      lastName: admitForm.value.lastName,
      gender: admitForm.value.gender,
      dateOfBirth: admitForm.value.dateOfBirth,
      bloodGroup: admitForm.value.bloodGroup,
      apaarId: admitForm.value.apaarId || undefined,
      aadhaarLastFour: admitForm.value.aadhaarLastFour || undefined,
      category: admitForm.value.category,
      currentAddress: admitForm.value.currentAddress ? { text: admitForm.value.currentAddress } : undefined,
    };

    if (admitForm.value.guardianName && admitForm.value.guardianPhone) {
      payload.guardians = [
        {
          name: admitForm.value.guardianName,
          relationship: admitForm.value.guardianRelationship,
          phone: admitForm.value.guardianPhone,
          email: admitForm.value.guardianEmail || undefined,
          occupation: admitForm.value.guardianOccupation || undefined,
          isPrimaryContact: true,
        },
      ];
    }

    if (admitForm.value.academicYearId && admitForm.value.classId && admitForm.value.sectionId) {
      payload.enrollment = {
        academicYearId: admitForm.value.academicYearId,
        classId: admitForm.value.classId,
        sectionId: admitForm.value.sectionId,
        rollNumber: admitForm.value.rollNumber ? Number(admitForm.value.rollNumber) : undefined,
      };
    }

    await peopleStore.admitStudent(payload);
    showAdmitModal.value = false;
    await loadActiveTabData();
  } catch (err: any) {
    modalError.value = err.message || 'Failed to admit student';
  } finally {
    modalLoading.value = false;
  }
}

function openTeacherModal() {
  modalError.value = null;
  const num = Math.floor(100 + Math.random() * 900);
  teacherForm.value.employeeCode = `EMP-2026-${num}`;
  showTeacherModal.value = true;
}

async function submitTeacherOnboarding() {
  modalLoading.value = true;
  modalError.value = null;
  try {
    await peopleStore.onboardTeacher({
      employeeCode: teacherForm.value.employeeCode,
      firstName: teacherForm.value.firstName,
      lastName: teacherForm.value.lastName,
      email: teacherForm.value.email,
      phone: teacherForm.value.phone || undefined,
      qualification: teacherForm.value.qualification || undefined,
      specialization: teacherForm.value.specialization || undefined,
      joiningDate: teacherForm.value.joiningDate,
    });
    showTeacherModal.value = false;
    await loadActiveTabData();
  } catch (err: any) {
    modalError.value = err.message || 'Failed to onboard teacher';
  } finally {
    modalLoading.value = false;
  }
}
</script>

<template>
  <div class="directory-view" id="people-directory-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <div class="header-badge">
          <span class="badge-dot"></span>
          <span>CAMPUS REGISTRY & LIFELONG ENROLLMENT</span>
        </div>
        <h1 class="page-title">People & Registry</h1>
        <p class="page-subtitle">
          Master records for students, parents, and instructional staff. Designed with APAAR ID support and multi-year trajectory preservation.
        </p>
      </div>

      <div class="header-actions">
        <router-link
          v-if="canWriteStudent"
          to="/people/promote"
          class="btn btn-secondary"
          id="btn-nav-batch-promote"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Batch Promotion
        </router-link>

        <button
          v-if="canManageStaff && activeTab === 'teachers'"
          @click="openTeacherModal"
          class="btn btn-primary"
          id="btn-open-add-teacher"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Teacher
        </button>

        <button
          v-if="canWriteStudent && activeTab !== 'teachers'"
          @click="openAdmitModal"
          class="btn btn-primary"
          id="btn-open-admit-student"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Admit Student
        </button>
      </div>
    </header>

    <!-- Top Key Metrics Cards -->
    <div class="metrics-grid" v-if="peopleStore.stats">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Enrolled Students</span>
          <span class="metric-icon-box blue">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </span>
        </div>
        <div class="metric-value">{{ peopleStore.stats.enrolledStudents }}</div>
        <div class="metric-sub">
          Total master profiles: <strong>{{ peopleStore.stats.totalStudents }}</strong>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Instructional Faculty</span>
          <span class="metric-icon-box purple">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </span>
        </div>
        <div class="metric-value">{{ peopleStore.stats.activeTeachers }}</div>
        <div class="metric-sub">Active teaching staff</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Parent Accounts</span>
          <span class="metric-icon-box amber">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </span>
        </div>
        <div class="metric-value">{{ peopleStore.stats.totalGuardians }}</div>
        <div class="metric-sub">Linked primary guardians</div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Active Session Seats</span>
          <span class="metric-icon-box green">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <div class="metric-value">{{ peopleStore.stats.activeEnrollments }}</div>
        <div class="metric-sub">Placed in class sections</div>
      </div>
    </div>

    <!-- Tabbed Navigation Bar -->
    <div class="tabs-nav" id="directory-tabs">
      <button
        @click="switchTab('students')"
        class="tab-btn"
        :class="{ active: activeTab === 'students' }"
        id="tab-btn-students"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tab-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        Students
        <span class="tab-badge" v-if="peopleStore.stats">{{ peopleStore.stats.totalStudents }}</span>
      </button>

      <button
        @click="switchTab('guardians')"
        class="tab-btn"
        :class="{ active: activeTab === 'guardians' }"
        id="tab-btn-guardians"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tab-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        Guardians & Parents
        <span class="tab-badge" v-if="peopleStore.stats">{{ peopleStore.stats.totalGuardians }}</span>
      </button>

      <button
        @click="switchTab('teachers')"
        class="tab-btn"
        :class="{ active: activeTab === 'teachers' }"
        id="tab-btn-teachers"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tab-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Teachers & Faculty
        <span class="tab-badge" v-if="peopleStore.stats">{{ peopleStore.stats.activeTeachers }}</span>
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="filters-card">
      <div class="search-input-wrap">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="search-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          @input="handleSearchInput"
          type="text"
          class="search-input"
          id="filter-search-input"
          :placeholder="
            activeTab === 'students'
              ? 'Search student by name, admission no, or APAAR ID...'
              : activeTab === 'guardians'
              ? 'Search guardian by name, phone, or email...'
              : 'Search teacher by name, employee code, or subject...'
          "
        />
      </div>

      <div class="filters-selectors" v-if="activeTab === 'students'">
        <select
          v-model="selectedYearId"
          @change="handleFilterChange"
          class="filter-select"
          id="filter-year-select"
        >
          <option value="">All Academic Years</option>
          <option v-for="y in academicsStore.academicYears" :key="y.id" :value="y.id">
            {{ y.name }} {{ y.isCurrent ? '(Active)' : '' }}
          </option>
        </select>

        <select
          v-model="selectedClassId"
          @change="
            selectedSectionId = '';
            handleFilterChange();
          "
          class="filter-select"
          id="filter-class-select"
        >
          <option value="">All Classes</option>
          <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>

        <select
          v-model="selectedSectionId"
          @change="handleFilterChange"
          class="filter-select"
          id="filter-section-select"
          :disabled="!selectedClassId"
        >
          <option value="">All Sections</option>
          <option v-for="s in availableSections" :key="s.id" :value="s.id">
            Section {{ s.name }}
          </option>
        </select>

        <select
          v-model="selectedStatus"
          @change="handleFilterChange"
          class="filter-select"
          id="filter-status-select"
        >
          <option value="">All Statuses</option>
          <option value="ENROLLED">Enrolled</option>
          <option value="ALUMNI">Alumni</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      <div class="filters-selectors" v-else-if="activeTab === 'teachers'">
        <select
          v-model="selectedStatus"
          @change="handleFilterChange"
          class="filter-select"
          id="filter-teacher-status"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="RESIGNED">Resigned</option>
        </select>
      </div>
    </div>

    <!-- Data Tables Container -->
    <div class="table-container">
      <div v-if="peopleStore.loading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading registry data...</span>
      </div>

      <!-- STUDENTS TAB -->
      <table v-else-if="activeTab === 'students'" class="data-table" id="table-students">
        <thead>
          <tr>
            <th>Student</th>
            <th>Admission No</th>
            <th>Current Class</th>
            <th>Roll No</th>
            <th>Primary Guardian</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="peopleStore.students.length === 0">
            <td colspan="7" class="empty-cell">
              No students found matching current filters.
            </td>
          </tr>
          <tr v-for="student in peopleStore.students" :key="student.id" class="table-row">
            <td>
              <div class="person-cell">
                <div class="avatar" :class="student.gender.toLowerCase()">
                  {{ student.firstName[0] }}{{ student.lastName[0] }}
                </div>
                <div class="person-meta">
                  <div class="person-name">{{ student.fullName }}</div>
                  <div class="person-sub" v-if="student.apaarId">
                    <span class="apaar-tag">APAAR: {{ student.apaarId }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <span class="code-badge">{{ student.admissionNumber }}</span>
            </td>
            <td>
              <span v-if="student.currentEnrollment" class="placement-badge">
                {{ student.currentEnrollment.className }} - {{ student.currentEnrollment.sectionName }}
              </span>
              <span v-else class="text-muted">Not Placed</span>
            </td>
            <td>
              <span class="roll-number" v-if="student.currentEnrollment?.rollNumber">
                #{{ student.currentEnrollment.rollNumber }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <div v-if="student.primaryGuardian" class="guardian-brief">
                <div class="guardian-name">{{ student.primaryGuardian.name }}</div>
                <div class="guardian-contact">{{ student.primaryGuardian.phone }} ({{ student.primaryGuardian.relationship }})</div>
              </div>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <span class="status-pill" :class="student.status.toLowerCase()">
                {{ student.status }}
              </span>
            </td>
            <td class="text-right">
              <router-link
                :to="`/people/students/${student.id}`"
                class="btn-table-action"
                :id="`btn-view-student-${student.admissionNumber}`"
                title="View 360 Student Profile"
              >
                View 360 Profile
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 ml-1">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- GUARDIANS TAB -->
      <table v-else-if="activeTab === 'guardians'" class="data-table" id="table-guardians">
        <thead>
          <tr>
            <th>Guardian Name</th>
            <th>Relation</th>
            <th>Primary Phone</th>
            <th>Email</th>
            <th>Linked Children</th>
            <th>Occupation</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="peopleStore.guardians.length === 0">
            <td colspan="6" class="empty-cell">No guardian records found.</td>
          </tr>
          <tr v-for="g in peopleStore.guardians" :key="g.id" class="table-row">
            <td>
              <div class="person-cell">
                <div class="avatar guardian">
                  {{ g.name[0] }}
                </div>
                <div class="person-name">{{ g.name }}</div>
              </div>
            </td>
            <td>
              <span class="relationship-tag">{{ g.relationship }}</span>
            </td>
            <td>
              <a :href="`tel:${g.phone}`" class="contact-link">{{ g.phone }}</a>
            </td>
            <td>
              <span v-if="g.email">{{ g.email }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <div class="children-list">
                <span v-for="child in g.children" :key="child.studentId" class="child-pill">
                  {{ child.fullName }} ({{ child.admissionNumber }})
                </span>
                <span v-if="g.children.length === 0" class="text-muted">None</span>
              </div>
            </td>
            <td>{{ g.occupation || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- TEACHERS TAB -->
      <table v-else-if="activeTab === 'teachers'" class="data-table" id="table-teachers">
        <thead>
          <tr>
            <th>Teacher</th>
            <th>Employee Code</th>
            <th>Contact</th>
            <th>Qualification</th>
            <th>Specialization</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="peopleStore.teachers.length === 0">
            <td colspan="6" class="empty-cell">No teacher records found.</td>
          </tr>
          <tr v-for="t in peopleStore.teachers" :key="t.id" class="table-row">
            <td>
              <div class="person-cell">
                <div class="avatar teacher">
                  {{ t.firstName[0] }}{{ t.lastName[0] }}
                </div>
                <div class="person-meta">
                  <div class="person-name">{{ t.fullName }}</div>
                  <div class="person-sub">{{ t.email }}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="code-badge">{{ t.employeeCode }}</span>
            </td>
            <td>{{ t.phone || '—' }}</td>
            <td>{{ t.qualification || '—' }}</td>
            <td>{{ t.specialization || '—' }}</td>
            <td>
              <span class="status-pill" :class="t.status.toLowerCase()">
                {{ t.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- STUDENT ADMISSION MODAL (Multi-step / Sections) -->
    <div v-if="showAdmitModal" class="modal-overlay" @click.self="showAdmitModal = false">
      <div class="modal-card wide-modal">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="badge-dot"></span>
            <h3 class="modal-title">Admit New Student</h3>
          </div>
          <button @click="showAdmitModal = false" class="close-btn" id="btn-close-admit-modal">&times;</button>
        </div>

        <form @submit.prevent="submitStudentAdmission" class="modal-form">
          <div v-if="modalError" class="error-banner">{{ modalError }}</div>

          <!-- Section 1: Demographics -->
          <div class="form-section-title">1. Student Identity & Bio</div>
          <div class="form-row-3">
            <div class="form-group">
              <label>Admission Number *</label>
              <input v-model="admitForm.admissionNumber" type="text" required class="form-input" id="input-admission-no" />
            </div>
            <div class="form-group">
              <label>Admission Date *</label>
              <input v-model="admitForm.admissionDate" type="date" required class="form-input" id="input-admission-date" />
            </div>
            <div class="form-group">
              <label>APAAR ID (National Student ID)</label>
              <input v-model="admitForm.apaarId" type="text" placeholder="12-digit APAAR ID" class="form-input" id="input-apaar-id" />
            </div>
          </div>

          <div class="form-row-3">
            <div class="form-group">
              <label>First Name *</label>
              <input v-model="admitForm.firstName" type="text" required class="form-input" id="input-first-name" />
            </div>
            <div class="form-group">
              <label>Middle Name</label>
              <input v-model="admitForm.middleName" type="text" class="form-input" id="input-middle-name" />
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input v-model="admitForm.lastName" type="text" required class="form-input" id="input-last-name" />
            </div>
          </div>

          <div class="form-row-4">
            <div class="form-group">
              <label>Gender *</label>
              <select v-model="admitForm.gender" class="form-select" id="select-gender">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date of Birth *</label>
              <input v-model="admitForm.dateOfBirth" type="date" required class="form-input" id="input-dob" />
            </div>
            <div class="form-group">
              <label>Blood Group</label>
              <select v-model="admitForm.bloodGroup" class="form-select" id="select-blood-group">
                <option value="UNKNOWN">Unknown</option>
                <option value="A_POS">A+</option>
                <option value="A_NEG">A-</option>
                <option value="B_POS">B+</option>
                <option value="B_NEG">B-</option>
                <option value="AB_POS">AB+</option>
                <option value="AB_NEG">AB-</option>
                <option value="O_POS">O+</option>
                <option value="O_NEG">O-</option>
              </select>
            </div>
            <div class="form-group">
              <label>Social Category</label>
              <select v-model="admitForm.category" class="form-select" id="select-category">
                <option value="GENERAL">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
              </select>
            </div>
          </div>

          <!-- Section 2: Guardian Info -->
          <div class="form-section-title">2. Primary Guardian / Parent</div>
          <div class="form-row-3">
            <div class="form-group">
              <label>Guardian Name *</label>
              <input v-model="admitForm.guardianName" type="text" required class="form-input" id="input-guardian-name" />
            </div>
            <div class="form-group">
              <label>Relationship *</label>
              <select v-model="admitForm.guardianRelationship" class="form-select" id="select-guardian-rel">
                <option value="FATHER">Father</option>
                <option value="MOTHER">Mother</option>
                <option value="GUARDIAN">Local Guardian</option>
              </select>
            </div>
            <div class="form-group">
              <label>Phone Number *</label>
              <input v-model="admitForm.guardianPhone" type="tel" required placeholder="+91 98000 00000" class="form-input" id="input-guardian-phone" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Email Address</label>
              <input v-model="admitForm.guardianEmail" type="email" class="form-input" id="input-guardian-email" />
            </div>
            <div class="form-group">
              <label>Occupation</label>
              <input v-model="admitForm.guardianOccupation" type="text" class="form-input" id="input-guardian-occ" />
            </div>
          </div>

          <!-- Section 3: Academic Placement -->
          <div class="form-section-title">3. Initial Academic Placement</div>
          <div class="form-row-4">
            <div class="form-group">
              <label>Academic Session *</label>
              <select v-model="admitForm.academicYearId" required class="form-select" id="input-enrollment-year">
                <option v-for="y in academicsStore.academicYears" :key="y.id" :value="y.id">
                  {{ y.name }} {{ y.isCurrent ? '(Active)' : '' }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Class (Grade) *</label>
              <select v-model="admitForm.classId" required class="form-select" id="input-enrollment-class">
                <option value="">Select Class</option>
                <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Section *</label>
              <select v-model="admitForm.sectionId" required class="form-select" id="input-enrollment-section" :disabled="!admitForm.classId">
                <option value="">Select Section</option>
                <option v-for="s in modalAvailableSections" :key="s.id" :value="s.id">
                  Section {{ s.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Roll Number</label>
              <input v-model="admitForm.rollNumber" type="number" placeholder="e.g. 1" class="form-input" id="input-enrollment-roll" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showAdmitModal = false" class="btn btn-secondary" id="btn-cancel-admit">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="modalLoading" id="btn-submit-admit">
              {{ modalLoading ? 'Admitting Student...' : 'Admit & Enroll Student' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- TEACHER ONBOARDING MODAL -->
    <div v-if="showTeacherModal" class="modal-overlay" @click.self="showTeacherModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="badge-dot"></span>
            <h3 class="modal-title">Onboard Teacher / Faculty</h3>
          </div>
          <button @click="showTeacherModal = false" class="close-btn" id="btn-close-teacher-modal">&times;</button>
        </div>

        <form @submit.prevent="submitTeacherOnboarding" class="modal-form">
          <div v-if="modalError" class="error-banner">{{ modalError }}</div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Employee Code *</label>
              <input v-model="teacherForm.employeeCode" type="text" required class="form-input" id="input-teacher-empcode" />
            </div>
            <div class="form-group">
              <label>Joining Date *</label>
              <input v-model="teacherForm.joiningDate" type="date" required class="form-input" id="input-teacher-joining" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>First Name *</label>
              <input v-model="teacherForm.firstName" type="text" required class="form-input" id="input-teacher-first-name" />
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input v-model="teacherForm.lastName" type="text" required class="form-input" id="input-teacher-last-name" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Email Address (Portal Username) *</label>
              <input v-model="teacherForm.email" type="email" required class="form-input" id="input-teacher-email" />
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input v-model="teacherForm.phone" type="tel" class="form-input" id="input-teacher-phone" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Qualification</label>
              <input v-model="teacherForm.qualification" type="text" placeholder="e.g. M.Sc, B.Ed" class="form-input" id="input-teacher-qual" />
            </div>
            <div class="form-group">
              <label>Specialization / Subject</label>
              <input v-model="teacherForm.specialization" type="text" placeholder="e.g. Mathematics" class="form-input" id="input-teacher-spec" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showTeacherModal = false" class="btn btn-secondary" id="btn-cancel-teacher">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="modalLoading" id="btn-submit-teacher">
              {{ modalLoading ? 'Creating Profile...' : 'Create Teacher Account' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.directory-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
  letter-spacing: 0.05em;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0;
}

.page-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-muted);
  max-width: 650px;
  margin: var(--spacing-xs) 0 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
}

.metric-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-icon-box {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon-box.blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.metric-icon-box.purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}
.metric-icon-box.amber {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
.metric-icon-box.green {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.metric-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text-main);
  line-height: 1.2;
}

.metric-sub {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.tabs-nav {
  display: flex;
  gap: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-text-main);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.tab-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-muted);
}

.tab-btn.active .tab-badge {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary);
}

.filters-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

@media (min-width: 768px) {
  .filters-card {
    flex-direction: row;
    align-items: center;
  }
}

.search-input-wrap {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--color-text-muted);
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem 0.625rem 2.5rem;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-main);
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--transition-fast);
}

.search-input:focus {
  border-color: var(--color-primary);
}

.filters-selectors {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.625rem 0.875rem;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-main);
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
}

.table-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}

.data-table th {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
}

.data-table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-main);
  vertical-align: middle;
}

.table-row:hover td {
  background: var(--color-surface-hover);
}

.person-cell {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.avatar.male {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}
.avatar.female {
  background: linear-gradient(135deg, #ec4899, #be185d);
}
.avatar.other {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}
.avatar.guardian {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.avatar.teacher {
  background: linear-gradient(135deg, #10b981, #047857);
}

.person-meta {
  display: flex;
  flex-direction: column;
}

.person-name {
  font-weight: 600;
  color: var(--color-text-main);
}

.person-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.apaar-tag {
  display: inline-block;
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 0.125rem 0.375rem;
  font-size: 0.6875rem;
  font-family: monospace;
}

.code-badge {
  font-family: monospace;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.placement-badge {
  display: inline-block;
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.8125rem;
}

.roll-number {
  font-weight: 700;
  color: var(--color-text-main);
}

.status-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-pill.enrolled,
.status-pill.active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-pill.on_leave {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-pill.alumni,
.status-pill.resigned {
  background: rgba(156, 163, 175, 0.1);
  color: #9ca3af;
  border: 1px solid rgba(156, 163, 175, 0.2);
}

.status-pill.transferred,
.status-pill.withdrawn {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.guardian-brief {
  display: flex;
  flex-direction: column;
}

.guardian-name {
  font-weight: 500;
}

.guardian-contact {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.children-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.child-pill {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.contact-link {
  color: var(--color-primary);
  text-decoration: none;
}
.contact-link:hover {
  text-decoration: underline;
}

.relationship-tag {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}

.btn-table-action {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn-table-action:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: var(--color-primary);
}

.empty-cell {
  text-align: center;
  padding: var(--spacing-xl) !important;
  color: var(--color-text-muted);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  z-index: 1000;
}

.modal-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.modal-card.wide-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.modal-form {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 0.375rem;
  border-bottom: 1px dashed var(--color-border);
  margin-top: 0.5rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
}

.form-row-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
}

.form-row-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.form-input,
.form-select {
  padding: 0.625rem 0.875rem;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-main);
  font-size: 0.875rem;
  outline: none;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--color-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.error-banner {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: #ef4444;
  font-size: 0.875rem;
}

.text-right {
  text-align: right;
}

.text-muted {
  color: var(--color-text-muted);
}
</style>
