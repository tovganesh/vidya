<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { usePeopleStore, EnrollmentItem } from '../../stores/people.js';
import { useAcademicsStore } from '../../stores/academics.js';

const peopleStore = usePeopleStore();
const academicsStore = useAcademicsStore();

// Step 1 & 2 selections
const sourceYearId = ref('');
const sourceClassId = ref('');
const sourceSectionId = ref('');

const targetYearId = ref('');
const targetClassId = ref('');
const targetSectionId = ref('');

// Step 3 student list
interface StudentPromotionRow {
  studentId: string;
  admissionNumber: string;
  fullName: string;
  currentRollNumber: number | null;
  selected: boolean;
  status: 'PROMOTED' | 'RETAINED' | 'TRANSFERRED_OUT' | 'DROPPED';
  targetRollNumber: number | null;
  remarks: string;
}

const studentRows = ref<StudentPromotionRow[]>([]);
const loadingStudents = ref(false);
const executing = ref(false);
const errorMessage = ref<string | null>(null);
const successSummary = ref<any | null>(null);

onMounted(async () => {
  await Promise.all([
    academicsStore.fetchAcademicYears(),
    academicsStore.fetchClasses(),
  ]);

  const activeYear = academicsStore.currentAcademicYear;
  if (activeYear) {
    sourceYearId.value = activeYear.id;
  }
});

const sourceSections = computed(() => {
  if (!sourceClassId.value) return [];
  const cls = academicsStore.classes.find((c) => c.id === sourceClassId.value);
  return cls?.sections || [];
});

const targetSections = computed(() => {
  if (!targetClassId.value) return [];
  const cls = academicsStore.classes.find((c) => c.id === targetClassId.value);
  return cls?.sections || [];
});

async function loadEnrolledStudents() {
  if (!sourceYearId.value || !sourceClassId.value || !sourceSectionId.value) {
    errorMessage.value = 'Please select source academic year, class, and section';
    return;
  }

  errorMessage.value = null;
  successSummary.value = null;
  loadingStudents.value = true;
  try {
    const res = await peopleStore.fetchEnrollments({
      academicYearId: sourceYearId.value,
      classId: sourceClassId.value,
      sectionId: sourceSectionId.value,
    });

    studentRows.value = res.map((e: EnrollmentItem, idx: number) => ({
      studentId: e.studentId,
      admissionNumber: e.admissionNumber,
      fullName: e.fullName,
      currentRollNumber: e.rollNumber ?? null,
      selected: true,
      status: 'PROMOTED',
      targetRollNumber: idx + 1,
      remarks: 'Annual batch promotion',
    }));
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to fetch enrolled students';
  } finally {
    loadingStudents.value = false;
  }
}

const allSelected = computed({
  get: () => studentRows.value.length > 0 && studentRows.value.every((r) => r.selected),
  set: (val: boolean) => {
    studentRows.value.forEach((r) => (r.selected = val));
  },
});

function markAll(status: 'PROMOTED' | 'RETAINED') {
  studentRows.value.forEach((r) => {
    if (r.selected) {
      r.status = status;
      r.remarks = status === 'PROMOTED' ? 'Annual batch promotion' : 'Retained in class';
    }
  });
}

function autoSequenceRollNumbers() {
  let counter = 1;
  studentRows.value.forEach((r) => {
    if (r.selected && (r.status === 'PROMOTED' || r.status === 'RETAINED')) {
      r.targetRollNumber = counter++;
    } else {
      r.targetRollNumber = null;
    }
  });
}

const selectedCount = computed(() => studentRows.value.filter((r) => r.selected).length);

async function executePromotion() {
  if (!targetYearId.value || !targetClassId.value || !targetSectionId.value) {
    errorMessage.value = 'Please select target academic year, class, and section';
    return;
  }

  if (targetYearId.value === sourceYearId.value) {
    errorMessage.value = 'Target academic year must be different from source academic year';
    return;
  }

  const selectedStudents = studentRows.value.filter((r) => r.selected);
  if (selectedStudents.length === 0) {
    errorMessage.value = 'Please select at least one student to promote';
    return;
  }

  errorMessage.value = null;
  executing.value = true;
  try {
    const payload = {
      sourceAcademicYearId: sourceYearId.value,
      targetAcademicYearId: targetYearId.value,
      targetClassId: targetClassId.value,
      targetSectionId: targetSectionId.value,
      promotions: selectedStudents.map((s) => ({
        studentId: s.studentId,
        status: s.status,
        targetRollNumber: s.targetRollNumber ?? undefined,
        remarks: s.remarks || undefined,
      })),
    };

    const res = await peopleStore.batchPromote(payload);
    successSummary.value = res.summary;
    studentRows.value = [];
  } catch (err: any) {
    errorMessage.value = err.message || 'Batch promotion execution failed';
  } finally {
    executing.value = false;
  }
}
</script>

