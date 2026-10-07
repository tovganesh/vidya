<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAttendanceStore, AttendanceStatus, AttendanceStudentRosterItem } from '../../stores/attendance.js';
import { useAcademicsStore } from '../../stores/academics.js';

const attendanceStore = useAttendanceStore();
const academicsStore = useAcademicsStore();

const selectedClassId = ref('');
const selectedSectionId = ref('');
const selectedDate = ref(new Date().toISOString().slice(0, 10));

const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

// Local working copy of roster status & remarks for instant feedback
interface LocalRosterItem {
  enrollmentId: string;
  studentId: string;
  rollNumber: number | null;
  admissionNumber: string;
  fullName: string;
  gender: string;
  status: AttendanceStatus;
  remarks: string;
}

const localRoster = ref<LocalRosterItem[]>([]);

// Filter sections based on selected class
const availableSections = computed(() => {
  if (!selectedClassId.value) return academicsStore.sections;
  return academicsStore.sections.filter((s) => s.classId === selectedClassId.value);
});

// Live Stats computed from local working roster
const stats = computed(() => {
  let present = 0;
  let absent = 0;
  let late = 0;
  let halfDay = 0;
  let excused = 0;

  for (const item of localRoster.value) {
    if (item.status === 'PRESENT') present++;
    else if (item.status === 'ABSENT') absent++;
    else if (item.status === 'LATE') late++;
    else if (item.status === 'HALF_DAY') halfDay++;
    else if (item.status === 'EXCUSED') excused++;
  }

  const total = localRoster.value.length;
  const percentage = total > 0 ? Math.round(((present + late + halfDay * 0.5) / total) * 100) : 0;

  return { total, present, absent, late, halfDay, excused, percentage };
});

onMounted(async () => {
  await Promise.all([
    academicsStore.fetchClasses(),
    academicsStore.fetchSections(),
  ]);

  // Default to first class and section if available
  if (academicsStore.classes.length > 0) {
    const defaultClass = academicsStore.classes.find((c) => c.code === 'STD-10') || academicsStore.classes[0]!;
    selectedClassId.value = defaultClass.id;

    const defaultSection = academicsStore.sections.find((s) => s.classId === defaultClass.id && s.name === 'A') ||
      academicsStore.sections.find((s) => s.classId === defaultClass.id) ||
      academicsStore.sections[0];

    if (defaultSection) {
      selectedSectionId.value = defaultSection.id;
      await loadSheet();
    }
  }
});

// Watch section or date changes to reload sheet
watch([selectedSectionId, selectedDate], async ([newSec, newDate]) => {
  if (newSec && newDate) {
    await loadSheet();
  }
});

watch(selectedClassId, (newClassId) => {
  const sectionsForClass = academicsStore.sections.filter((s) => s.classId === newClassId);
  if (sectionsForClass.length > 0 && !sectionsForClass.some((s) => s.id === selectedSectionId.value)) {
    selectedSectionId.value = sectionsForClass[0]!.id;
  }
});

async function loadSheet() {
  if (!selectedSectionId.value || !selectedDate.value) return;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const data = await attendanceStore.fetchSheet(selectedSectionId.value, selectedDate.value);
    localRoster.value = data.students.map((s: AttendanceStudentRosterItem) => ({
      enrollmentId: s.enrollmentId,
      studentId: s.studentId,
      rollNumber: s.rollNumber,
      admissionNumber: s.admissionNumber,
      fullName: s.fullName,
      gender: s.gender,
      status: s.status,
      remarks: s.remarks || '',
    }));
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to load attendance sheet';
  }
}

function setStudentStatus(index: number, status: AttendanceStatus) {
  if (localRoster.value[index]) {
    localRoster.value[index]!.status = status;
  }
}

function markAllPresent() {
  for (const item of localRoster.value) {
    item.status = 'PRESENT';
  }
}

async function submitAttendance() {
  if (!selectedSectionId.value || !selectedDate.value) return;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const records = localRoster.value.map((item) => ({
      enrollmentId: item.enrollmentId,
      status: item.status,
      remarks: item.remarks.trim() || undefined,
    }));

    await attendanceStore.recordBatch(selectedSectionId.value, selectedDate.value, records);
    successMessage.value = `Attendance successfully recorded for ${records.length} students!`;
    setTimeout(() => {
      successMessage.value = null;
    }, 4000);
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save attendance';
  }
}
</script>

