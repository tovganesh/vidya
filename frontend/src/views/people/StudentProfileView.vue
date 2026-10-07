<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePeopleStore } from '../../stores/people.js';
import { useAuthStore } from '../../stores/auth.js';

const route = useRoute();
const peopleStore = usePeopleStore();
const authStore = useAuthStore();

const studentId = computed(() => route.params.id as string);
const activeTab = ref<'demographics' | 'guardians' | 'trajectory'>('demographics');

// Edit / Link Guardian Modals
const showEditModal = ref(false);
const showAddGuardianModal = ref(false);
const modalLoading = ref(false);
const modalError = ref<string | null>(null);

const editForm = ref({
  firstName: '',
  middleName: '',
  lastName: '',
  gender: 'MALE',
  dateOfBirth: '',
  bloodGroup: 'UNKNOWN',
  apaarId: '',
  aadhaarLastFour: '',
  category: 'GENERAL',
  religion: '',
  nationality: 'Indian',
  status: 'ENROLLED',
});

const guardianForm = ref({
  name: '',
  relationship: 'FATHER' as 'FATHER' | 'MOTHER' | 'GUARDIAN',
  phone: '',
  email: '',
  occupation: '',
  annualIncome: '',
  isPrimaryContact: false,
  isAuthorizedPickup: true,
  receivesNotifications: true,
});

const canEdit = computed(() =>
  authStore.hasPermission('student:write') || authStore.hasRole('SCHOOL_ADMIN') || authStore.hasRole('SUPER_ADMIN'),
);

onMounted(async () => {
  await loadStudent();
});

async function loadStudent() {
  if (!studentId.value) return;
  const s = await peopleStore.fetchStudentById(studentId.value);
  if (s) {
    editForm.value = {
      firstName: s.firstName,
      middleName: s.middleName || '',
      lastName: s.lastName,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth.slice(0, 10),
      bloodGroup: s.bloodGroup,
      apaarId: s.apaarId || '',
      aadhaarLastFour: s.aadhaarLastFour || '',
      category: s.category,
      religion: s.religion || '',
      nationality: s.nationality,
      status: s.status,
    };
  }
}

async function handleUpdateStudent() {
  modalLoading.value = true;
  modalError.value = null;
  try {
    await peopleStore.updateStudent(studentId.value, {
      ...editForm.value,
      middleName: editForm.value.middleName || undefined,
      apaarId: editForm.value.apaarId || undefined,
      aadhaarLastFour: editForm.value.aadhaarLastFour || undefined,
      religion: editForm.value.religion || undefined,
    });
    showEditModal.value = false;
    await loadStudent();
  } catch (err: any) {
    modalError.value = err.message || 'Failed to update student profile';
  } finally {
    modalLoading.value = false;
  }
}

async function handleLinkGuardian() {
  modalLoading.value = true;
  modalError.value = null;
  try {
    await peopleStore.linkGuardian(studentId.value, guardianForm.value);
    showAddGuardianModal.value = false;
    await loadStudent();
  } catch (err: any) {
    modalError.value = err.message || 'Failed to link guardian';
  } finally {
    modalLoading.value = false;
  }
}

async function handleUnlinkGuardian(guardianId: string) {
  if (!confirm('Are you sure you want to remove this guardian link?')) return;
  try {
    await peopleStore.unlinkGuardian(studentId.value, guardianId);
    await loadStudent();
  } catch (err: any) {
    alert(err.message || 'Failed to remove guardian');
  }
}
</script>

