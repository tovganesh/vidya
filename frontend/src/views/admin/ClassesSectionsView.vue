<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useAcademicsStore, ClassItem } from '@/stores/academics.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const academicsStore = useAcademicsStore();

const activeStageFilter = ref<string>('ALL');

// Modals
const showAddClassModal = ref(false);
const showAddSectionModal = ref(false);
const showAssignSubjectsModal = ref(false);

const selectedClassForSubjects = ref<ClassItem | null>(null);

// Forms
const classForm = reactive({
  name: '',
  code: '',
  stage: 'PRIMARY' as any,
  orderIndex: 0,
});

const sectionForm = reactive({
  classId: '',
  name: '',
  roomNumber: '',
  capacity: 40,
});

// Subject assignment state
const selectedSubjectAssignments = ref<
  Array<{ subjectId: string; isCompulsory: boolean; weeklyPeriods: number }>
>([]);

const actionMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);
const modalError = ref<string | null>(null);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  try {
    await Promise.all([
      academicsStore.fetchClasses(),
      academicsStore.fetchSubjects(),
    ]);
  } catch (err: any) {
    actionError.value = err.message || 'Failed to load classes';
  }
}

const filteredClasses = computed(() => {
  if (activeStageFilter.value === 'ALL') {
    return academicsStore.classes;
  }
  return academicsStore.classes.filter((c) => c.stage === activeStageFilter.value);
});

function openAddClassModal() {
  classForm.name = '';
  classForm.code = '';
  classForm.stage = 'PRIMARY';
  classForm.orderIndex = academicsStore.classes.length;
  modalError.value = null;
  showAddClassModal.value = true;
}

async function handleCreateClass() {
  modalError.value = null;
  if (!classForm.name.trim() || !classForm.code.trim()) {
    modalError.value = 'Class name and unique code are required';
    return;
  }

  try {
    await academicsStore.createClass({
      name: classForm.name.trim(),
      code: classForm.code.trim().toUpperCase(),
      stage: classForm.stage,
      orderIndex: classForm.orderIndex,
    });
    actionMessage.value = `Class "${classForm.name}" created successfully!`;
    showAddClassModal.value = false;
  } catch (err: any) {
    modalError.value = err.message || 'Failed to create class';
  }
}

function openAddSectionModal(classId?: string) {
  sectionForm.classId = classId || (academicsStore.classes[0]?.id ?? '');
  sectionForm.name = '';
  sectionForm.roomNumber = '';
  sectionForm.capacity = 40;
  modalError.value = null;
  showAddSectionModal.value = true;
}

async function handleCreateSection() {
  modalError.value = null;
  if (!sectionForm.classId) {
    modalError.value = 'Target class must be selected';
    return;
  }
  if (!sectionForm.name.trim()) {
    modalError.value = 'Section name is required (e.g. A, B, Rose)';
    return;
  }

  try {
    await academicsStore.createSection({
      classId: sectionForm.classId,
      name: sectionForm.name.trim().toUpperCase(),
      roomNumber: sectionForm.roomNumber || undefined,
      capacity: Number(sectionForm.capacity) || 40,
    });
    actionMessage.value = `Section "${sectionForm.name}" added successfully!`;
    showAddSectionModal.value = false;
  } catch (err: any) {
    modalError.value = err.message || 'Failed to add section';
  }
}

async function handleDeleteSection(sectionId: string, sectionName: string) {
  if (!confirm(`Delete Section ${sectionName}?`)) return;
  try {
    await academicsStore.deleteSection(sectionId);
    actionMessage.value = `Section ${sectionName} deleted.`;
  } catch (err: any) {
    actionError.value = err.message || 'Failed to delete section';
  }
}

async function handleDeleteClass(classId: string, className: string) {
  if (!confirm(`Delete Class ${className} and all its sections?`)) return;
  try {
    await academicsStore.deleteClass(classId);
    actionMessage.value = `Class ${className} deleted.`;
  } catch (err: any) {
    actionError.value = err.message || 'Failed to delete class';
  }
}

// Subject Assignment
async function openAssignSubjectsModal(cls: ClassItem) {
  selectedClassForSubjects.value = cls;
  modalError.value = null;

  try {
    const existingMappings = await academicsStore.fetchClassSubjects(cls.id);
    selectedSubjectAssignments.value = academicsStore.subjects.map((sub) => {
      const existing = existingMappings.find((m: any) => m.subjectId === sub.id);
      return {
        subjectId: sub.id,
        isCompulsory: existing ? existing.isCompulsory : true,
        weeklyPeriods: existing ? existing.weeklyPeriods : 5,
        assigned: Boolean(existing),
      };
    }) as any;
    showAssignSubjectsModal.value = true;
  } catch (err: any) {
    actionError.value = err.message || 'Failed to load subject assignments';
  }
}

