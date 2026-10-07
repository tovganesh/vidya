<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useAcademicsStore, SubjectItem } from '@/stores/academics.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const academicsStore = useAcademicsStore();

const searchQuery = ref('');
const typeFilter = ref<string>('ALL');

const showModal = ref(false);
const editingSubjectId = ref<string | null>(null);

const form = reactive({
  name: '',
  code: '',
  type: 'THEORY' as 'THEORY' | 'PRACTICAL' | 'CO_SCHOLASTIC' | 'VOCATIONAL',
});

const modalError = ref<string | null>(null);
const actionMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);

onMounted(async () => {
  await loadSubjects();
});

async function loadSubjects() {
  try {
    await academicsStore.fetchSubjects();
  } catch (err: any) {
    actionError.value = err.message || 'Failed to load subjects';
  }
}

const filteredSubjects = computed(() => {
  return academicsStore.subjects.filter((sub) => {
    const matchesType = typeFilter.value === 'ALL' || sub.type === typeFilter.value;
    const matchesQuery =
      !searchQuery.value.trim() ||
      sub.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      sub.code.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesType && matchesQuery;
  });
});

function openAddModal() {
  editingSubjectId.value = null;
  form.name = '';
  form.code = '';
  form.type = 'THEORY';
  modalError.value = null;
  showModal.value = true;
}

function openEditModal(sub: SubjectItem) {
  editingSubjectId.value = sub.id;
  form.name = sub.name;
  form.code = sub.code;
  form.type = sub.type;
  modalError.value = null;
  showModal.value = true;
}

async function handleSaveSubject() {
  modalError.value = null;
  if (!form.name.trim() || !form.code.trim()) {
    modalError.value = 'Subject name and unique code are required';
    return;
  }

  try {
    if (editingSubjectId.value) {
      await academicsStore.updateSubject(editingSubjectId.value, {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
      });
      actionMessage.value = `Subject "${form.name}" updated successfully!`;
    } else {
      await academicsStore.createSubject({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
      });
      actionMessage.value = `Subject "${form.name}" added to master curriculum!`;
    }
    showModal.value = false;
  } catch (err: any) {
    modalError.value = err.message || 'Failed to save subject';
  }
}

async function handleDeleteSubject(id: string, name: string) {
  if (!confirm(`Are you sure you want to delete subject "${name}"?`)) return;
  try {
    await academicsStore.deleteSubject(id);
    actionMessage.value = `Subject "${name}" deleted.`;
  } catch (err: any) {
    actionError.value = err.message || 'Failed to delete subject';
  }
}

function getTypeClass(type: string) {
  switch (type) {
    case 'THEORY': return 'type-theory';
    case 'PRACTICAL': return 'type-practical';
    case 'CO_SCHOLASTIC': return 'type-co-scholastic';
    case 'VOCATIONAL': return 'type-vocational';
    default: return '';
  }
}
</script>

