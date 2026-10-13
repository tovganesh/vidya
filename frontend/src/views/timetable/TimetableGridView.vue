<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTimetableStore, DayOfWeek, TimetableSlot } from '../../stores/timetable.js';
import { useAcademicsStore } from '../../stores/academics.js';
import { usePeopleStore } from '../../stores/people.js';
import { useAuthStore } from '../../stores/auth.js';
import { useDiaryStore, DailyDiaryEntry } from '../../stores/diary.js';

const route = useRoute();
const timetableStore = useTimetableStore();
const academicsStore = useAcademicsStore();
const peopleStore = usePeopleStore();
const authStore = useAuthStore();
const diaryStore = useDiaryStore();

const activeTab = ref<'grid' | 'diary' | 'allocations'>('grid');

const selectedClassId = ref('');
const selectedSectionId = ref('');

// Daily Diary State
const selectedDiaryDate = ref<string>(new Date().toISOString().slice(0, 10));
const showDiaryModal = ref(false);
const diaryModalSubjectId = ref('');
const diaryModalClasswork = ref('');
const diaryModalHomework = ref('');
const diaryModalDueDate = ref('');
const diaryModalError = ref<string | null>(null);
const diaryModalSaving = ref(false);
const diaryFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const canWriteDiary = computed(() => !authStore.isStudentOrParent);

// Slot Edit Modal
const showSlotModal = ref(false);
const selectedDay = ref<DayOfWeek>('MONDAY');
const selectedPeriodId = ref('');
const modalSubjectId = ref('');
const modalTeacherId = ref('');
const modalRoomNumber = ref('');
const modalError = ref<string | null>(null);
const modalSaving = ref(false);

// Allocation Modal
const showAllocationModal = ref(false);
const allocTeacherId = ref('');
const allocSubjectId = ref('');
const allocIsClassTeacher = ref(false);
const allocError = ref<string | null>(null);

const availableSections = computed(() => {
  if (!selectedClassId.value) return academicsStore.sections;
  return academicsStore.sections.filter((s) => s.classId === selectedClassId.value);
});

const currentSection = computed(() => {
  return academicsStore.sections.find((s) => s.id === selectedSectionId.value);
});

const days: { key: DayOfWeek; label: string }[] = [
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
];

onMounted(async () => {
  await Promise.all([
    academicsStore.fetchClasses().catch(() => {}),
    academicsStore.fetchSections().catch(() => {}),
    academicsStore.fetchSubjects().catch(() => {}),
    peopleStore.fetchTeachers().catch(() => {}),
    peopleStore.fetchEnrollments().catch(() => {}),
    timetableStore.fetchPeriods().catch(() => {}),
  ]);

  if (route.query.tab === 'diary' || route.path.includes('/diary') || route.path.includes('/homework')) {
    activeTab.value = 'diary';
  }

  // Auto-lock class & section for Student and Parent
  if (authStore.isStudentOrParent && peopleStore.enrollments.length > 0) {
    const myEnr = peopleStore.enrollments[0];
    if (myEnr) {
      selectedClassId.value = myEnr.classId;
      selectedSectionId.value = myEnr.sectionId;
    }
  } else if (academicsStore.classes.length > 0) {
    const defaultClass = academicsStore.classes.find((c) => c.code === 'STD-10') || academicsStore.classes[0]!;
    selectedClassId.value = defaultClass.id;

    const defaultSection = academicsStore.sections.find((s) => s.classId === defaultClass.id && s.name === 'A') ||
      academicsStore.sections.find((s) => s.classId === defaultClass.id) ||
      academicsStore.sections[0];

    if (defaultSection) {
      selectedSectionId.value = defaultSection.id;
    }
  }

  if (selectedSectionId.value) {
    await refreshData();
    if (activeTab.value === 'diary') {
      await refreshDiaryData();
    }
  }
});

watch(selectedSectionId, async (newSecId) => {
  if (newSecId) {
    await refreshData();
    if (activeTab.value === 'diary') {
      await refreshDiaryData();
    }
  }
});

watch(selectedDiaryDate, async () => {
  if (activeTab.value === 'diary') {
    await refreshDiaryData();
  }
});

watch(activeTab, async (newTab) => {
  if (newTab === 'diary') {
    await refreshDiaryData();
  }
});