async function handleSaveSubjectAssignments() {
  if (!selectedClassForSubjects.value) return;
  modalError.value = null;

  const assigned = selectedSubjectAssignments.value
    .filter((s: any) => s.assigned)
    .map((s) => ({
      subjectId: s.subjectId,
      isCompulsory: s.isCompulsory,
      weeklyPeriods: Number(s.weeklyPeriods) || 5,
    }));

  try {
    await academicsStore.assignClassSubjects(selectedClassForSubjects.value.id, assigned);
    actionMessage.value = `Curriculum subjects updated for Class ${selectedClassForSubjects.value.name}!`;
    showAssignSubjectsModal.value = false;
  } catch (err: any) {
    modalError.value = err.message || 'Failed to update assigned subjects';
  }
}

function getStageName(stage: string) {
  switch (stage) {
    case 'PRE_PRIMARY': return 'Pre-Primary';
    case 'PRIMARY': return 'Primary (1–5)';
    case 'MIDDLE': return 'Middle (6–8)';
    case 'SECONDARY': return 'Secondary (9–10)';
    case 'HIGHER_SECONDARY': return 'Senior (11–12)';
    default: return stage;
  }
}
</script>

<template>
  <div class="classes-sections-page" id="classes-sections-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-badge-row">
          <StatusBadge status="active" label="ACADEMIC ROSTER" />
          <span class="count-badge" id="total-classes-badge">
            {{ academicsStore.classes.length }} Classes
          </span>
        </div>
        <h1 class="page-title">Classes, Sections & Capacities</h1>
        <p class="page-description">
          Structure grade levels across academic stages, allocate classroom sections, and configure curriculum period weightings.
        </p>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="btn btn-secondary"
          id="open-add-section-btn"
          @click="() => openAddSectionModal()"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Section
        </button>
        <button
          type="button"
          class="btn btn-primary"
          id="open-add-class-btn"
          @click="openAddClassModal"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Class
        </button>
      </div>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="actionMessage" class="alert alert-success" id="action-success-alert">
      {{ actionMessage }}
    </div>
    <div v-if="actionError" class="alert alert-error" id="action-error-alert">
      {{ actionError }}
    </div>

    <!-- Stage Filter Tabs -->
    <div class="filter-tabs" id="stage-filter-tabs">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeStageFilter === 'ALL' }"
        id="tab-all-stages"
        @click="activeStageFilter = 'ALL'"
      >
        All Stages ({{ academicsStore.classes.length }})
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeStageFilter === 'PRE_PRIMARY' }"
        id="tab-pre-primary"
        @click="activeStageFilter = 'PRE_PRIMARY'"
      >
        Pre-Primary
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeStageFilter === 'PRIMARY' }"
        id="tab-primary"
        @click="activeStageFilter = 'PRIMARY'"
      >
        Primary (1–5)
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeStageFilter === 'MIDDLE' }"
        id="tab-middle"
        @click="activeStageFilter = 'MIDDLE'"
      >
        Middle (6–8)
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeStageFilter === 'SECONDARY' }"
        id="tab-secondary"
        @click="activeStageFilter = 'SECONDARY'"
      >
        Secondary (9–10)
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeStageFilter === 'HIGHER_SECONDARY' }"
        id="tab-higher-secondary"
        @click="activeStageFilter = 'HIGHER_SECONDARY'"
      >
        Senior (11–12)
      </button>
    </div>

    <!-- Classes Grid -->
    <div class="classes-grid" id="classes-cards-grid">
      <div
        v-for="cls in filteredClasses"
        :key="cls.id"
        class="class-card"
        :id="`class-card-${cls.code}`"
      >
        <div class="class-card-header">
          <div class="class-title-row">
            <span class="class-code-tag">{{ cls.code }}</span>
            <span class="stage-tag">{{ getStageName(cls.stage) }}</span>
          </div>
          <div class="class-header-actions">
            <button
              type="button"
              class="btn-icon-action"
              title="Assign Curriculum Subjects"
              :id="`assign-subjects-btn-${cls.code}`"
              @click="openAssignSubjectsModal(cls)"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            <button
              type="button"
              class="btn-icon-action danger"
              title="Delete Class"
              :id="`delete-class-btn-${cls.code}`"
              @click="handleDeleteClass(cls.id, cls.name)"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <h3 class="class-name">{{ cls.name }}</h3>

        <div class="class-meta-row">
          <span>{{ cls.sections.length }} Sections</span>
          <span>•</span>
          <span>{{ cls._count.classSubjects }} Subjects</span>
        </div>

        <!-- Sections List for this Class -->
        <div class="sections-container">
          <div class="sections-label">SECTIONS & CLASSROOM CAPACITIES</div>
          <div v-if="cls.sections.length === 0" class="no-sections-hint">
            No sections created yet.
            <button type="button" class="link-btn" @click="() => openAddSectionModal(cls.id)">
              + Add Section
            </button>
          </div>

          <div v-else class="sections-badges-wrap">
            <div
              v-for="sec in cls.sections"
              :key="sec.id"
              class="section-pill"
              :id="`section-pill-${cls.code}-${sec.name}`"
            >
              <span class="section-letter">Sec {{ sec.name }}</span>
              <span class="section-capacity">{{ sec.capacity }} seats</span>
              <span v-if="sec.roomNumber" class="section-room">Room {{ sec.roomNumber }}</span>
              <button
                type="button"
                class="sec-remove-btn"
                title="Remove Section"
                @click="handleDeleteSection(sec.id, sec.name)"
              >
                ×
              </button>
            </div>

            <button
              type="button"
              class="add-sec-mini-btn"
              title="Add Section to Class"
              @click="() => openAddSectionModal(cls.id)"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Class Modal -->
    <div v-if="showAddClassModal" class="modal-backdrop" id="add-class-modal-backdrop">
      <div class="modal-card" id="add-class-modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Add Grade Level / Class</h3>
          <button type="button" class="close-btn" @click="showAddClassModal = false">×</button>
        </div>

        <div class="modal-body">
          <div v-if="modalError" class="alert alert-error">
            {{ modalError }}
          </div>

          <div class="form-group">
            <label for="class-input-name" class="form-label">Class Name</label>
            <input
              id="class-input-name"
              v-model="classForm.name"
              type="text"
              class="form-input"
              placeholder="e.g. Class 10 / Standard 10"
              required
            />
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="class-input-code" class="form-label">Unique Code</label>
              <input
                id="class-input-code"
                v-model="classForm.code"
                type="text"
                class="form-input"
                placeholder="e.g. STD-10"
                required
              />
            </div>

            <div class="form-group">
              <label for="class-select-stage" class="form-label">Academic Stage</label>
              <select id="class-select-stage" v-model="classForm.stage" class="form-select">
                <option value="PRE_PRIMARY">Pre-Primary</option>
                <option value="PRIMARY">Primary (1–5)</option>
                <option value="MIDDLE">Middle (6–8)</option>
                <option value="SECONDARY">Secondary (9–10)</option>
                <option value="HIGHER_SECONDARY">Senior Secondary (11–12)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="class-input-order" class="form-label">Sort Order Index</label>
            <input
              id="class-input-order"
              v-model="classForm.orderIndex"
              type="number"
              class="form-input"
              placeholder="0"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showAddClassModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            id="submit-create-class-btn"
            @click="handleCreateClass"
          >
            Create Class
          </button>
        </div>
      </div>
    </div>

    <!-- Add Section Modal -->
    <div v-if="showAddSectionModal" class="modal-backdrop" id="add-section-modal-backdrop">
      <div class="modal-card" id="add-section-modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Add Class Section</h3>
          <button type="button" class="close-btn" @click="showAddSectionModal = false">×</button>
        </div>

        <div class="modal-body">
          <div v-if="modalError" class="alert alert-error">
            {{ modalError }}
          </div>

          <div class="form-group">
            <label for="sec-select-class" class="form-label">Target Class</label>
            <select id="sec-select-class" v-model="sectionForm.classId" class="form-select">
              <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.code }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="sec-input-name" class="form-label">Section Identifier</label>
            <input
              id="sec-input-name"
              v-model="sectionForm.name"
              type="text"
              class="form-input"
              placeholder="e.g. A, B, C, Rose, Lotus"
              required
            />
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="sec-input-room" class="form-label">Room Number / Block</label>
              <input
                id="sec-input-room"
                v-model="sectionForm.roomNumber"
                type="text"
                class="form-input"
                placeholder="e.g. Room 204"
              />
            </div>

            <div class="form-group">
              <label for="sec-input-capacity" class="form-label">Student Capacity</label>
              <input
                id="sec-input-capacity"
                v-model="sectionForm.capacity"
                type="number"
                class="form-input"
                placeholder="40"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showAddSectionModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            id="submit-create-section-btn"
            @click="handleCreateSection"
          >
            Create Section
          </button>
        </div>
      </div>
    </div>

    <!-- Assign Subjects Modal -->
    <div v-if="showAssignSubjectsModal" class="modal-backdrop" id="assign-subjects-modal-backdrop">
      <div class="modal-card modal-lg" id="assign-subjects-modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            Curriculum Allocation: {{ selectedClassForSubjects?.name }}
          </h3>
          <button type="button" class="close-btn" @click="showAssignSubjectsModal = false">×</button>
        </div>

        <div class="modal-body">
          <div v-if="modalError" class="alert alert-error">
            {{ modalError }}
          </div>

          <p class="modal-subtitle">
            Select curriculum subjects taught in this grade, and configure weekly timetable periods.
          </p>

          <div class="subject-selection-list">
            <div
              v-for="sub in academicsStore.subjects"
              :key="sub.id"
              class="subject-assign-row"
              :id="`assign-row-${sub.code}`"
            >
              <label class="subject-check-label">
                <input
                  type="checkbox"
                  class="form-checkbox"
                  v-model="(selectedSubjectAssignments.find((s: any) => s.subjectId === sub.id) as any).assigned"
                />
                <span class="sub-info">
                  <strong>{{ sub.name }}</strong>
                  <span class="sub-code-tag">{{ sub.code }}</span>
                  <span class="sub-type-tag">{{ sub.type }}</span>
                </span>
              </label>

              <div
                v-if="(selectedSubjectAssignments.find((s: any) => s.subjectId === sub.id) as any)?.assigned"
                class="subject-params"
              >
                <div class="periods-input-wrap">
                  <label>Periods/wk</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    class="periods-input"
                    v-model="(selectedSubjectAssignments.find((s: any) => s.subjectId === sub.id) as any).weeklyPeriods"
                  />
                </div>

                <label class="compulsory-check">
                  <input
                    type="checkbox"
                    v-model="(selectedSubjectAssignments.find((s: any) => s.subjectId === sub.id) as any).isCompulsory"
                  />
                  <span>Compulsory</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showAssignSubjectsModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            id="save-assigned-subjects-btn"
            @click="handleSaveSubjectAssignments"
          >
            Save Allocation
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.classes-sections-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.header-badge-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.count-badge {
  display: inline-flex;
  padding: 2px 10px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-neutral-900);
  margin-bottom: var(--space-1);
}