<template>
  <div class="subjects-page" id="subjects-master-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-badge-row">
          <StatusBadge status="active" label="CURRICULUM REPOSITORY" />
          <span class="count-badge" id="total-subjects-badge">
            {{ academicsStore.subjects.length }} Subjects
          </span>
        </div>
        <h1 class="page-title">Curriculum Subjects Master</h1>
        <p class="page-description">
          Maintain the comprehensive list of educational subjects across theory, laboratory practicals, co-scholastic arts, and vocational courses.
        </p>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="btn btn-primary"
          id="open-add-subject-btn"
          @click="openAddModal"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Subject
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

    <!-- Filter and Search Controls -->
    <div class="controls-row">
      <div class="search-box">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="search-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="subjects-search-input"
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search by subject name or code..."
        />
      </div>

      <div class="type-filter-group" id="type-filter-group">
        <button
          type="button"
          class="filter-pill"
          :class="{ active: typeFilter === 'ALL' }"
          id="filter-all-types"
          @click="typeFilter = 'ALL'"
        >
          All ({{ academicsStore.subjects.length }})
        </button>
        <button
          type="button"
          class="filter-pill"
          :class="{ active: typeFilter === 'THEORY' }"
          id="filter-theory"
          @click="typeFilter = 'THEORY'"
        >
          Theory
        </button>
        <button
          type="button"
          class="filter-pill"
          :class="{ active: typeFilter === 'PRACTICAL' }"
          id="filter-practical"
          @click="typeFilter = 'PRACTICAL'"
        >
          Practical
        </button>
        <button
          type="button"
          class="filter-pill"
          :class="{ active: typeFilter === 'CO_SCHOLASTIC' }"
          id="filter-co-scholastic"
          @click="typeFilter = 'CO_SCHOLASTIC'"
        >
          Co-Scholastic
        </button>
        <button
          type="button"
          class="filter-pill"
          :class="{ active: typeFilter === 'VOCATIONAL' }"
          id="filter-vocational"
          @click="typeFilter = 'VOCATIONAL'"
        >
          Vocational
        </button>
      </div>
    </div>

    <!-- Subjects Grid -->
    <div class="subjects-grid" id="subjects-cards-grid">
      <div
        v-for="sub in filteredSubjects"
        :key="sub.id"
        class="subject-card"
        :id="`subject-card-${sub.code}`"
      >
        <div class="sub-card-top">
          <span class="sub-code">{{ sub.code }}</span>
          <span :class="`sub-type-badge ${getTypeClass(sub.type)}`">
            {{ sub.type.replace('_', ' ') }}
          </span>
        </div>

        <h3 class="sub-name">{{ sub.name }}</h3>

        <div class="sub-meta">
          <span>Assigned to {{ sub._count?.classSubjects || 0 }} grade levels</span>
        </div>

        <div class="sub-card-footer">
          <button
            type="button"
            class="btn-icon-action"
            title="Edit Subject"
            :id="`edit-sub-btn-${sub.code}`"
            @click="openEditModal(sub)"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            class="btn-icon-action danger"
            title="Delete Subject"
            :id="`delete-sub-btn-${sub.code}`"
            @click="handleDeleteSubject(sub.id, sub.name)"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Subject Modal -->
    <div v-if="showModal" class="modal-backdrop" id="subject-modal-backdrop">
      <div class="modal-card" id="subject-modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editingSubjectId ? 'Edit Subject' : 'Add Master Subject' }}
          </h3>
          <button type="button" class="close-btn" @click="showModal = false">×</button>
        </div>

        <div class="modal-body">
          <div v-if="modalError" class="alert alert-error">
            {{ modalError }}
          </div>

          <div class="form-group">
            <label for="sub-input-name" class="form-label">Subject Name</label>
            <input
              id="sub-input-name"
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="e.g. Mathematics / Social Science"
              required
            />
          </div>

          <div class="form-group">
            <label for="sub-input-code" class="form-label">Subject Code (Unique)</label>
            <input
              id="sub-input-code"
              v-model="form.code"
              type="text"
              class="form-input"
              placeholder="e.g. MATH / SCI / HIN"
              required
            />
            <span class="field-hint">Used for report cards and mark sheets</span>
          </div>

          <div class="form-group">
            <label for="sub-select-type" class="form-label">Classification / Type</label>
            <select id="sub-select-type" v-model="form.type" class="form-select">
              <option value="THEORY">THEORY (Standard academic course)</option>
              <option value="PRACTICAL">PRACTICAL (Laboratory / experiments)</option>
              <option value="CO_SCHOLASTIC">CO_SCHOLASTIC (Arts, Music, Sports, Life Skills)</option>
              <option value="VOCATIONAL">VOCATIONAL (Skill elective / IT)</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            id="save-subject-submit-btn"
            @click="handleSaveSubject"
          >
            {{ editingSubjectId ? 'Update Subject' : 'Create Subject' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subjects-page {
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

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 360px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--color-neutral-400);
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3) 0 38px;
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  background: #ffffff;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.type-filter-group {
  display: flex;
  gap: var(--space-2);
}

.filter-pill {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-neutral-200);
  background: var(--bg-surface);
  color: var(--color-neutral-600);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-pill.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
}

.subjects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}

.subject-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.subject-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.sub-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.sub-code {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  background: var(--color-neutral-100);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.sub-type-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.type-theory {
  background: #eff6ff;
  color: #1d4ed8;
}

.type-practical {
  background: #fdf2f8;
  color: #be185d;
}

.type-co-scholastic {
  background: #fefce8;
  color: #a16207;
}

.type-vocational {
  background: #ecfdf5;
  color: #047857;
}

.sub-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-neutral-900);
  margin-bottom: var(--space-1);
}

.sub-meta {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  margin-bottom: var(--space-4);
}

.sub-card-footer {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  border-top: 1px solid var(--color-neutral-100);
  padding-top: var(--space-3);
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

.btn-icon {
  width: 16px;
  height: 16px;
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
  max-width: 480px;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
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
}

.modal-footer {
  padding: var(--space-4) var(--space-6);
  background: var(--color-neutral-50);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  border-top: 1px solid var(--color-neutral-100);
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

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}
</style>