watch(selectedClassId, (newClassId) => {
  const sectionsForClass = academicsStore.sections.filter((s) => s.classId === newClassId);
  if (sectionsForClass.length > 0 && !sectionsForClass.some((s) => s.id === selectedSectionId.value)) {
    selectedSectionId.value = sectionsForClass[0]!.id;
  }
});

async function refreshData() {
  if (!selectedSectionId.value) return;
  await Promise.all([
    timetableStore.fetchSectionTimetable(selectedSectionId.value),
    timetableStore.fetchAllocations(selectedSectionId.value),
  ]);
}

async function refreshDiaryData() {
  if (!selectedSectionId.value) return;
  try {
    await diaryStore.fetchEntries({
      date: selectedDiaryDate.value,
      sectionId: selectedSectionId.value,
      classId: selectedClassId.value,
    });
  } catch {
    // Handled in store
  }
}

function getSlotFor(day: DayOfWeek, periodId: string): TimetableSlot | undefined {
  if (!timetableStore.currentTimetable) return undefined;
  const daySlots = timetableStore.currentTimetable.grid[day] || [];
  return daySlots.find((s) => s.periodId === periodId);
}

function openEditSlot(day: DayOfWeek, periodId: string) {
  if (!authStore.canManageTimetable) return;
  selectedDay.value = day;
  selectedPeriodId.value = periodId;
  modalError.value = null;

  const existing = getSlotFor(day, periodId);
  if (existing) {
    modalSubjectId.value = existing.subjectId || '';
    modalTeacherId.value = existing.teacherId || '';
    modalRoomNumber.value = existing.roomNumber || currentSection.value?.roomNumber || '';
  } else {
    modalSubjectId.value = '';
    modalTeacherId.value = '';
    modalRoomNumber.value = currentSection.value?.roomNumber || '';
  }

  showSlotModal.value = true;
}

async function handleSaveSlot() {
  if (!authStore.canManageTimetable) return;
  if (!selectedSectionId.value || !selectedPeriodId.value) return;
  modalError.value = null;
  modalSaving.value = true;

  try {
    await timetableStore.saveSlot({
      sectionId: selectedSectionId.value,
      dayOfWeek: selectedDay.value,
      periodId: selectedPeriodId.value,
      subjectId: modalSubjectId.value || null,
      teacherId: modalTeacherId.value || null,
      roomNumber: modalRoomNumber.value || null,
    });
    showSlotModal.value = false;
  } catch (err: any) {
    modalError.value = err.message || 'Failed to assign timetable slot';
  } finally {
    modalSaving.value = false;
  }
}

async function handleDeleteSlot(slotId: string) {
  if (!authStore.canManageTimetable) return;
  if (!confirm('Remove this timetable slot?')) return;
  try {
    await timetableStore.deleteSlot(slotId, selectedSectionId.value);
    showSlotModal.value = false;
  } catch (err: any) {
    modalError.value = err.message || 'Failed to remove slot';
  }
}

async function handleSaveAllocation() {
  if (!authStore.canManageTimetable) return;
  if (!selectedClassId.value || !selectedSectionId.value || !allocTeacherId.value) {
    allocError.value = 'Teacher is required';
    return;
  }

  allocError.value = null;
  try {
    await timetableStore.saveAllocation({
      teacherId: allocTeacherId.value,
      classId: selectedClassId.value,
      sectionId: selectedSectionId.value,
      subjectId: allocSubjectId.value || null,
      isClassTeacher: allocIsClassTeacher.value,
    });
    showAllocationModal.value = false;
    allocTeacherId.value = '';
    allocSubjectId.value = '';
    allocIsClassTeacher.value = false;
  } catch (err: any) {
    allocError.value = err.message || 'Failed to allocate teacher';
  }
}

// -------------------------------------------------------------
// Daily Diary Handlers (Classwork & Homework Notes)
// -------------------------------------------------------------
function openAddDiaryModal(subjectId?: string) {
  diaryModalSubjectId.value = subjectId || (academicsStore.subjects[0]?.id ?? '');
  diaryModalClasswork.value = '';
  diaryModalHomework.value = '';
  const tomorrow = new Date(selectedDiaryDate.value);
  tomorrow.setDate(tomorrow.getDate() + 1);
  diaryModalDueDate.value = tomorrow.toISOString().slice(0, 10);
  diaryModalError.value = null;
  showDiaryModal.value = true;
}