<template>
  <div class="rollcall-container" id="attendance-rollcall-view">
    <!-- View Header -->
    <div class="view-header">
      <div class="header-titles">
        <div class="title-row">
          <h1>Daily Attendance Roll Call</h1>
          <span v-if="attendanceStore.currentSheet?.isMarked" class="badge badge-emerald">Recorded</span>
          <span v-else class="badge badge-amber">Unmarked</span>
        </div>
        <p class="subtitle">Fast, mobile-optimized daily classroom attendance marking for teachers</p>
      </div>

      <div class="header-actions">
        <router-link to="/attendance/register" class="btn btn-secondary" id="go-to-register-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Monthly Register
        </router-link>
        <button
          class="btn btn-primary"
          :disabled="attendanceStore.saving || localRoster.length === 0"
          id="submit-attendance-top-btn"
          @click="submitAttendance"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ attendanceStore.saving ? 'Saving...' : 'Submit Attendance' }}
        </button>
      </div>
    </div>

    <!-- Alert Notifications -->
    <div v-if="successMessage" class="alert-banner alert-success" id="rollcall-success-alert">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="alert-icon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <div v-if="errorMessage" class="alert-banner alert-error" id="rollcall-error-alert">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="alert-icon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Filter & Selector Bar -->
    <div class="card control-panel" id="rollcall-controls">
      <div class="selector-group">
        <div class="field-item">
          <label for="class-select">Class / Grade</label>
          <select id="class-select" v-model="selectedClassId">
            <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="field-item">
          <label for="section-select">Section</label>
          <select id="section-select" v-model="selectedSectionId">
            <option v-for="s in availableSections" :key="s.id" :value="s.id">
              Section {{ s.name }}
            </option>
          </select>
        </div>

        <div class="field-item">
          <label for="attendance-date">Roll Call Date</label>
          <input
            type="date"
            id="attendance-date"
            v-model="selectedDate"
          />
        </div>
      </div>

      <div class="shortcut-actions">
        <button
          type="button"
          class="btn btn-secondary shortcut-btn"
          id="mark-all-present-btn"
          @click="markAllPresent"
          :disabled="localRoster.length === 0"
        >
          <span class="icon-dot dot-emerald"></span>
          Mark All Present
        </button>
      </div>
    </div>

    <!-- Live Attendance Counters Bar -->
    <div class="stats-grid" id="live-attendance-counters">
      <div class="card stat-card total-card">
        <span class="stat-label">Total Roll Call</span>
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-sub">Enrolled Students</span>
      </div>

      <div class="card stat-card present-card">
        <span class="stat-label">Present</span>
        <span class="stat-value color-emerald">{{ stats.present }}</span>
        <span class="stat-sub">{{ stats.percentage }}% Attendance</span>
      </div>

      <div class="card stat-card absent-card">
        <span class="stat-label">Absent</span>
        <span class="stat-value color-rose">{{ stats.absent }}</span>
        <span class="stat-sub">Action: Push alert</span>
      </div>

      <div class="card stat-card late-card">
        <span class="stat-label">Late Arrival</span>
        <span class="stat-value color-amber">{{ stats.late }}</span>
        <span class="stat-sub">Marked with note</span>
      </div>
    </div>

    <!-- Roster Student List -->
    <div class="card roster-card" id="student-roster-card">
      <div v-if="attendanceStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Fetching classroom student roster...</p>
      </div>

      <div v-else-if="localRoster.length === 0" class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="empty-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3>No active student enrollments</h3>
        <p>No active students are currently enrolled in this section for the active session.</p>
      </div>

      <div v-else class="roster-list">
        <div
          v-for="(student, index) in localRoster"
          :key="student.enrollmentId"
          class="roster-row"
          :class="`status-${student.status.toLowerCase()}`"
          :id="`roster-row-${student.enrollmentId}`"
        >
          <!-- Left: Roll & Details -->
          <div class="student-info">
            <span class="roll-badge" title="Class Roll Number">
              #{{ student.rollNumber ?? (index + 1) }}
            </span>
            <div class="avatar-circle">
              {{ student.fullName.charAt(0) }}
            </div>
            <div class="name-meta">
              <span class="student-name">{{ student.fullName }}</span>
              <span class="admission-code">{{ student.admissionNumber }}</span>
            </div>
          </div>

          <!-- Middle: Status Toggle Buttons (One-Tap Touch Targets) -->
          <div class="status-btn-group" role="group" aria-label="Attendance Status">
            <button
              type="button"
              class="status-toggle-btn toggle-present"
              :class="{ active: student.status === 'PRESENT' }"
              title="Mark Present"
              @click="setStudentStatus(index, 'PRESENT')"
            >
              <span class="toggle-key">P</span>
              <span class="toggle-text">Present</span>
            </button>

            <button
              type="button"
              class="status-toggle-btn toggle-absent"
              :class="{ active: student.status === 'ABSENT' }"
              title="Mark Absent"
              @click="setStudentStatus(index, 'ABSENT')"
            >
              <span class="toggle-key">A</span>
              <span class="toggle-text">Absent</span>
            </button>

            <button
              type="button"
              class="status-toggle-btn toggle-late"
              :class="{ active: student.status === 'LATE' }"
              title="Mark Late"
              @click="setStudentStatus(index, 'LATE')"
            >
              <span class="toggle-key">L</span>
              <span class="toggle-text">Late</span>
            </button>

            <button
              type="button"
              class="status-toggle-btn toggle-halfday"
              :class="{ active: student.status === 'HALF_DAY' }"
              title="Mark Half Day"
              @click="setStudentStatus(index, 'HALF_DAY')"
            >
              <span class="toggle-key">H</span>
              <span class="toggle-text">Half Day</span>
            </button>
          </div>

          <!-- Right: Quick Remarks Note -->
          <div class="remarks-cell">
            <input
              type="text"
              v-model="student.remarks"
              placeholder="Add remark (e.g. sick, traffic)..."
              class="remarks-input"
              :id="`remark-input-${student.enrollmentId}`"
            />
          </div>
        </div>
      </div>

      <!-- Bottom Submit Bar -->
      <div v-if="localRoster.length > 0" class="roster-footer">
        <div class="footer-info">
          <span>{{ stats.present }} of {{ stats.total }} students marked present</span>
        </div>
        <button
          class="btn btn-primary submit-bottom-btn"
          :disabled="attendanceStore.saving"
          id="submit-attendance-bottom-btn"
          @click="submitAttendance"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ attendanceStore.saving ? 'Submitting Attendance...' : 'Save & Submit Roll Call' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rollcall-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* Alert Banners */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
}

