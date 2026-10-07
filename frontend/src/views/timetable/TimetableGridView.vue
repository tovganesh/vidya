<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useTimetableStore, DayOfWeek, TimetableSlot } from '../../stores/timetable.js';
import { useAcademicsStore } from '../../stores/academics.js';
import { usePeopleStore } from '../../stores/people.js';

const timetableStore = useTimetableStore();
const academicsStore = useAcademicsStore();
const peopleStore = usePeopleStore();

const activeTab = ref<'grid' | 'allocations'>('grid');

const selectedClassId = ref('');
const selectedSectionId = ref('');

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
    academicsStore.fetchClasses(),
    academicsStore.fetchSections(),
    academicsStore.fetchSubjects(),
    peopleStore.fetchTeachers(),
    timetableStore.fetchPeriods(),
  ]);

  if (academicsStore.classes.length > 0) {
    const defaultClass = academicsStore.classes.find((c) => c.code === 'STD-10') || academicsStore.classes[0]!;
    selectedClassId.value = defaultClass.id;

    const defaultSection = academicsStore.sections.find((s) => s.classId === defaultClass.id && s.name === 'A') ||
      academicsStore.sections.find((s) => s.classId === defaultClass.id) ||
      academicsStore.sections[0];

    if (defaultSection) {
      selectedSectionId.value = defaultSection.id;
      await refreshData();
    }
  }
});

watch(selectedSectionId, async (newSecId) => {
  if (newSecId) {
    await refreshData();
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

function getSlotFor(day: DayOfWeek, periodId: string): TimetableSlot | undefined {
  if (!timetableStore.currentTimetable) return undefined;
  const daySlots = timetableStore.currentTimetable.grid[day] || [];
  return daySlots.find((s) => s.periodId === periodId);
}

function openEditSlot(day: DayOfWeek, periodId: string) {
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
  if (!confirm('Remove this timetable slot?')) return;
  try {
    await timetableStore.deleteSlot(slotId, selectedSectionId.value);
    showSlotModal.value = false;
  } catch (err: any) {
    modalError.value = err.message || 'Failed to remove slot';
  }
}

async function handleSaveAllocation() {
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
      <div class="field-item">
        <label for="tt-class-select">Class</label>
        <select id="tt-class-select" v-model="selectedClassId">
          <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>

      <div class="field-item">
        <label for="tt-section-select">Section</label>
        <select id="tt-section-select" v-model="selectedSectionId">
          <option v-for="s in availableSections" :key="s.id" :value="s.id">
            Section {{ s.name }} ({{ s.roomNumber || 'No Room' }})
          </option>
        </select>
      </div>

      <div v-if="activeTab === 'allocations'" class="action-item">
        <button class="btn btn-primary" id="open-alloc-modal-btn" @click="showAllocationModal = true">
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
                  :class="{ filled: Boolean(getSlotFor(day.key, period.id)) }"
                  @click="openEditSlot(day.key, period.id)"
                  title="Click to assign or edit period"
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
                    <div class="slot-empty">
                      <span class="plus-icon">+</span>
                      <span>Assign</span>
                    </div>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Teacher Allocations -->
    <div v-else class="card allocations-card" id="allocations-table-card">
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
  cursor: pointer;
  transition: all var(--duration-fast);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-card-border);
}

.slot-box:hover {
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-card {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  max-width: 500px;
  width: 100%;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  border-bottom: 1px solid var(--color-card-border);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
</style>