function editDiaryEntry(entry: DailyDiaryEntry) {
  diaryModalSubjectId.value = entry.subjectId;
  diaryModalClasswork.value = entry.classwork;
  diaryModalHomework.value = entry.homework || '';
  diaryModalDueDate.value = entry.dueDate ? entry.dueDate.slice(0, 10) : '';
  diaryModalError.value = null;
  showDiaryModal.value = true;
}

async function handleSaveDiaryEntry() {
  if (!canWriteDiary.value) return;
  if (!diaryModalSubjectId.value) {
    diaryModalError.value = 'Please select a subject';
    return;
  }
  if (!diaryModalClasswork.value.trim()) {
    diaryModalError.value = 'Classwork notes are required';
    return;
  }

  diaryModalSaving.value = true;
  diaryModalError.value = null;

  try {
    await diaryStore.saveEntry({
      classId: selectedClassId.value,
      sectionId: selectedSectionId.value,
      subjectId: diaryModalSubjectId.value,
      date: selectedDiaryDate.value,
      classwork: diaryModalClasswork.value.trim(),
      homework: diaryModalHomework.value.trim() || null,
      dueDate: diaryModalDueDate.value || null,
    });

    showDiaryModal.value = false;
    diaryFeedback.value = {
      type: 'success',
      message: 'Classwork & Homework notes saved successfully!',
    };
    setTimeout(() => {
      diaryFeedback.value = null;
    }, 4000);
    await refreshDiaryData();
  } catch (err: any) {
    diaryModalError.value = err.message || 'Failed to save diary entry';
  } finally {
    diaryModalSaving.value = false;
  }
}

async function handleDeleteDiaryEntry(id: string) {
  if (!canWriteDiary.value) return;
  if (!confirm('Are you sure you want to delete this diary entry?')) return;
  try {
    await diaryStore.deleteEntry(id);
    await refreshDiaryData();
  } catch (err: any) {
    alert(err.message || 'Failed to delete entry');
  }
}

function changeDiaryDate(deltaDays: number) {
  const d = new Date(selectedDiaryDate.value);
  d.setDate(d.getDate() + deltaDays);
  selectedDiaryDate.value = d.toISOString().slice(0, 10);
}

function setTodayDiaryDate() {
  selectedDiaryDate.value = new Date().toISOString().slice(0, 10);
}

function formatDiaryDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDueDateBadge(dueDateStr: string | null | undefined) {
  if (!dueDateStr) return null;
  try {
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    if (diffDays === -1) return 'Due Yesterday';
    if (diffDays < 0) return `Overdue (${Math.abs(diffDays)}d ago)`;
    return `Due: ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  } catch {
    return `Due: ${dueDateStr}`;
  }
}
</script>

<template>
  <div class="timetable-container" id="timetable-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-titles">
        <div class="title-row">
          <h1>Class Timetable & Teacher Allocations</h1>
          <span class="badge badge-indigo">Academic Schedule</span>
        </div>
        <p class="subtitle">Weekly class timetable grid, period scheduling, and automated teacher collision detection</p>
      </div>

      <div class="tab-pills">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'grid' }"
          id="tab-timetable-grid-btn"
          @click="activeTab = 'grid'"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tab-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Weekly Timetable
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'diary' }"
          id="tab-daily-diary-btn"
          @click="activeTab = 'diary'"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tab-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Daily Diary & Homework
        </button>
        <button
          v-if="authStore.canManageTimetable"
          class="tab-btn"
          :class="{ active: activeTab === 'allocations' }"
          id="tab-allocations-btn"
          @click="activeTab = 'allocations'"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tab-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Teacher Allocations
        </button>
      </div>
    </div>

    <!-- Section Filter Bar -->
    <div class="card control-panel" id="timetable-controls">
      <div class="filters-row">
        <div class="field-item">
          <label for="tt-class-select">Class</label>
          <select id="tt-class-select" v-model="selectedClassId" :disabled="authStore.isStudentOrParent">
            <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="field-item">
          <label for="tt-section-select">Section</label>
          <select id="tt-section-select" v-model="selectedSectionId" :disabled="authStore.isStudentOrParent">
            <option v-for="s in availableSections" :key="s.id" :value="s.id">
              Section {{ s.name }} ({{ s.roomNumber || 'Room Active' }})
            </option>
          </select>
        </div>

        <!-- Date navigation for Daily Diary tab -->
        <div v-if="activeTab === 'diary'" class="field-item diary-date-nav">
          <label for="diary-date-picker">Calendar Date</label>
          <div class="stepper-group">
            <button class="btn btn-secondary btn-icon-only" @click="changeDiaryDate(-1)" title="Previous Day">◀</button>
            <input
              type="date"
              id="diary-date-picker"
              class="date-picker-input"
              v-model="selectedDiaryDate"
            />
            <button class="btn btn-secondary btn-icon-only" @click="changeDiaryDate(1)" title="Next Day">▶</button>
            <button class="btn btn-secondary btn-sm" @click="setTodayDiaryDate">Today</button>
          </div>
        </div>
      </div>

      <div class="action-item">
        <button
          v-if="activeTab === 'diary' && canWriteDiary"
          class="btn btn-primary"
          id="open-diary-modal-btn"
          @click="openAddDiaryModal()"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Record Classwork & Homework
        </button>

        <button
          v-else-if="activeTab === 'allocations' && authStore.canManageTimetable"
          class="btn btn-primary"
          id="open-alloc-modal-btn"
          @click="showAllocationModal = true"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Assign Educator
        </button>
      </div>
    </div>

    <!-- Tab 1: Weekly Timetable Grid -->
    <div v-if="activeTab === 'grid'" class="card grid-card" id="timetable-grid-card">
      <div v-if="timetableStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading weekly class schedule...</p>
      </div>

      <div v-else class="table-scroll-box">
        <table class="timetable-grid-table" id="weekly-timetable-table">
          <thead>
            <tr>
              <th class="period-col-header">Period & Time</th>
              <th v-for="day in days" :key="day.key" class="day-header">
                {{ day.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="period in timetableStore.periods"
              :key="period.id"
              :class="{ 'break-row': period.isBreak }"
            >
              <!-- Period info cell -->
              <td class="period-info-cell">
                <span class="period-name">{{ period.name }}</span>
                <span class="period-time">{{ period.startTime }} – {{ period.endTime }}</span>
              </td>

              <!-- Days slots -->
              <td
                v-for="day in days"
                :key="`${day.key}-${period.id}`"
                class="slot-cell"
                :class="{ 'break-slot': period.isBreak }"
              >
                <!-- If Break period -->
                <div v-if="period.isBreak" class="break-pill">
                  <span>{{ period.name }}</span>
                </div>

                <!-- Teaching slot -->
                <div
                  v-else
                  class="slot-box"
                  :class="{
                    filled: Boolean(getSlotFor(day.key, period.id)),
                    clickable: authStore.canManageTimetable,
                  }"
                  @click="authStore.canManageTimetable ? openEditSlot(day.key, period.id) : undefined"
                  :title="authStore.canManageTimetable ? 'Click to assign or edit period' : undefined"
                >
                  <template v-if="getSlotFor(day.key, period.id)">
                    <div class="slot-content">
                      <span class="slot-subject">{{ getSlotFor(day.key, period.id)?.subject?.name || 'Assigned' }}</span>
                      <div class="slot-footer">
                        <span v-if="getSlotFor(day.key, period.id)?.teacher" class="slot-teacher">
                          {{ getSlotFor(day.key, period.id)?.teacher?.firstName }} {{ getSlotFor(day.key, period.id)?.teacher?.lastName }}
                        </span>
                        <span v-else class="slot-unassigned">No Teacher</span>
                        <span v-if="getSlotFor(day.key, period.id)?.roomNumber" class="slot-room">
                          {{ getSlotFor(day.key, period.id)?.roomNumber }}
                        </span>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="authStore.canManageTimetable" class="slot-empty">
                      <span class="plus-icon">+</span>
                      <span>Assign</span>
                    </div>
                    <div v-else class="slot-empty-readonly">
                      <span>—</span>
                    </div>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Daily Diary & Homework -->
    <div v-else-if="activeTab === 'diary'" class="diary-tab-content" id="daily-diary-content">
      <!-- Feedback Banner -->
      <div v-if="diaryFeedback" class="alert-banner alert-success mb-4" :class="diaryFeedback.type" role="alert">
        <span>{{ diaryFeedback.message }}</span>
        <button @click="diaryFeedback = null" class="close-btn">&times;</button>
      </div>

      <!-- Diary Header Card -->
      <div class="card diary-header-card">
        <div class="diary-date-banner">
          <div class="date-icon-box bg-indigo">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="banner-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2>{{ formatDiaryDate(selectedDiaryDate) }}</h2>
            <p class="subtitle">
              Daily Classwork Notes & Homework for Class {{ currentSection?.name ? academicsStore.classes.find(c => c.id === selectedClassId)?.name + ' - Section ' + currentSection?.name : 'Selected Section' }}
            </p>
          </div>
        </div>
        <div class="diary-meta-tags">
          <span class="badge badge-indigo">{{ diaryStore.entries.length }} Subjects Recorded</span>
          <span v-if="canWriteDiary" class="badge badge-emerald">Educator Portal</span>
          <span v-else class="badge badge-cyan">View Only (Student & Parent)</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="diaryStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Fetching classwork & homework notes...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="diaryStore.entries.length === 0" class="card empty-diary-card">
        <div class="empty-diary-illustration">
          <span class="empty-icon">📖</span>
        </div>
        <h3>No Notes Logged for {{ formatDiaryDate(selectedDiaryDate) }}</h3>
        <p class="empty-desc">
          There are no classwork or homework notes recorded for this section on the selected date.
        </p>
        <div v-if="canWriteDiary" class="mt-4">
          <button class="btn btn-primary" @click="openAddDiaryModal()">
            ➕ Record First Subject Notes
          </button>
        </div>
        <div v-else class="mt-2 text-xs text-muted">
          Use the calendar date picker above to check previous or upcoming class days.
        </div>
      </div>

      <!-- Entries Grid -->
      <div v-else class="diary-cards-grid">
        <div
          v-for="entry in diaryStore.entries"
          :key="entry.id"
          class="card diary-subject-card"
          :id="`diary-card-${entry.id}`"
        >
          <div class="card-subject-header">
            <div class="subject-title-group">
              <span class="subject-code-pill font-mono">{{ entry.subject.code }}</span>
              <span class="subject-name">{{ entry.subject.name }}</span>
            </div>

            <div class="subject-header-actions">
              <span v-if="entry.teacher?.user" class="teacher-tag">
                👨‍🏫 {{ entry.teacher.user.firstName }} {{ entry.teacher.user.lastName }}
              </span>
              <div v-if="canWriteDiary" class="action-buttons-group">
                <button
                  class="btn-icon-subtle"
                  title="Edit Notes"
                  @click="editDiaryEntry(entry)"
                >
                  ✎
                </button>
                <button
                  class="btn-icon-subtle text-rose-400"
                  title="Delete Entry"
                  @click="handleDeleteDiaryEntry(entry.id)"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>

          <!-- Classwork Box -->
          <div class="diary-section-box classwork-box">
            <div class="section-box-header">
              <span class="section-box-icon">📝</span>
              <span class="section-box-title">Classwork & Topics Covered Today</span>
            </div>
            <p class="section-box-content">{{ entry.classwork }}</p>
          </div>

          <!-- Homework Box -->
          <div class="diary-section-box homework-box" :class="{ 'has-hw': !!entry.homework }">
            <div class="section-box-header justify-between">
              <div class="flex items-center gap-1">
                <span class="section-box-icon">📚</span>
                <span class="section-box-title">Homework & Assignments</span>
              </div>
              <span
                v-if="entry.dueDate"
                class="badge"
                :class="entry.dueDate.slice(0, 10) <= selectedDiaryDate ? 'badge-amber' : 'badge-emerald'"
              >
                {{ formatDueDateBadge(entry.dueDate) }}
              </span>
            </div>
            <p v-if="entry.homework" class="section-box-content homework-text">{{ entry.homework }}</p>
            <p v-else class="section-box-content text-muted italic">No homework assigned for this subject.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: Teacher Allocations -->
    <div v-else-if="activeTab === 'allocations'" class="card allocations-card" id="allocations-table-card">
      <div class="allocations-header">
        <h3>Staff Allocations for Section {{ currentSection?.name }}</h3>
        <p class="subtitle">Designated Class Teachers and Subject Specialists</p>
      </div>

      <div v-if="timetableStore.allocations.length === 0" class="empty-state">
        <p>No teacher allocations assigned for this section yet.</p>
      </div>

      <div v-else class="allocations-list">
        <div
          v-for="alloc in timetableStore.allocations"
          :key="alloc.id"
          class="alloc-row"
          :class="{ 'class-teacher-row': alloc.isClassTeacher }"
        >
          <div class="alloc-teacher">
            <div class="avatar-circle">
              {{ alloc.teacher.firstName.charAt(0) }}
            </div>
            <div class="teacher-meta">
              <span class="teacher-name">{{ alloc.teacher.firstName }} {{ alloc.teacher.lastName }}</span>
              <span class="teacher-code">{{ alloc.teacher.employeeCode }} &bull; {{ alloc.teacher.specialization || 'General' }}</span>
            </div>
          </div>

          <div class="alloc-role">
            <span v-if="alloc.isClassTeacher" class="badge badge-emerald">
              Class Teacher
            </span>
            <span v-else class="badge badge-indigo">
              Subject Teacher
            </span>
          </div>

          <div class="alloc-subject">
            <span class="subject-tag">{{ alloc.subject?.name || 'Class Administration' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Slot Edit Modal -->
    <div v-if="showSlotModal" class="modal-backdrop" @click.self="showSlotModal = false" id="slot-edit-modal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Schedule Period: {{ selectedDay }}</h3>
          <button class="close-btn" @click="showSlotModal = false">&times;</button>
        </div>

        <div v-if="modalError" class="alert-banner alert-error modal-alert">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="alert-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ modalError }}</span>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="slot-subject-select">Subject</label>
            <select id="slot-subject-select" v-model="modalSubjectId">
              <option value="">-- Select Curriculum Subject --</option>
              <option v-for="sub in academicsStore.subjects" :key="sub.id" :value="sub.id">
                {{ sub.name }} ({{ sub.code }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="slot-teacher-select">Educator / Teacher</label>
            <select id="slot-teacher-select" v-model="modalTeacherId">
              <option value="">-- No Teacher Assigned --</option>
              <option v-for="t in peopleStore.teachers" :key="t.id" :value="t.id">
                {{ t.firstName }} {{ t.lastName }} ({{ t.employeeCode }})
              </option>
            </select>
            <span class="hint-text">Vidya conflict avoidance engine automatically prevents teacher overlap</span>
          </div>

          <div class="form-group">
            <label for="slot-room-input">Room / Classroom Number</label>
            <input
              type="text"
              id="slot-room-input"
              v-model="modalRoomNumber"
              placeholder="e.g. Room-10A or Physics Lab"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="getSlotFor(selectedDay, selectedPeriodId)"
            type="button"
            class="btn btn-secondary delete-btn"
            @click="handleDeleteSlot(getSlotFor(selectedDay, selectedPeriodId)!.id)"
          >
            Clear Slot
          </button>
          <button type="button" class="btn btn-secondary" @click="showSlotModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="modalSaving"
            id="save-slot-btn"
            @click="handleSaveSlot"
          >
            {{ modalSaving ? 'Saving...' : 'Save Schedule' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Teacher Allocation Modal -->
    <div v-if="showAllocationModal" class="modal-backdrop" @click.self="showAllocationModal = false" id="alloc-modal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Assign Educator to Section {{ currentSection?.name }}</h3>
          <button class="close-btn" @click="showAllocationModal = false">&times;</button>
        </div>

        <div v-if="allocError" class="alert-banner alert-error modal-alert">
          <span>{{ allocError }}</span>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="alloc-teacher-select">Teacher</label>
            <select id="alloc-teacher-select" v-model="allocTeacherId">
              <option value="">-- Select Teacher --</option>
              <option v-for="t in peopleStore.teachers" :key="t.id" :value="t.id">
                {{ t.firstName }} {{ t.lastName }} ({{ t.employeeCode }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="alloc-subject-select">Subject</label>
            <select id="alloc-subject-select" v-model="allocSubjectId">
              <option value="">-- General / Class Administration --</option>
              <option v-for="sub in academicsStore.subjects" :key="sub.id" :value="sub.id">
                {{ sub.name }} ({{ sub.code }})
              </option>
            </select>
          </div>

          <div class="form-checkbox">
            <input
              type="checkbox"
              id="alloc-class-teacher-check"
              v-model="allocIsClassTeacher"
            />
            <label for="alloc-class-teacher-check">
              Designate as Official Class Teacher for Section {{ currentSection?.name }}
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showAllocationModal = false">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" id="save-allocation-btn" @click="handleSaveAllocation">
            Save Allocation
          </button>
        </div>
      </div>
    </div>

    <!-- Daily Diary Modal (Teachers & Leadership) -->
    <div v-if="showDiaryModal" class="modal-backdrop" @click.self="showDiaryModal = false" id="diary-modal">
      <div class="modal-card diary-modal-card">
        <div class="modal-header">
          <h3>Record Daily Classwork & Homework</h3>
          <button class="close-btn" @click="showDiaryModal = false">&times;</button>
        </div>

        <div v-if="diaryModalError" class="alert-banner alert-error modal-alert">
          <span>{{ diaryModalError }}</span>
        </div>

        <div class="modal-body">
          <div class="form-row-2">
            <div class="form-group">
              <label for="diary-subject-select">Subject *</label>
              <select id="diary-subject-select" v-model="diaryModalSubjectId">
                <option value="" disabled>-- Select Subject --</option>
                <option v-for="sub in academicsStore.subjects" :key="sub.id" :value="sub.id">
                  {{ sub.name }} ({{ sub.code }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="diary-modal-date">Calendar Date *</label>
              <input
                type="date"
                id="diary-modal-date"
                v-model="selectedDiaryDate"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="diary-classwork-input">Classwork Notes *</label>
            <textarea
              id="diary-classwork-input"
              v-model="diaryModalClasswork"
              rows="3"
              class="diary-textarea"
              placeholder="e.g. Chapter 4: Quadratic Equations — Solved Exercise 4.2 questions 1-8 on blackboard."
            ></textarea>
            <span class="hint-text">Summarize topics taught, board exercises, or experiments completed today.</span>
          </div>

          <div class="form-group">
            <label for="diary-homework-input">Homework Assignment (Optional)</label>
            <textarea
              id="diary-homework-input"
              v-model="diaryModalHomework"
              rows="2"
              class="diary-textarea"
              placeholder="e.g. Complete Exercise 4.2 questions 9-14 in homework notebook."
            ></textarea>
            <span class="hint-text">Assignments given to students to practice at home. Parents will see this on their daily calendar.</span>
          </div>

          <div class="form-group">
            <label for="diary-due-date-input">Submission Due Date</label>
            <input
              type="date"
              id="diary-due-date-input"
              v-model="diaryModalDueDate"
            />
            <span class="hint-text">Estimated due date for homework submission (defaults to next class day).</span>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showDiaryModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            id="save-diary-modal-btn"
            :disabled="diaryModalSaving"
            @click="handleSaveDiaryEntry"
          >
            {{ diaryModalSaving ? 'Saving...' : '💾 Save Classwork & Homework' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timetable-container {
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

.tab-pills {
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  padding: 0.25rem;
  border-radius: var(--radius-lg);
  gap: 0.25rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.tab-btn.active {
  background: var(--color-primary-500);
  color: white;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);
}

.tab-icon {
  width: 16px;
  height: 16px;
}

/* Control Panel */
.control-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  min-width: 220px;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* Timetable Grid */
.grid-card {
  padding: 0;
  overflow: hidden;
}

.table-scroll-box {
  overflow-x: auto;
}

.timetable-grid-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.timetable-grid-table th {
  background: var(--color-surface-raised);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-card-border);
  border-right: 1px solid var(--color-card-border);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.period-col-header {
  text-align: left !important;
  min-width: 160px;
  width: 160px;
}

.day-header {
  min-width: 160px;
}

.period-info-cell {
  background: var(--color-surface);
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-card-border);
  border-right: 1px solid var(--color-card-border);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.period-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.period-time {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.slot-cell {
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-card-border);
  border-right: 1px solid var(--color-card-border);
  vertical-align: top;
}

.break-row td {
  background: rgba(0, 0, 0, 0.03);
}

.break-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  border: 1px dashed var(--color-card-border);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.slot-box {
  min-height: 72px;
  border-radius: var(--radius-md);
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all var(--duration-fast);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
}

.slot-box.clickable {
  cursor: pointer;
}

.slot-box.clickable:hover {
  border-color: var(--color-primary-500);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.slot-box.filled {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.3);
}

.slot-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.slot-subject {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.slot-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  font-size: 0.75rem;
}

.slot-teacher {
  color: var(--color-primary-400);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-unassigned {
  color: var(--text-muted);
  font-style: italic;
}

.slot-room {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  font-size: 0.68rem;
  color: var(--text-muted);
}

.slot-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  opacity: 0.6;
}

.slot-empty:hover {
  opacity: 1;
  color: var(--color-primary-400);
}

.slot-empty-readonly {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  opacity: 0.4;
}

.plus-icon {
  font-size: 1rem;
}

/* Allocations Tab */
.allocations-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.allocations-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.alloc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-card-border);
  background: var(--color-card);
  gap: 1rem;
}

.alloc-row:last-child {
  border-bottom: none;
}

.class-teacher-row {
  background: rgba(16, 185, 129, 0.05);
}

.alloc-teacher {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 260px;
}

.avatar-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-cyan-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: white;
}

.teacher-meta {
  display: flex;
  flex-direction: column;
}

.teacher-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.teacher-code {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.subject-tag {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-card {
  background: var(--color-surface);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-xl);
  max-width: 520px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.015);
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 150ms ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #cbd5e1;
  letter-spacing: 0.01em;
}

.modal-body select,
.modal-body input {
  width: 100%;
  height: 2.625rem;
  padding: 0.5rem 0.875rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  color: #f8fafc;
  font-size: 0.875rem;
  outline: none;
  transition: all var(--duration-fast);
}

.modal-body select:focus,
.modal-body input:focus {
  background: rgba(15, 23, 42, 0.95);
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

.hint-text {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-card-border);
  background: var(--color-surface-raised);
}

.delete-btn {
  color: var(--color-rose-400);
  margin-right: auto;
}

.modal-alert {
  margin: 1rem 1.25rem 0;
}

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

/* ==========================================================================
   Daily Diary & Homework Styles
   ========================================================================== */
.filters-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.diary-date-nav {
  min-width: 320px;
}

.stepper-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.date-picker-input {
  height: 2.25rem;
  padding: 0 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.btn-icon-only {
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}

.diary-header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8));
  border: 1px solid rgba(99, 102, 241, 0.25);
  margin-bottom: 1.5rem;
}

.diary-date-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.date-icon-box {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.banner-icon {
  width: 24px;
  height: 24px;
}

.diary-date-banner h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.diary-meta-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.empty-diary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-diary-illustration {
  margin-bottom: 1rem;
}

.empty-icon {
  font-size: 3rem;
}

.empty-desc {
  max-width: 480px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.diary-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.25rem;
}

.diary-subject-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
}

.diary-subject-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(99, 102, 241, 0.35);
}

.card-subject-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-card-border);
}

.subject-title-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.subject-code-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.subject-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.subject-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.teacher-tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--color-surface-raised);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
}

.action-buttons-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-icon-subtle {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: all var(--duration-fast);
}

.btn-icon-subtle:hover {
  background: var(--color-surface-raised);
  color: var(--text-primary);
}

.diary-section-box {
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.classwork-box {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.homework-box {
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.homework-box.has-hw {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.25);
}

.section-box-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.section-box-content {
  margin: 0;
  line-height: 1.5;
  color: var(--text-secondary);
}

.homework-text {
  color: var(--text-primary);
  font-weight: 500;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.diary-textarea {
  width: 100%;
  padding: 0.65rem 0.875rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  color: #f8fafc;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: all var(--duration-fast);
}

.diary-textarea:focus {
  background: rgba(15, 23, 42, 0.95);
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}
</style>
