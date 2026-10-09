<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useAcademicsStore } from '@/stores/academics.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const academicsStore = useAcademicsStore();

const isSaving = ref(false);
const saveMessage = ref<string | null>(null);
const saveError = ref<string | null>(null);

// Form state
const form = reactive({
  name: '',
  code: '',
  board: 'CBSE',
  affiliationNumber: '',
  email: '',
  phone: '',
  currency: 'INR',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
});

// Campus modal state
const showCampusModal = ref(false);
const editingCampusId = ref<string | null>(null);
const campusForm = reactive({
  name: '',
  city: '',
  area: '',
});
const campusError = ref<string | null>(null);

onMounted(async () => {
  await loadProfile();
});

async function loadProfile() {
  try {
    const data = await academicsStore.fetchSchoolProfile();
    if (data) {
      form.name = data.name || '';
      form.code = data.code || '';
      form.board = data.board || 'CBSE';
      form.affiliationNumber = data.affiliationNumber || '';
      form.email = data.email || '';
      form.phone = data.phone || '';
      form.currency = data.currency || 'INR';

      const addr = data.address as Record<string, string> | undefined;
      if (addr) {
        form.street = addr.street || '';
        form.city = addr.city || '';
        form.state = addr.state || '';
        form.postalCode = addr.postalCode || '';
        form.country = addr.country || 'India';
      }
    }
  } catch (err: any) {
    saveError.value = err.message || 'Failed to load school profile';
  }
}

async function handleSaveProfile() {
  isSaving.value = true;
  saveMessage.value = null;
  saveError.value = null;

  try {
    await academicsStore.updateSchoolProfile({
      name: form.name,
      code: form.code,
      board: form.board as any,
      affiliationNumber: form.affiliationNumber || null,
      email: form.email || null,
      phone: form.phone || null,
      currency: form.currency,
      address: {
        street: form.street,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
      },
    });
    saveMessage.value = 'School profile updated successfully!';
  } catch (err: any) {
    saveError.value = err.message || 'Failed to update profile';
  } finally {
    isSaving.value = false;
  }
}

function openAddCampusModal() {
  editingCampusId.value = null;
  campusForm.name = '';
  campusForm.city = form.city || 'Bengaluru';
  campusForm.area = '';
  campusError.value = null;
  showCampusModal.value = true;
}

function openEditCampusModal(campus: any) {
  editingCampusId.value = campus.id;
  campusForm.name = campus.name;
  const addr = campus.address as Record<string, string> | undefined;
  campusForm.city = addr?.city || '';
  campusForm.area = addr?.area || '';
  campusError.value = null;
  showCampusModal.value = true;
}

async function handleSaveCampus() {
  if (!campusForm.name.trim()) {
    campusError.value = 'Campus name is required';
    return;
  }

  try {
    if (editingCampusId.value) {
      await academicsStore.updateCampus(editingCampusId.value, {
        name: campusForm.name,
        address: { city: campusForm.city, area: campusForm.area },
      });
    } else {
      await academicsStore.createCampus({
        name: campusForm.name,
        address: { city: campusForm.city, area: campusForm.area },
      });
    }
    showCampusModal.value = false;
  } catch (err: any) {
    campusError.value = err.message || 'Failed to save campus';
  }
}

async function handleDeleteCampus(id: string) {
  if (!confirm('Are you sure you want to delete this campus branch?')) return;
  try {
    await academicsStore.deleteCampus(id);
  } catch (err: any) {
    alert(err.message || 'Failed to delete campus');
  }
}
</script>

