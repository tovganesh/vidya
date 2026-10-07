<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAttendanceStore } from '../../stores/attendance.js';
import { useAcademicsStore } from '../../stores/academics.js';

const attendanceStore = useAttendanceStore();
const academicsStore = useAcademicsStore();

const selectedClassId = ref('');
const selectedSectionId = ref('');

const currentDate = new Date();
const selectedYear = ref(currentDate.getFullYear());
const selectedMonth = ref(currentDate.getMonth() + 1);

const months = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' },
];

const availableSections = computed(() => {
  if (!selectedClassId.value) return academicsStore.sections;
  return academicsStore.sections.filter((s) => s.classId === selectedClassId.value);
});

// Days of the selected month
const daysInMonthList = computed(() => {
  const count = attendanceStore.monthlyRegister?.daysInMonth || new Date(selectedYear.value, selectedMonth.value, 0).getDate();
  const list = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(Date.UTC(selectedYear.value, selectedMonth.value - 1, i));
    const dayOfWeekShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getUTCDay()];
    const isSunday = d.getUTCDay() === 0;
    list.push({ day: i, dayOfWeekShort, isSunday });
  }
  return list;
});

// Students below 75% attendance threshold
const lowAttendanceCount = computed(() => {
  if (!attendanceStore.monthlyRegister) return 0;
  return attendanceStore.monthlyRegister.students.filter((s) => s.isBelowThreshold).length;
});

onMounted(async () => {
  await Promise.all([
    academicsStore.fetchClasses(),
    academicsStore.fetchSections(),
  ]);

  if (academicsStore.classes.length > 0) {
    const defaultClass = academicsStore.classes.find((c) => c.code === 'STD-10') || academicsStore.classes[0]!;
    selectedClassId.value = defaultClass.id;

    const defaultSection = academicsStore.sections.find((s) => s.classId === defaultClass.id && s.name === 'A') ||
      academicsStore.sections.find((s) => s.classId === defaultClass.id) ||
      academicsStore.sections[0];

    if (defaultSection) {
      selectedSectionId.value = defaultSection.id;
      await loadRegister();
    }
  }
});

watch([selectedSectionId, selectedYear, selectedMonth], async ([sec]) => {
  if (sec) {
    await loadRegister();
  }
});

watch(selectedClassId, (newClassId) => {
  const sectionsForClass = academicsStore.sections.filter((s) => s.classId === newClassId);
  if (sectionsForClass.length > 0 && !sectionsForClass.some((s) => s.id === selectedSectionId.value)) {
    selectedSectionId.value = sectionsForClass[0]!.id;
  }
});

async function loadRegister() {
  if (!selectedSectionId.value) return;
  await attendanceStore.fetchMonthlyRegister(selectedSectionId.value, selectedYear.value, selectedMonth.value);
}

function getDayKey(day: number): string {
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const monthStr = selectedMonth.value < 10 ? `0${selectedMonth.value}` : `${selectedMonth.value}`;
  return `${selectedYear.value}-${monthStr}-${dayStr}`;
}