<template>
  <div class="profile-view" id="student-360-page">
    <!-- Back to Directory Breadcrumb -->
    <div class="breadcrumb-bar">
      <router-link to="/students" class="breadcrumb-back" id="btn-back-directory">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to People Registry
      </router-link>
    </div>

    <div v-if="peopleStore.loading && !peopleStore.activeStudent" class="loading-state">
      <div class="spinner"></div>
      <span>Loading Student 360 Profile...</span>
    </div>

    <template v-else-if="peopleStore.activeStudent">
      <!-- 360 Hero Card -->
      <div class="hero-card">
        <div class="hero-left">
          <div class="hero-avatar" :class="peopleStore.activeStudent.gender.toLowerCase()">
            {{ peopleStore.activeStudent.firstName[0] }}{{ peopleStore.activeStudent.lastName[0] }}
          </div>
          <div class="hero-identity">
            <div class="hero-tags">
              <span class="status-pill" :class="peopleStore.activeStudent.status.toLowerCase()">
                {{ peopleStore.activeStudent.status }}
              </span>
              <span class="apaar-pill" v-if="peopleStore.activeStudent.apaarId">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                APAAR ID: {{ peopleStore.activeStudent.apaarId }}
              </span>
            </div>
            <h1 class="hero-name">{{ peopleStore.activeStudent.fullName }}</h1>
            <div class="hero-meta">
              <span class="meta-item">
                Admission No: <strong>{{ peopleStore.activeStudent.admissionNumber }}</strong>
              </span>
              <span class="meta-sep">•</span>
              <span class="meta-item" v-if="peopleStore.activeStudent.currentEnrollment">
                Current Class: <strong>{{ peopleStore.activeStudent.currentEnrollment.class.name }} - {{ peopleStore.activeStudent.currentEnrollment.section.name }}</strong>
                <span v-if="peopleStore.activeStudent.currentEnrollment.rollNumber">(Roll #{{ peopleStore.activeStudent.currentEnrollment.rollNumber }})</span>
              </span>
              <span class="meta-sep">•</span>
              <span class="meta-item">
                Admitted: <strong>{{ new Date(peopleStore.activeStudent.admissionDate).toLocaleDateString('en-IN') }}</strong>
              </span>
            </div>
          </div>
        </div>

        <div class="hero-actions" v-if="canEdit">
          <button @click="showEditModal = true" class="btn btn-secondary" id="btn-edit-student-profile">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="profile-tabs">
        <button
          @click="activeTab = 'demographics'"
          class="profile-tab-btn"
          :class="{ active: activeTab === 'demographics' }"
          id="tab-demographics"
        >
          Demographics & Identity
        </button>
        <button
          @click="activeTab = 'guardians'"
          class="profile-tab-btn"
          :class="{ active: activeTab === 'guardians' }"
          id="tab-guardians"
        >
          Guardians & Emergency Contacts ({{ peopleStore.activeStudent.guardians.length }})
        </button>
        <button
          @click="activeTab = 'trajectory'"
          class="profile-tab-btn"
          :class="{ active: activeTab === 'trajectory' }"
          id="tab-trajectory"
        >
          Lifelong Trajectory & History ({{ peopleStore.activeStudent.enrollmentHistory.length }})
        </button>
      </div>

      <!-- TAB 1: DEMOGRAPHICS -->
      <div v-if="activeTab === 'demographics'" class="tab-content" id="panel-demographics">
        <div class="details-grid">
          <div class="info-card">
            <h3 class="info-card-title">Personal Bio</h3>
            <div class="info-rows">
              <div class="info-row">
                <span class="info-label">Full Name</span>
                <span class="info-val">{{ peopleStore.activeStudent.fullName }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Gender</span>
                <span class="info-val">{{ peopleStore.activeStudent.gender }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date of Birth</span>
                <span class="info-val">{{ new Date(peopleStore.activeStudent.dateOfBirth).toLocaleDateString('en-IN') }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Blood Group</span>
                <span class="info-val badge-val">{{ peopleStore.activeStudent.bloodGroup.replace('_', '+') }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Nationality</span>
                <span class="info-val">{{ peopleStore.activeStudent.nationality }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Religion</span>
                <span class="info-val">{{ peopleStore.activeStudent.religion || 'Not Specified' }}</span>
              </div>
            </div>
          </div>

          <div class="info-card">
            <h3 class="info-card-title">Statutory & Institutional Details</h3>
            <div class="info-rows">
              <div class="info-row">
                <span class="info-label">APAAR ID</span>
                <span class="info-val">{{ peopleStore.activeStudent.apaarId || 'Pending Registration' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Aadhaar (Last 4)</span>
                <span class="info-val">{{ peopleStore.activeStudent.aadhaarLastFour ? `XXXX-XXXX-${peopleStore.activeStudent.aadhaarLastFour}` : 'Not Provided' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Social Category</span>
                <span class="info-val badge-val">{{ peopleStore.activeStudent.category }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Student Status</span>
                <span class="info-val status-pill" :class="peopleStore.activeStudent.status.toLowerCase()">{{ peopleStore.activeStudent.status }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Student Portal Account</span>
                <span class="info-val" v-if="peopleStore.activeStudent.user">{{ peopleStore.activeStudent.user.email }} (Active)</span>
                <span class="info-val text-muted" v-else>Not Provisioned</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: GUARDIANS -->
      <div v-else-if="activeTab === 'guardians'" class="tab-content" id="panel-guardians">
        <div class="section-actions-bar">
          <p class="section-desc">Designated contacts responsible for communications, fee billing, and student emergency pickup authorization.</p>
          <button v-if="canEdit" @click="showAddGuardianModal = true" class="btn btn-primary" id="btn-open-add-guardian">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Link Guardian
          </button>
        </div>

        <div class="guardians-grid">
          <div
            v-for="g in peopleStore.activeStudent.guardians"
            :key="g.id"
            class="guardian-card"
            :class="{ primary: g.isPrimaryContact }"
          >
            <div class="guardian-header">
              <div class="guardian-info">
                <span class="primary-badge" v-if="g.isPrimaryContact">PRIMARY CONTACT</span>
                <h4 class="guardian-card-name">{{ g.name }}</h4>
                <div class="guardian-rel">{{ g.relationship }}</div>
              </div>
              <button
                v-if="canEdit"
                @click="handleUnlinkGuardian(g.id)"
                class="unlink-btn"
                title="Remove guardian link"
              >
                &times;
              </button>
            </div>

            <div class="guardian-details">
              <div class="contact-item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 text-muted">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a :href="`tel:${g.phone}`" class="contact-link">{{ g.phone }}</a>
              </div>

              <div class="contact-item" v-if="g.email">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 text-muted">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{{ g.email }}</span>
              </div>

              <div class="contact-item" v-if="g.occupation">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 text-muted">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{{ g.occupation }}</span>
              </div>
            </div>

            <div class="guardian-badges">
              <span class="auth-pill" v-if="g.isAuthorizedPickup">
                ✓ Authorized Pickup
              </span>
              <span class="auth-pill" v-if="g.receivesNotifications">
                ✓ Receives Alerts
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: LIFELONG TRAJECTORY -->
      <div v-else-if="activeTab === 'trajectory'" class="tab-content" id="panel-trajectory">
        <div class="trajectory-header">
          <h3 class="trajectory-title">Academic Session History</h3>
          <p class="trajectory-desc">
            Historical sessions are immutable. Each entry permanently preserves class placement, roll call number, and session status for official report cards.
          </p>
        </div>

        <div class="timeline-container">
          <div
            v-for="entry in peopleStore.activeStudent.enrollmentHistory"
            :key="entry.id"
            class="timeline-item"
            :class="{ active: entry.isCurrentYear }"
          >
            <div class="timeline-dot" :class="{ current: entry.isCurrentYear }"></div>
            <div class="timeline-content">
              <div class="timeline-top">
                <div class="timeline-year">
                  Academic Year: <strong>{{ entry.academicYearName }}</strong>
                  <span class="current-tag" v-if="entry.isCurrentYear">ACTIVE SESSION</span>
                </div>
                <span class="status-pill" :class="entry.status.toLowerCase()">
                  {{ entry.status }}
                </span>
              </div>

              <div class="timeline-grade">
                {{ entry.className }} — Section {{ entry.sectionName }}
                <span class="roll-badge" v-if="entry.rollNumber">Roll #{{ entry.rollNumber }}</span>
              </div>

              <div class="timeline-meta" v-if="entry.remarks">
                <span class="remarks-text">Remarks: {{ entry.remarks }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- EDIT PROFILE MODAL -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Edit Student Demographics</h3>
          <button @click="showEditModal = false" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="handleUpdateStudent" class="modal-form">
          <div v-if="modalError" class="error-banner">{{ modalError }}</div>

          <div class="form-row-2">
            <div class="form-group">
              <label>First Name *</label>
              <input v-model="editForm.firstName" type="text" required class="form-input" />
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input v-model="editForm.lastName" type="text" required class="form-input" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>APAAR ID</label>
              <input v-model="editForm.apaarId" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label>Aadhaar Last 4</label>
              <input v-model="editForm.aadhaarLastFour" type="text" maxlength="4" class="form-input" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Blood Group</label>
              <select v-model="editForm.bloodGroup" class="form-select">
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
              <select v-model="editForm.category" class="form-select">
                <option value="GENERAL">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showEditModal = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="modalLoading">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- LINK GUARDIAN MODAL -->
    <div v-if="showAddGuardianModal" class="modal-overlay" @click.self="showAddGuardianModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Link Guardian / Contact</h3>
          <button @click="showAddGuardianModal = false" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="handleLinkGuardian" class="modal-form">
          <div v-if="modalError" class="error-banner">{{ modalError }}</div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Guardian Name *</label>
              <input v-model="guardianForm.name" type="text" required class="form-input" />
            </div>
            <div class="form-group">
              <label>Relationship *</label>
              <select v-model="guardianForm.relationship" class="form-select">
                <option value="FATHER">Father</option>
                <option value="MOTHER">Mother</option>
                <option value="GUARDIAN">Guardian</option>
              </select>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Phone Number *</label>
              <input v-model="guardianForm.phone" type="tel" required class="form-input" />
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input v-model="guardianForm.email" type="email" class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label>Occupation</label>
            <input v-model="guardianForm.occupation" type="text" class="form-input" />
          </div>

          <div class="modal-footer">
            <button type="button" @click="showAddGuardianModal = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="modalLoading">Link Contact</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.breadcrumb-bar {
  display: flex;
  align-items: center;
}

.breadcrumb-back {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.breadcrumb-back:hover {
  color: var(--color-primary);
}

.hero-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.hero-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.hero-avatar.male {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}
.hero-avatar.female {
  background: linear-gradient(135deg, #ec4899, #be185d);
}
.hero-avatar.other {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.hero-identity {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hero-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.hero-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  flex-wrap: wrap;
}

.meta-sep {
  color: var(--color-border);
}

.apaar-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary);
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: monospace;
}

.profile-tabs {
  display: flex;
  gap: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}

.profile-tab-btn {
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

.profile-tab-btn:hover {
  color: var(--color-text-main);
}

.profile-tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-lg);
}

.info-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.info-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0 0 var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.info-label {
  color: var(--color-text-muted);
}

.info-val {
  font-weight: 500;
  color: var(--color-text-main);
}

.badge-val {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
}

/* Guardians Grid */
.section-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.section-desc {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin: 0;
}

.guardians-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-md);
}

.guardian-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.guardian-card.primary {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.05);
}

.guardian-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.primary-badge {
  display: inline-block;
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary);
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  margin-bottom: 0.25rem;
}

.guardian-card-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0;
}

.guardian-rel {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.unlink-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.guardian-details {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.guardian-badges {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-top: auto;
}

.auth-pill {
  font-size: 0.6875rem;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: var(--radius-sm);
}

/* Timeline */
.trajectory-header {
  margin-bottom: var(--spacing-sm);
}

.trajectory-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-main);
  margin: 0;
}

.trajectory-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0 0;
}

.timeline-container {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 2rem;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 0.625rem;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 2px;
  background: var(--color-border);
}

.timeline-item {
  position: relative;
  padding-bottom: var(--spacing-lg);
}

.timeline-dot {
  position: absolute;
  left: -2rem;
  top: 0.25rem;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-border);
  border: 3px solid var(--color-surface);
}

.timeline-dot.current {
  background: var(--color-primary);
  box-shadow: 0 0 10px var(--color-primary);
}

.timeline-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.timeline-item.active .timeline-content {
  border-color: rgba(99, 102, 241, 0.3);
}

.timeline-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-year {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.current-tag {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary);
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  margin-left: 0.5rem;
}

.timeline-grade {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.roll-badge {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-left: 0.5rem;
}

.remarks-text {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
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
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
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

.form-row-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.8125rem;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.status-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.status-pill.enrolled,
.status-pill.active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-pill.promoted {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
}

.status-pill.retained {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
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
  width: 24px;
  height: 24px;
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
</style>