<template>
  <div class="school-profile-page" id="school-profile-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-badge-row">
          <StatusBadge status="active" label="AFFILIATED SCHOOL" />
          <span class="board-badge" id="school-board-badge">{{ academicsStore.school?.board || 'CBSE' }}</span>
          <span class="code-badge" id="school-code-badge">{{ academicsStore.school?.code || 'VS-01' }}</span>
        </div>
        <h1 class="page-title" id="school-name-title">
          {{ academicsStore.school?.name || 'School Profile' }}
        </h1>
        <p class="page-description">
          Configure legal entity details, board affiliation, contact channels, and physical campus branches.
        </p>
      </div>

      <div class="header-actions">
        <router-link to="/admin/onboarding" class="btn btn-secondary" id="open-onboarding-wizard-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Setup Wizard
        </router-link>
        <button
          type="button"
          class="btn btn-primary"
          id="save-school-profile-btn"
          :disabled="isSaving"
          @click="handleSaveProfile"
        >
          <svg v-if="!isSaving" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span v-if="isSaving">Saving...</span>
          <span v-else>Save Changes</span>
        </button>
      </div>
    </div>

    <!-- Alert Banners -->
    <div v-if="saveMessage" class="alert alert-success" id="save-success-alert">
      {{ saveMessage }}
    </div>
    <div v-if="saveError" class="alert alert-error" id="save-error-alert">
      {{ saveError }}
    </div>

    <!-- Overview Statistics Grid -->
    <div class="stats-grid">
      <div class="stat-card" id="stat-active-session">
        <div class="stat-label">Active Academic Session</div>
        <div class="stat-value highlight" id="active-session-text">
          {{ academicsStore.currentAcademicYear?.name || 'None Active' }}
        </div>
        <div class="stat-hint">
          {{ academicsStore.currentAcademicYear ? 'Live operational session' : 'Setup session in Academic Years' }}
        </div>
      </div>

      <div class="stat-card" id="stat-classes-count">
        <div class="stat-label">Configured Classes</div>
        <div class="stat-value">
          {{ academicsStore.school?._count?.classes || 0 }}
        </div>
        <div class="stat-hint">Grades across primary to senior</div>
      </div>

      <div class="stat-card" id="stat-sections-count">
        <div class="stat-label">Active Class Sections</div>
        <div class="stat-value">
          {{ academicsStore.school?._count?.sections || 0 }}
        </div>
        <div class="stat-hint">Classroom capacity allocations</div>
      </div>

      <div class="stat-card" id="stat-subjects-count">
        <div class="stat-label">Curriculum Subjects</div>
        <div class="stat-value">
          {{ academicsStore.school?._count?.subjects || 0 }}
        </div>
        <div class="stat-hint">Theory, practical & co-scholastic</div>
      </div>
    </div>

    <!-- Main Content Form Layout -->
    <div class="form-layout">
      <!-- Section 1: Core Identity & Affiliation -->
      <div class="settings-card" id="card-school-identity">
        <div class="card-header">
          <div class="card-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 class="card-title">School Identity & Affiliation</h2>
            <p class="card-subtitle">Official school legal entity and educational board recognition details</p>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group full-width">
            <label for="input-school-name" class="form-label">School Official Name</label>
            <input
              id="input-school-name"
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="e.g. Vidya Academy"
              required
            />
          </div>

          <div class="form-group">
            <label for="input-school-code" class="form-label">School Code (Unique)</label>
            <input
              id="input-school-code"
              v-model="form.code"
              type="text"
              class="form-input"
              placeholder="e.g. VS-BLR-01"
              required
            />
            <span class="field-hint">Used for tenant routing and student admission identifiers</span>
          </div>

          <div class="form-group">
            <label for="select-school-board" class="form-label">Education Board</label>
            <select id="select-school-board" v-model="form.board" class="form-select">
              <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
              <option value="ICSE">ICSE / ISC (CISCE Board)</option>
              <option value="STATE_BOARD">State Secondary Education Board</option>
              <option value="IB">International Baccalaureate (IB)</option>
              <option value="CAMBRIDGE">Cambridge International (CAIE)</option>
              <option value="OTHER">Other Recognized Board</option>
            </select>
          </div>

          <div class="form-group">
            <label for="input-affiliation-no" class="form-label">Affiliation Number / Registration</label>
            <input
              id="input-affiliation-no"
              v-model="form.affiliationNumber"
              type="text"
              class="form-input"
              placeholder="e.g. 830412"
            />
            <span class="field-hint">Affiliation registration code issued by the board</span>
          </div>

          <div class="form-group">
            <label for="select-currency" class="form-label">Billing Currency</label>
            <select id="select-currency" v-model="form.currency" class="form-select">
              <option value="INR">₹ INR (Indian Rupee)</option>
              <option value="USD">$ USD (US Dollar)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Section 2: Contact & Official Address -->
      <div class="settings-card" id="card-contact-address">
        <div class="card-header">
          <div class="card-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 class="card-title">Contact & Registered Address</h2>
            <p class="card-subtitle">Official administrative correspondence channels and premises location</p>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="input-official-email" class="form-label">Official Email</label>
            <input
              id="input-official-email"
              v-model="form.email"
              type="email"
              class="form-input"
              placeholder="e.g. contact@vidya.org"
            />
          </div>

          <div class="form-group">
            <label for="input-official-phone" class="form-label">Primary Phone</label>
            <input
              id="input-official-phone"
              v-model="form.phone"
              type="tel"
              class="form-input"
              placeholder="e.g. +91 80 2345 6789"
            />
          </div>

          <div class="form-group full-width">
            <label for="input-street-address" class="form-label">Campus Street Address</label>
            <input
              id="input-street-address"
              v-model="form.street"
              type="text"
              class="form-input"
              placeholder="e.g. #42, Knowledge Park Road, Electronic City"
            />
          </div>

          <div class="form-group">
            <label for="input-city" class="form-label">City / Town</label>
            <input id="input-city" v-model="form.city" type="text" class="form-input" placeholder="e.g. Bengaluru" />
          </div>

          <div class="form-group">
            <label for="input-state" class="form-label">State / Province</label>
            <input id="input-state" v-model="form.state" type="text" class="form-input" placeholder="e.g. Karnataka" />
          </div>

          <div class="form-group">
            <label for="input-pincode" class="form-label">PIN Code</label>
            <input id="input-pincode" v-model="form.postalCode" type="text" class="form-input" placeholder="e.g. 560100" />
          </div>

          <div class="form-group">
            <label for="input-country" class="form-label">Country</label>
            <input id="input-country" v-model="form.country" type="text" class="form-input" disabled />
          </div>
        </div>
      </div>

      <!-- Section 3: Physical Campuses & Branches -->
      <div class="settings-card" id="card-campuses-list">
        <div class="card-header-with-action">
          <div class="card-header-left">
            <div class="card-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            <div>
              <h2 class="card-title">Campuses & Branches</h2>
              <p class="card-subtitle">Manage multi-location physical premises or primary and annex wings</p>
            </div>
          </div>

          <button
            type="button"
            class="btn btn-secondary btn-sm"
            id="add-campus-modal-btn"
            @click="openAddCampusModal"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Campus
          </button>
        </div>

        <div v-if="academicsStore.campuses.length === 0" class="empty-state" id="no-campuses-empty">
          <p>No extra campuses configured. The school operates from its primary premises.</p>
        </div>

        <div v-else class="campus-table-container">
          <table class="data-table" id="campuses-table">
            <thead>
              <tr>
                <th>Campus / Branch Name</th>
                <th>Location Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="campus in academicsStore.campuses" :key="campus.id" :id="`campus-row-${campus.id}`">
                <td class="campus-name-cell">
                  <strong>{{ campus.name }}</strong>
                </td>
                <td class="campus-loc-cell">
                  <span v-if="campus.address">
                    {{ (campus.address as any).area ? (campus.address as any).area + ', ' : '' }}
                    {{ (campus.address as any).city || 'Bengaluru' }}
                  </span>
                  <span v-else class="muted-text">Main Campus Location</span>
                </td>
                <td class="actions-cell">
                  <button
                    type="button"
                    class="btn-icon-action"
                    title="Edit Campus"
                    @click="openEditCampusModal(campus)"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="btn-icon-action danger"
                    title="Delete Campus"
                    @click="handleDeleteCampus(campus.id)"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Campus Modal -->
    <div v-if="showCampusModal" class="modal-backdrop" id="campus-modal-backdrop">
      <div class="modal-card" id="campus-modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editingCampusId ? 'Edit Campus Branch' : 'Add Campus Branch' }}
          </h3>
          <button type="button" class="close-btn" @click="showCampusModal = false">×</button>
        </div>

        <div class="modal-body">
          <div v-if="campusError" class="alert alert-error">
            {{ campusError }}
          </div>

          <div class="form-group">
            <label for="campus-input-name" class="form-label">Campus Name</label>
            <input
              id="campus-input-name"
              v-model="campusForm.name"
              type="text"
              class="form-input"
              placeholder="e.g. North Wing Annex / Secondary Campus"
              required
            />
          </div>

          <div class="form-group">
            <label for="campus-input-area" class="form-label">Area / Locality</label>
            <input
              id="campus-input-area"
              v-model="campusForm.area"
              type="text"
              class="form-input"
              placeholder="e.g. Indiranagar"
            />
          </div>

          <div class="form-group">
            <label for="campus-input-city" class="form-label">City</label>
            <input
              id="campus-input-city"
              v-model="campusForm.city"
              type="text"
              class="form-input"
              placeholder="e.g. Bengaluru"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showCampusModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            id="save-campus-submit-btn"
            @click="handleSaveCampus"
          >
            Save Campus
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.school-profile-page {
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

.board-badge {
  display: inline-flex;
  padding: 2px 8px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.code-badge {
  display: inline-flex;
  padding: 2px 8px;
  background: var(--color-neutral-100);
  color: var(--color-neutral-700);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  font-weight: 600;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
}

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.stat-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-neutral-900);
}

.stat-value.highlight {
  color: var(--color-primary);
}

.stat-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  margin-top: var(--space-1);
}

.form-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.settings-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}

.card-header,
.card-header-with-action {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-neutral-100);
}

.card-header-with-action {
  justify-content: space-between;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon svg {
  width: 22px;
  height: 22px;
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-neutral-900);
}

.card-subtitle {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  margin-top: 2px;
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

.form-group.full-width {
  grid-column: 1 / -1;
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
  color: var(--color-neutral-900);
  background: #ffffff;
  transition: border-color var(--transition-fast);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.form-input:disabled {
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
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
  text-decoration: none;
}

.btn-sm {
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-xs);
}

.btn-primary {
  background: var(--color-primary);
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
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
  transition: all var(--transition-fast);
}

.btn-icon-action svg {
  width: 18px;
  height: 18px;
}

.btn-icon-action:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
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

.campus-table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-200);
}

.data-table td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-neutral-800);
  border-bottom: 1px solid var(--color-neutral-100);
}

.actions-cell {
  display: flex;
  gap: var(--space-2);
}

.empty-state {
  text-align: center;
  padding: var(--space-6);
  color: var(--color-neutral-500);
  font-size: var(--text-sm);
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
  animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
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

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