function exportCsv() {
  if (!attendanceStore.monthlyRegister) return;
  const reg = attendanceStore.monthlyRegister;

  const header = ['Roll No', 'Admission No', 'Student Name', 'Present', 'Absent', 'Attendance %'];
  const rows = reg.students.map((s) => [
    s.rollNumber ?? '',
    s.admissionNumber,
    `"${s.studentName}"`,
    s.presentDays,
    s.absentDays,
    `${s.percentage}%`,
  ]);

  const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Attendance_${reg.section.className}_Sec${reg.section.name}_${reg.year}_${reg.month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div class="register-container" id="attendance-register-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-titles">
        <div class="title-row">
          <h1>Monthly Attendance Register</h1>
          <span class="badge badge-indigo">Class Heatmap</span>
        </div>
        <p class="subtitle">Complete monthly attendance matrix with percentage tracking and CBSE 75% rule indicators</p>
      </div>

      <div class="header-actions">
        <router-link to="/attendance" class="btn btn-secondary" id="back-to-rollcall-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
          </svg>
          Daily Roll Call
        </router-link>
        <button
          class="btn btn-secondary"
          :disabled="!attendanceStore.monthlyRegister"
          id="export-attendance-csv-btn"
          @click="exportCsv"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>
    </div>

    <!-- Filter Control Panel -->
    <div class="card control-panel" id="register-controls">
      <div class="field-item">
        <label for="reg-class-select">Class</label>
        <select id="reg-class-select" v-model="selectedClassId">
          <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>

      <div class="field-item">
        <label for="reg-section-select">Section</label>
        <select id="reg-section-select" v-model="selectedSectionId">
          <option v-for="s in availableSections" :key="s.id" :value="s.id">
            Section {{ s.name }}
          </option>
        </select>
      </div>

      <div class="field-item">
        <label for="reg-month-select">Month</label>
        <select id="reg-month-select" v-model="selectedMonth">
          <option v-for="m in months" :key="m.value" :value="m.value">
            {{ m.name }}
          </option>
        </select>
      </div>

      <div class="field-item">
        <label for="reg-year-select">Year</label>
        <select id="reg-year-select" v-model="selectedYear">
          <option :value="2026">2026</option>
          <option :value="2027">2027</option>
        </select>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div v-if="attendanceStore.monthlyRegister" class="stats-grid" id="register-summary-metrics">
      <div class="card stat-card">
        <span class="stat-label">Class Average Attendance</span>
        <span class="stat-value color-emerald">{{ attendanceStore.monthlyRegister.classAveragePercentage }}%</span>
        <span class="stat-sub">For {{ months.find(m => m.value === selectedMonth)?.name }} {{ selectedYear }}</span>
      </div>

      <div class="card stat-card">
        <span class="stat-label">Working Days Logged</span>
        <span class="stat-value">{{ attendanceStore.monthlyRegister.totalWorkingDays }}</span>
        <span class="stat-sub">Out of {{ attendanceStore.monthlyRegister.daysInMonth }} days in month</span>
      </div>

      <div class="card stat-card" :class="{ 'warning-card': lowAttendanceCount > 0 }">
        <span class="stat-label">Below 75% Threshold</span>
        <span class="stat-value" :class="lowAttendanceCount > 0 ? 'color-rose' : 'color-emerald'">
          {{ lowAttendanceCount }}
        </span>
        <span class="stat-sub">CBSE Mandated Minimum</span>
      </div>
    </div>

    <!-- Matrix Table Container -->
    <div class="card matrix-card" id="attendance-matrix-card">
      <div v-if="attendanceStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading monthly attendance matrix...</p>
      </div>

      <div v-else-if="!attendanceStore.monthlyRegister || attendanceStore.monthlyRegister.students.length === 0" class="empty-state">
        <p>No enrollment records found for this section.</p>
      </div>

      <div v-else class="matrix-wrapper">
        <table class="matrix-table" id="attendance-matrix-table">
          <thead>
            <tr>
              <th class="sticky-col-roll">#</th>
              <th class="sticky-col-name">Student</th>
              <th class="header-stat">P</th>
              <th class="header-stat">A</th>
              <th class="header-stat">%</th>
              <th
                v-for="d in daysInMonthList"
                :key="d.day"
                class="day-col-header"
                :class="{ 'sunday-col': d.isSunday }"
              >
                <span class="day-num">{{ d.day }}</span>
                <span class="day-name">{{ d.dayOfWeekShort }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="student in attendanceStore.monthlyRegister.students"
              :key="student.enrollmentId"
              class="matrix-row"
              :class="{ 'below-threshold-row': student.isBelowThreshold }"
            >
              <td class="sticky-col-roll font-mono">{{ student.rollNumber ?? '-' }}</td>
              <td class="sticky-col-name">
                <div class="student-name-box">
                  <span class="student-name-text">{{ student.studentName }}</span>
                  <span v-if="student.isBelowThreshold" class="pill-warning" title="Below CBSE 75% Minimum">
                    &lt;75%
                  </span>
                </div>
              </td>
              <td class="stat-cell color-emerald font-semibold">{{ student.presentDays }}</td>
              <td class="stat-cell color-rose font-semibold">{{ student.absentDays }}</td>
              <td class="stat-cell font-bold">
                <span :class="student.percentage >= 75 ? 'color-emerald' : 'color-rose'">
                  {{ student.percentage }}%
                </span>
              </td>

              <!-- Daily Cells -->
              <td
                v-for="d in daysInMonthList"
                :key="d.day"
                class="day-cell"
                :class="{ 'sunday-cell': d.isSunday }"
              >
                <template v-if="!d.isSunday">
                  <span
                    v-if="student.dailyAttendance[getDayKey(d.day)] === 'PRESENT'"
                    class="dot dot-present"
                    title="Present"
                  >P</span>
                  <span
                    v-else-if="student.dailyAttendance[getDayKey(d.day)] === 'ABSENT'"
                    class="dot dot-absent"
                    title="Absent"
                  >A</span>
                  <span
                    v-else-if="student.dailyAttendance[getDayKey(d.day)] === 'LATE'"
                    class="dot dot-late"
                    title="Late"
                  >L</span>
                  <span
                    v-else-if="student.dailyAttendance[getDayKey(d.day)] === 'HALF_DAY'"
                    class="dot dot-halfday"
                    title="Half Day"
                  >H</span>
                  <span v-else class="dot dot-empty">-</span>
                </template>
                <template v-else>
                  <span class="sunday-dash"></span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-container {
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

/* Control Panel */
.control-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 1.25rem;
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

.field-item select {
  min-width: 160px;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
}

.stat-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.warning-card {
  border-color: rgba(244, 63, 94, 0.4);
}

.color-emerald { color: var(--color-emerald-400); }
.color-rose { color: var(--color-rose-400); }

/* Matrix Table */
.matrix-card {
  padding: 0;
  overflow: hidden;
}

.matrix-wrapper {
  overflow-x: auto;
  max-height: 700px;
}

.matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: center;
  font-size: 0.8rem;
}

.matrix-table th {
  background: var(--color-surface-raised);
  padding: 0.5rem 0.4rem;
  border-bottom: 1px solid var(--color-card-border);
  border-right: 1px solid var(--color-card-border);
  color: var(--text-muted);
  position: sticky;
  top: 0;
  z-index: 20;
}

.matrix-table td {
  padding: 0.5rem 0.35rem;
  border-bottom: 1px solid var(--color-card-border);
  border-right: 1px solid var(--color-card-border);
  color: var(--text-secondary);
}

.sticky-col-roll {
  position: sticky;
  left: 0;
  background: var(--color-surface);
  z-index: 10;
  width: 45px;
  min-width: 45px;
}

.sticky-col-name {
  position: sticky;
  left: 45px;
  background: var(--color-surface);
  z-index: 10;
  text-align: left;
  min-width: 180px;
  padding-left: 0.75rem !important;
}

th.sticky-col-roll,
th.sticky-col-name {
  z-index: 30;
  background: var(--color-surface-raised);
}

.student-name-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.student-name-text {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.pill-warning {
  background: rgba(244, 63, 94, 0.15);
  color: var(--color-rose-400);
  border: 1px solid rgba(244, 63, 94, 0.3);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
}

.day-col-header {
  min-width: 32px;
  padding: 0.35rem 0.2rem;
}

.day-num {
  display: block;
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.8rem;
}

.day-name {
  display: block;
  font-size: 0.65rem;
  color: var(--text-muted);
}

.sunday-col,
.sunday-cell {
  background: rgba(0, 0, 0, 0.05);
}

.sunday-dash {
  display: inline-block;
  width: 8px;
  height: 2px;
  background: var(--text-muted);
  opacity: 0.4;
}

.dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 0.7rem;
}

.dot-present {
  background: rgba(16, 185, 129, 0.18);
  color: var(--color-emerald-400);
}

.dot-absent {
  background: rgba(244, 63, 94, 0.2);
  color: var(--color-rose-400);
}

.dot-late {
  background: rgba(245, 158, 11, 0.2);
  color: var(--color-amber-400);
}

.dot-halfday {
  background: rgba(99, 102, 241, 0.2);
  color: var(--color-primary-400);
}

.dot-empty {
  color: var(--text-muted);
  opacity: 0.4;
}

.below-threshold-row td {
  background: rgba(244, 63, 94, 0.03);
}

/* Loading & Empty */
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
</style>