.page-description {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.filter-tabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-2);
}

.tab-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-neutral-200);
  background: var(--bg-surface);
  color: var(--color-neutral-600);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-900);
}

.tab-btn.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.classes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-5);
}

.class-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.class-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.class-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.class-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.class-code-tag {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: 700;
  font-family: var(--font-mono);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.stage-tag {
  background: var(--color-neutral-100);
  color: var(--color-neutral-600);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.class-header-actions {
  display: flex;
  gap: var(--space-1);
}

.class-name {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-neutral-900);
  margin-bottom: var(--space-1);
}

.class-meta-row {
  display: flex;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  margin-bottom: var(--space-4);
}

.sections-container {
  margin-top: auto;
  border-top: 1px solid var(--color-neutral-100);
  padding-top: var(--space-3);
}

.sections-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-neutral-400);
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.no-sections-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

.link-btn {
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
}

.sections-badges-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.section-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  padding: 3px 8px;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
}

.section-letter {
  font-weight: 700;
  color: var(--color-neutral-900);
}

.section-capacity {
  color: var(--color-neutral-500);
}

.section-room {
  background: #ffffff;
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  color: var(--color-neutral-600);
}

.sec-remove-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-neutral-400);
  font-size: 14px;
  padding: 0;
}

.sec-remove-btn:hover {
  color: var(--color-danger);
}