.alert-success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: var(--color-emerald-400);
}

.alert-error {
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: var(--color-rose-400);
}

.alert-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Control Panel */
.control-panel {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 1.25rem;
}

.selector-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-item label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-item select,
.field-item input {
  min-width: 180px;
}

.icon-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-emerald {
  background-color: var(--color-emerald-500);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0.25rem 0;
  line-height: 1.2;
}

.stat-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.color-emerald { color: var(--color-emerald-400); }
.color-rose { color: var(--color-rose-400); }
.color-amber { color: var(--color-amber-400); }

/* Roster List Card */
.roster-card {
  padding: 0;
  overflow: hidden;
}

.roster-list {
  display: flex;
  flex-direction: column;
}

.roster-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--color-card-border);
  transition: background-color var(--duration-fast);
  gap: 1rem;
}

.roster-row:hover {
  background-color: var(--color-surface-hover);
}

.student-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 240px;
}

.roll-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--color-surface-raised);
  color: var(--text-muted);
  border: 1px solid var(--color-card-border);
  padding: 0.2rem 0.45rem;
  border-radius: var(--radius-sm);
}

.avatar-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-cyan-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: white;
}

.name-meta {
  display: flex;
  flex-direction: column;
}

.student-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.admission-code {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Status Buttons Group */
.status-btn-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-surface-raised);
  padding: 0.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-card-border);
}

.status-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.toggle-key {
  font-size: 0.7rem;
  font-weight: 800;
  opacity: 0.85;
}

.status-toggle-btn.toggle-present.active {
  background: var(--color-emerald-500);
  color: white;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
}

.status-toggle-btn.toggle-absent.active {
  background: var(--color-rose-500);
  color: white;
  box-shadow: 0 2px 6px rgba(244, 63, 94, 0.35);
}

.status-toggle-btn.toggle-late.active {
  background: var(--color-amber-500);
  color: white;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.35);
}

.status-toggle-btn.toggle-halfday.active {
  background: var(--color-primary-500);
  color: white;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);
}

.remarks-cell {
  flex: 1;
  max-width: 280px;
}

.remarks-input {
  width: 100%;
  font-size: 0.8rem;
  padding: 0.4rem 0.65rem;
}

/* Bottom Footer */
.roster-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--color-surface-raised);
  border-top: 1px solid var(--color-card-border);
}

.footer-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Loading & Empty states */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem;
  gap: 1rem;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--text-muted);
}

@media (max-width: 850px) {
  .roster-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .status-btn-group {
    width: 100%;
    justify-content: space-between;
  }

  .status-toggle-btn {
    flex: 1;
    justify-content: center;
  }

  .remarks-cell {
    width: 100%;
    max-width: 100%;
  }
}
</style>