<template>
  <div class="promotion-view" id="batch-promotion-page">
    <!-- Breadcrumb & Header -->
    <div class="header-section">
      <router-link to="/students" class="back-link" id="btn-back-to-people">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to People Directory
      </router-link>
      <div class="title-wrap">
        <div class="header-badge">
          <span class="badge-dot"></span>
          <span>LIFELONG ENROLLMENT LIFECYCLE</span>
        </div>
        <h1 class="page-title">Batch Student Promotion Engine</h1>
        <p class="page-subtitle">
          Promote, progress, or retain students across academic sessions. Prior historical records are permanently preserved while creating new session placements.
        </p>
      </div>
    </div>

    <!-- Alert / Error Banner -->
    <div v-if="errorMessage" class="error-banner" id="promotion-error-banner">
      {{ errorMessage }}
    </div>

    <!-- Success Summary Modal / Card -->
    <div v-if="successSummary" class="success-card" id="promotion-success-summary">
      <div class="success-icon-box">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-8 h-8 text-green-400">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="success-content">
        <h3 class="success-title">Batch Promotion Completed Successfully!</h3>
        <p class="success-desc">
          Processed <strong>{{ successSummary.totalProcessed }}</strong> student records into session
          <strong>{{ successSummary.targetAcademicYear }}</strong> ({{ successSummary.targetClass }} - {{ successSummary.targetSection }}).
        </p>
        <div class="stats-pills">
          <span class="stat-pill green">Promoted: {{ successSummary.promotedCount }}</span>
          <span class="stat-pill amber">Retained: {{ successSummary.retainedCount }}</span>
          <span class="stat-pill red" v-if="successSummary.transferredCount">Transferred: {{ successSummary.transferredCount }}</span>
        </div>
      </div>
      <router-link to="/students" class="btn btn-secondary">
        Return to Directory
      </router-link>
    </div>

    <!-- Wizard Steps Grid -->
    <div class="setup-grid">
      <!-- Step 1: Source Cohort -->
      <div class="setup-card">
        <div class="card-step-badge">STEP 1: SOURCE COHORT</div>
        <h3 class="card-title">Select Current Class & Section</h3>
        <p class="card-desc">Choose the originating cohort to progress from.</p>

        <div class="form-group">
          <label>Source Academic Session *</label>
          <select v-model="sourceYearId" class="form-select" id="select-source-year">
            <option v-for="y in academicsStore.academicYears" :key="y.id" :value="y.id">
              {{ y.name }} {{ y.isCurrent ? '(Active)' : '' }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Source Class *</label>
          <select
            v-model="sourceClassId"
            @change="sourceSectionId = ''"
            class="form-select"
            id="select-source-class"
          >
            <option value="">Select Class</option>
            <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Source Section *</label>
          <select
            v-model="sourceSectionId"
            class="form-select"
            id="select-source-section"
            :disabled="!sourceClassId"
          >
            <option value="">Select Section</option>
            <option v-for="s in sourceSections" :key="s.id" :value="s.id">
              Section {{ s.name }}
            </option>
          </select>
        </div>

        <button
          @click="loadEnrolledStudents"
          class="btn btn-primary mt-2"
          :disabled="!sourceYearId || !sourceClassId || !sourceSectionId || loadingStudents"
          id="btn-load-students"
        >
          {{ loadingStudents ? 'Loading Cohort...' : 'Load Enrolled Students' }}
        </button>
      </div>

      <!-- Step 2: Target Cohort -->
      <div class="setup-card">
        <div class="card-step-badge">STEP 2: TARGET PLACEMENT</div>
        <h3 class="card-title">Select Destination Class & Section</h3>
        <p class="card-desc">Choose the destination session and grade level.</p>

        <div class="form-group">
          <label>Target Academic Session *</label>
          <select v-model="targetYearId" class="form-select" id="select-target-year">
            <option value="">Select Target Session</option>
            <option v-for="y in academicsStore.academicYears" :key="y.id" :value="y.id">
              {{ y.name }} {{ y.isCurrent ? '(Active)' : '' }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Target Class *</label>
          <select
            v-model="targetClassId"
            @change="targetSectionId = ''"
            class="form-select"
            id="select-target-class"
          >
            <option value="">Select Target Class</option>
            <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Target Section *</label>
          <select
            v-model="targetSectionId"
            class="form-select"
            id="select-target-section"
            :disabled="!targetClassId"
          >
            <option value="">Select Target Section</option>
            <option v-for="s in targetSections" :key="s.id" :value="s.id">
              Section {{ s.name }} (Capacity: {{ s.capacity }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Step 3: Interactive Student Checklist -->
    <div v-if="studentRows.length > 0" class="checklist-section">
      <div class="checklist-header">
        <div class="checklist-info">
          <h3 class="checklist-title">Student Cohort List ({{ studentRows.length }} Enrolled)</h3>
          <p class="checklist-desc">
            Select individual students and adjust their destination action or roll numbers.
          </p>
        </div>
        <div class="checklist-actions">
          <button @click="markAll('PROMOTED')" class="btn btn-secondary btn-sm" id="btn-mark-all-promoted">
            Mark All Promoted
          </button>
          <button @click="markAll('RETAINED')" class="btn btn-secondary btn-sm" id="btn-mark-all-retained">
            Mark All Retained
          </button>
          <button @click="autoSequenceRollNumbers" class="btn btn-secondary btn-sm" id="btn-auto-sequence-roll">
            Auto-sequence Roll #
          </button>
        </div>
      </div>

      <div class="checklist-table-wrap">
        <table class="data-table" id="table-promotion-checklist">
          <thead>
            <tr>
              <th style="width: 40px">
                <input type="checkbox" v-model="allSelected" id="checkbox-select-all" />
              </th>
              <th>Roll #</th>
              <th>Student Name</th>
              <th>Admission No</th>
              <th>Progression Action</th>
              <th>Target Roll #</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in studentRows" :key="row.studentId" class="table-row">
              <td>
                <input type="checkbox" v-model="row.selected" :id="`checkbox-student-${row.admissionNumber}`" />
              </td>
              <td>
                <span class="roll-badge">{{ row.currentRollNumber ? `#${row.currentRollNumber}` : '—' }}</span>
              </td>
              <td>
                <div class="student-name-text">{{ row.fullName }}</div>
              </td>
              <td>
                <span class="code-badge">{{ row.admissionNumber }}</span>
              </td>
              <td>
                <select v-model="row.status" class="status-select" :class="row.status.toLowerCase()">
                  <option value="PROMOTED">Promoted</option>
                  <option value="RETAINED">Retained</option>
                  <option value="TRANSFERRED_OUT">Transferred Out</option>
                  <option value="DROPPED">Dropped / Withdrawn</option>
                </select>
              </td>
              <td>
                <input
                  v-model.number="row.targetRollNumber"
                  type="number"
                  class="roll-input"
                  placeholder="Roll #"
                />
              </td>
              <td>
                <input
                  v-model="row.remarks"
                  type="text"
                  class="remarks-input"
                  placeholder="Remarks..."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Execution Sticky Action Bar -->
      <div class="execute-bar">
        <div class="execute-info">
          Ready to progress <strong>{{ selectedCount }}</strong> selected students.
        </div>
        <button
          @click="executePromotion"
          class="btn btn-primary"
          :disabled="selectedCount === 0 || executing"
          id="btn-execute-promotion"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ executing ? 'Executing Batch Promotion...' : 'Execute Batch Promotion' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.promotion-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.header-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-primary);
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
  margin: 0;
}

.setup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-lg);
}

