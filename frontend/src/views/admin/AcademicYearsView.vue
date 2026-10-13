<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useAcademicsStore, AcademicYearItem } from '@/stores/academics.js';
import { useAuthStore } from '@/stores/auth.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const academicsStore = useAcademicsStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.isAdmin || authStore.isPrincipal);

const showCreateModal = ref(false);
const showActivateConfirmModal = ref(false);
const activatingYear = ref<AcademicYearItem | null>(null);

const form = reactive({
  name: '',
  startDate: '',
  endDate: '',
  status: 'PLANNING' as 'PLANNING' | 'ACTIVE' | 'CONCLUDED' | 'ARCHIVED',
  isCurrent: false,
});

const formError = ref<string | null>(null);
const actionMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);

onMounted(async () => {
  await loadYears();
});

async function loadYears() {
  try {
    await academicsStore.fetchAcademicYears();
  } catch (err: any) {
    actionError.value = err.message || 'Failed to load academic years';
  }
}

function openCreateModal() {
  form.name = '';
  form.startDate = '';
  form.endDate = '';
  form.status = 'PLANNING';
  form.isCurrent = false;
  formError.value = null;
  showCreateModal.value = true;
}

async function handleCreateYear() {
  formError.value = null;
  if (!form.name.trim()) {
    formError.value = 'Academic year name is required (e.g. 2027-2028)';
    return;
  }
  if (!form.startDate || !form.endDate) {
    formError.value = 'Both start date and end date are required';
    return;
  }
  if (new Date(form.startDate) >= new Date(form.endDate)) {
    formError.value = 'Start date must be strictly before end date';
    return;
  }

  try {
    await academicsStore.createAcademicYear({
      name: form.name.trim(),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      status: form.status,
      isCurrent: form.isCurrent,
    });
    actionMessage.value = `Academic year "${form.name}" created successfully!`;
    showCreateModal.value = false;
  } catch (err: any) {
    formError.value = err.message || 'Failed to create academic year';
  }
}

function promptActivate(year: AcademicYearItem) {
  activatingYear.value = year;
  showActivateConfirmModal.value = true;
}

async function confirmActivate() {
  if (!activatingYear.value) return;
  actionMessage.value = null;
  actionError.value = null;

  try {
    await academicsStore.activateAcademicYear(activatingYear.value.id);
    actionMessage.value = `Academic session "${activatingYear.value.name}" is now the active live session!`;
    showActivateConfirmModal.value = false;
    activatingYear.value = null;
  } catch (err: any) {
    actionError.value = err.message || 'Failed to activate session';
  }
}