.add-sec-mini-btn {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-neutral-300);
  background: transparent;
  color: var(--color-neutral-600);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 700;
}

.add-sec-mini-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--color-primary);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: var(--color-neutral-100);
  color: var(--color-neutral-800);
  border-color: var(--color-neutral-200);
}

.btn-secondary:hover {
  background: var(--color-neutral-200);
}

.btn-icon-action {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-neutral-500);
  padding: 4px;
  border-radius: var(--radius-sm);
}

.btn-icon-action svg {
  width: 18px;
  height: 18px;
}

.btn-icon-action.danger:hover {
  color: var(--color-danger);
  background: #fef2f2;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.alert {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
}

.alert-success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.alert-error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.modal-card {
  background: #ffffff;
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 500px;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.modal-card.modal-lg {
  max-width: 680px;
}

.modal-header {
  padding: var(--space-4) var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-neutral-100);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-neutral-900);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--color-neutral-400);
  cursor: pointer;
}

.modal-body {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}

.modal-subtitle {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}

.modal-footer {
  padding: var(--space-4) var(--space-6);
  background: var(--color-neutral-50);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  border-top: 1px solid var(--color-neutral-100);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-neutral-700);
}

.form-input,
.form-select {
  height: 40px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.form-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.subject-selection-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.subject-assign-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--color-neutral-50);
  border-radius: var(--radius-lg);
  gap: var(--space-4);
}

.subject-check-label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  flex: 1;
}

.sub-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.sub-code-tag {
  background: var(--color-neutral-200);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: var(--font-mono);
}

.sub-type-tag {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 700;
}

.subject-params {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.periods-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
}

.periods-input {
  width: 50px;
  height: 32px;
  text-align: center;
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-md);
}

.compulsory-check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  cursor: pointer;
}
</style>