.setup-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.card-step-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.05em;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0;
}

.card-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
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

.form-select {
  padding: 0.625rem 0.875rem;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-main);
  font-size: 0.875rem;
  outline: none;
}

.form-select:focus {
  border-color: var(--color-primary);
}

/* Checklist section */
.checklist-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.checklist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.checklist-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0;
}

.checklist-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0 0;
}

.checklist-actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.checklist-table-wrap {
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
  border-bottom: 1px solid var(--color-border);
}

.data-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-main);
  vertical-align: middle;
}

.student-name-text {
  font-weight: 600;
  color: var(--color-text-main);
}

.code-badge {
  font-family: monospace;
  font-size: 0.8125rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem 0.4rem;
  border-radius: var(--radius-sm);
}

.roll-badge {
  font-weight: 600;
  color: var(--color-text-muted);
}

.status-select {
  padding: 0.375rem 0.625rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  font-size: 0.8125rem;
  font-weight: 600;
  outline: none;
}

.status-select.promoted {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
}

.status-select.retained {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.3);
}

.status-select.transferred_out,
.status-select.dropped {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.roll-input {
  width: 70px;
  padding: 0.375rem 0.5rem;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-main);
  font-size: 0.8125rem;
  outline: none;
}

.remarks-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-main);
  font-size: 0.8125rem;
  outline: none;
}

.execute-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.execute-info {
  font-size: 0.9375rem;
  color: var(--color-text-main);
}

.error-banner {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: #ef4444;
  font-size: 0.875rem;
}

.success-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  flex-wrap: wrap;
}

.success-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-content {
  flex: 1;
}

.success-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #10b981;
  margin: 0;
}

.success-desc {
  font-size: 0.875rem;
  color: var(--color-text-main);
  margin: 0.25rem 0 0.5rem 0;
}

.stats-pills {
  display: flex;
  gap: 0.5rem;
}

.stat-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
}

.stat-pill.green {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.stat-pill.amber {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.stat-pill.red {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.mt-2 {
  margin-top: 0.5rem;
}
</style>