async function handleDeleteYear(id: string, name: string) {
  if (!confirm(`Are you sure you want to permanently delete academic session "${name}"?`)) return;
  actionMessage.value = null;
  actionError.value = null;

  try {
    await academicsStore.deleteAcademicYear(id);
    actionMessage.value = `Academic year "${name}" deleted successfully.`;
  } catch (err: any) {
    actionError.value = err.message || 'Failed to delete academic year';
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
</script>

<template>
  <div class="academic-years-page" id="academic-years-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-badge-row">
          <StatusBadge status="active" label="SESSION MANAGEMENT" />
          <span class="active-badge" id="current-active-year-badge">
            Current: {{ academicsStore.currentAcademicYear?.name || 'Not Set' }}
          </span>
        </div>
        <h1 class="page-title">Academic Years & Sessions</h1>
        <p class="page-description">
          Define institutional calendars, schedule annual cycles, and activate the current operational academic session.
        </p>
      </div>

      <div class="header-actions" v-if="canManage">
        <button
          type="button"
          class="btn btn-primary"
          id="new-academic-year-btn"
          @click="openCreateModal"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Academic Year
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

    <!-- Active Year Hero Banner -->
    <div v-if="academicsStore.currentAcademicYear" class="active-year-banner" id="active-session-banner">
      <div class="banner-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="banner-body">
        <div class="banner-tag">ACTIVE OPERATIONAL SESSION</div>
        <h2 class="banner-title" id="banner-active-year-name">
          Academic Year {{ academicsStore.currentAcademicYear.name }}
        </h2>
        <div class="banner-meta">
          <span>
            <strong>Duration:</strong>
            {{ formatDate(academicsStore.currentAcademicYear.startDate) }} — {{ formatDate(academicsStore.currentAcademicYear.endDate) }}
          </span>
          <span class="live-indicator">
            <span class="live-dot"></span> Live Attendance & Fee Register
          </span>
        </div>
      </div>
    </div>

    <!-- Academic Years Data Card -->
    <div class="settings-card" id="card-academic-years-list">
      <div class="card-header">
        <h2 class="card-title">All Academic Sessions</h2>
        <p class="card-subtitle">Exactly one academic session can be current and active at any given moment</p>
      </div>

      <div class="table-container">
        <table class="data-table" id="academic-years-table">
          <thead>
            <tr>
              <th>Session Name</th>
              <th>Calendar Period</th>
              <th>Status</th>
              <th>Active Session</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="year in academicsStore.academicYears"
              :key="year.id"
              :id="`academic-year-row-${year.id}`"
              :class="{ 'highlight-row': year.isCurrent }"
            >
              <td class="name-cell">
                <span class="year-name">{{ year.name }}</span>
              </td>
              <td class="date-cell">
                {{ formatDate(year.startDate) }} &rarr; {{ formatDate(year.endDate) }}
              </td>
              <td class="status-cell">
                <span :class="`status-pill ${year.status.toLowerCase()}`">
                  {{ year.status }}
                </span>
              </td>
              <td class="current-cell">
                <span v-if="year.isCurrent" class="current-badge" id="badge-live-session">
                  CURRENT LIVE
                </span>
                <span v-else class="inactive-badge">Inactive</span>
              </td>
              <td class="actions-cell">
                <template v-if="canManage">
                  <button
                    v-if="!year.isCurrent"
                    type="button"
                    class="btn btn-secondary btn-sm"
                    :id="`activate-year-btn-${year.id}`"
                    @click="promptActivate(year)"
                  >
                    Set as Active
                  </button>
                  <button
                    v-if="!year.isCurrent"
                    type="button"
                    class="btn-icon-action danger"
                    title="Delete Academic Year"
                    :id="`delete-year-btn-${year.id}`"
                    @click="handleDeleteYear(year.id, year.name)"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </template>
                <span v-else class="text-muted text-xs">View Only</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Academic Year Modal -->
    <div v-if="showCreateModal" class="modal-backdrop" id="create-year-modal-backdrop">
      <div class="modal-card" id="create-year-modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Create Academic Year</h3>
          <button type="button" class="close-btn" @click="showCreateModal = false">×</button>
        </div>

        <div class="modal-body">
          <div v-if="formError" class="alert alert-error">
            {{ formError }}
          </div>

          <div class="form-group">
            <label for="input-year-name" class="form-label">Academic Year Name</label>
            <input
              id="input-year-name"
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="e.g. 2027-2028"
              required
            />
            <span class="field-hint">Indian academic sessions normally follow YYYY-YYYY format</span>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="input-start-date" class="form-label">Session Start Date</label>
              <input
                id="input-start-date"
                v-model="form.startDate"
                type="date"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label for="input-end-date" class="form-label">Session End Date</label>
              <input
                id="input-end-date"
                v-model="form.endDate"
                type="date"
                class="form-input"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="select-year-status" class="form-label">Initial Lifecycle Status</label>
            <select id="select-year-status" v-model="form.status" class="form-select">
              <option value="PLANNING">PLANNING (Drafting timetable & fee setup)</option>
              <option value="ACTIVE">ACTIVE (Ready for live operations)</option>
              <option value="CONCLUDED">CONCLUDED (Past completed cycle)</option>
            </select>
          </div>

          <div class="checkbox-group">
            <input
              id="check-is-current"
              v-model="form.isCurrent"
              type="checkbox"
              class="form-checkbox"
            />
            <label for="check-is-current" class="checkbox-label">
              Make this the active operational session immediately
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showCreateModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            id="submit-create-year-btn"
            @click="handleCreateYear"
          >
            Create Session
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Session Activation Modal -->
    <div v-if="showActivateConfirmModal" class="modal-backdrop" id="activate-confirm-modal-backdrop">
      <div class="modal-card" id="activate-confirm-modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Confirm Session Activation</h3>
          <button type="button" class="close-btn" @click="showActivateConfirmModal = false">×</button>
        </div>

        <div class="modal-body">
          <p class="confirm-text">
            Are you sure you want to activate <strong>{{ activatingYear?.name }}</strong>?
          </p>
          <div class="alert alert-info">
            <strong>Cutover Note:</strong> Activating this academic year will switch current class rosters, daily attendance registries, and timetable views to this session. Any previous active session will remain archived for records.
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showActivateConfirmModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            id="confirm-activate-submit-btn"
            @click="confirmActivate"
          >
            Confirm & Activate
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.academic-years-page {
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

.active-badge {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  background: var(--color-primary-light);
  color: var(--color-primary-400);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.03em;
}

[data-theme="light"] .active-badge {
  color: var(--color-primary-600);
  border-color: rgba(99, 102, 241, 0.25);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.025em;
  margin-bottom: var(--space-1);
}

.page-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  max-width: 720px;
}

/* Active Year Hero Banner */
.active-year-banner {
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%);
  color: #ffffff;
  border-radius: var(--radius-xl);
  padding: 1.5rem 1.75rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.banner-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.banner-icon svg {
  width: 28px;
  height: 28px;
  color: #ffffff;
}

.banner-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.banner-tag {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
}

.banner-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.banner-meta {
  display: flex;
  gap: 1.25rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.125rem;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: rgba(255, 255, 255, 0.18);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.8125rem;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulseDot 1.5s infinite;
}

@keyframes pulseDot {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

.settings-card {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}

[data-theme="light"] .settings-card {
  background: #ffffff;
  border-color: #e2e8f0;
}

.card-header {
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-card-border);
}

[data-theme="light"] .card-header {
  border-bottom-color: #e2e8f0;
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.card-subtitle {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.table-container {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

[data-theme="light"] .table-container {
  background: #ffffff;
  border-color: #e2e8f0;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: left;
}

.data-table th {
  padding: 0.95rem 1.25rem;
  font-size: 0.725rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.065em;
  background: var(--color-surface-raised);
  border-bottom: 1px solid var(--color-card-border);
  white-space: nowrap;
}

[data-theme="light"] .data-table th {
  background: #f8fafc;
  border-bottom-color: #e2e8f0;
}

.data-table td {
  padding: 1.05rem 1.25rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}

[data-theme="light"] .data-table td {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.highlight-row td {
  background: rgba(16, 185, 129, 0.06);
}

.year-name {
  font-weight: 700;
  font-size: var(--text-base);
  color: var(--text-primary);
}

.status-pill {
  display: inline-flex;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.03em;
}

.status-pill.active {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-emerald-400);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

[data-theme="light"] .status-pill.active {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.status-pill.planning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-amber-400);
  border: 1px solid rgba(245, 158, 11, 0.35);
}

[data-theme="light"] .status-pill.planning {
  background: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}

.status-pill.concluded,
.status-pill.archived {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme="light"] .status-pill.concluded,
[data-theme="light"] .status-pill.archived {
  background: #f1f5f9;
  color: #64748b;
  border-color: #e2e8f0;
}

.current-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-emerald-400);
  border: 1px solid rgba(16, 185, 129, 0.35);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

[data-theme="light"] .current-badge {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.inactive-badge {
  display: inline-flex;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.04);
}

[data-theme="light"] .inactive-badge {
  background: #f1f5f9;
  color: #64748b;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
}

.btn-icon-action {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-card-border);
  cursor: pointer;
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all var(--duration-fast);
}

.btn-icon-action:hover {
  background: var(--color-surface-hover);
  color: var(--text-primary);
}

.btn-icon-action.danger:hover {
  color: var(--color-rose-400);
  background: rgba(244, 63, 94, 0.12);
  border-color: rgba(244, 63, 94, 0.3);
}

[data-theme="light"] .btn-icon-action {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #64748b;
}

[data-theme="light"] .btn-icon-action.danger:hover {
  color: #e11d48;
  background: #fff1f2;
  border-color: #fecdd3;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.confirm-text {
  font-size: 1rem;
  color: var(--text-primary);
  line-height: 1.6;
}

.confirm-text strong {
  color: var(--color-primary-400);
}

[data-theme="light"] .confirm-text strong {
  color: var(--color-primary-600);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.field-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.25rem 0;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary-500);
}

.checkbox-label {
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}
</style>
