<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAcademicsStore } from '@/stores/academics.js';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const academicsStore = useAcademicsStore();

const currentStep = ref(1);
const isSubmitting = ref(false);
const setupComplete = ref(false);
const setupResult = ref<any>(null);
const errorMessage = ref<string | null>(null);

const wizardData = reactive({
  academicYearName: '2026-2027',
  startDate: '2026-06-01',
  endDate: '2027-04-30',
  curriculumType: 'CBSE' as 'CBSE' | 'ICSE' | 'STATE',
  includePrePrimary: true,
  includeHigherSecondary: true,
  sectionsPerClass: ['A', 'B'],
  sectionCapacity: 40,
});

onMounted(async () => {
  if (!academicsStore.school) {
    await academicsStore.fetchSchoolProfile();
  }
  if (academicsStore.school?.board) {
    wizardData.curriculumType = academicsStore.school.board as any;
  }
});

function nextStep() {
  errorMessage.value = null;
  if (currentStep.value === 2) {
    if (!wizardData.academicYearName.trim()) {
      errorMessage.value = 'Academic session name is required';
      return;
    }
    if (!wizardData.startDate || !wizardData.endDate) {
      errorMessage.value = 'Please specify both start and end dates';
      return;
    }
    if (new Date(wizardData.startDate) >= new Date(wizardData.endDate)) {
      errorMessage.value = 'Start date must be before end date';
      return;
    }
  }
  currentStep.value++;
}

function prevStep() {
  errorMessage.value = null;
  currentStep.value--;
}

async function handleCompleteSetup() {
  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const res = await academicsStore.bootstrapSetup({
      academicYearName: wizardData.academicYearName,
      startDate: new Date(wizardData.startDate).toISOString(),
      endDate: new Date(wizardData.endDate).toISOString(),
      curriculumType: wizardData.curriculumType,
      includePrePrimary: wizardData.includePrePrimary,
      includeHigherSecondary: wizardData.includeHigherSecondary,
      sectionsPerClass: wizardData.sectionsPerClass,
      sectionCapacity: Number(wizardData.sectionCapacity) || 40,
    });
    setupResult.value = res;
    setupComplete.value = true;
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to complete academic setup wizard';
  } finally {
    isSubmitting.value = false;
  }
}

function toggleSection(sec: string) {
  if (wizardData.sectionsPerClass.includes(sec)) {
    if (wizardData.sectionsPerClass.length > 1) {
      wizardData.sectionsPerClass = wizardData.sectionsPerClass.filter((s) => s !== sec);
    }
  } else {
    wizardData.sectionsPerClass.push(sec);
    wizardData.sectionsPerClass.sort();
  }
}
</script>

<template>
  <div class="onboarding-page" id="academic-onboarding-view">
    <!-- Header -->
    <div class="wizard-header">
      <div class="badge-row">
        <StatusBadge status="active" label="SETUP ASSISTANT" />
      </div>
      <h1 class="wizard-title">Academic Session Onboarding Wizard</h1>
      <p class="wizard-subtitle">
        Streamlined institutional setup: Configure annual calendar, grade levels, sections, and curriculum allocation in 4 simple steps.
      </p>

      <!-- Step Indicator Bar -->
      <div class="steps-progress-bar">
        <div class="step-indicator" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
          <div class="step-num">1</div>
          <span class="step-name">School Identity</span>
        </div>
        <div class="step-line" :class="{ completed: currentStep > 1 }"></div>
        <div class="step-indicator" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
          <div class="step-num">2</div>
          <span class="step-name">Academic Year</span>
        </div>
        <div class="step-line" :class="{ completed: currentStep > 2 }"></div>
        <div class="step-indicator" :class="{ active: currentStep === 3, completed: currentStep > 3 }">
          <div class="step-num">3</div>
          <span class="step-name">Class Structure</span>
        </div>
        <div class="step-line" :class="{ completed: currentStep > 3 }"></div>
        <div class="step-indicator" :class="{ active: currentStep === 4, completed: setupComplete }">
          <div class="step-num">4</div>
          <span class="step-name">Review & Provision</span>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="alert alert-error" id="wizard-error-alert">
      {{ errorMessage }}
    </div>

    <!-- Wizard Card -->
    <div v-if="!setupComplete" class="wizard-card" id="wizard-card">
      <!-- Step 1: School Identity Review -->
      <div v-if="currentStep === 1" class="step-content" id="step-1-content">
        <h2 class="step-title">Review School Organization Profile</h2>
        <p class="step-desc">
          Verify your school entity details before structuring academic sessions and grade levels.
        </p>

        <div class="profile-preview-box">
          <div class="preview-item">
            <span class="preview-label">School Name</span>
            <span class="preview-value">{{ academicsStore.school?.name || 'VidyaSetu Academy' }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Institution Code</span>
            <span class="preview-value font-mono">{{ academicsStore.school?.code || 'VS-BLR-01' }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Board Affiliation</span>
            <span class="preview-value">{{ academicsStore.school?.board || 'CBSE' }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Registration / Affiliation Number</span>
            <span class="preview-value">{{ academicsStore.school?.affiliationNumber || '830412' }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Location / City</span>
            <span class="preview-value">{{ (academicsStore.school?.address as any)?.city || 'Bengaluru' }}</span>
          </div>
        </div>

        <div class="info-callout">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="info-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            Need to update school legal details? You can also adjust them later in 
            <router-link to="/admin/school" class="callout-link">School Profile Settings</router-link>.
          </div>
        </div>

        <div class="step-footer">
          <div></div>
          <button type="button" class="btn btn-primary" id="wizard-step1-next" @click="nextStep">
            Continue to Academic Calendar &rarr;
          </button>
        </div>
      </div>

      <!-- Step 2: Academic Year Configuration -->
      <div v-if="currentStep === 2" class="step-content" id="step-2-content">
        <h2 class="step-title">Configure Academic Session & Calendar</h2>
        <p class="step-desc">
          Specify the active school year. In India, academic years commonly run from June 1 to April 30 (or April 1 to March 31).
        </p>

        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label" for="wizard-year-name">Academic Session Name</label>
            <input
              id="wizard-year-name"
              v-model="wizardData.academicYearName"
              type="text"
              class="form-input"
              placeholder="e.g. 2026-2027"
              required
            />
            <span class="field-hint">This identifier will be displayed across student report cards, ID cards, and receipts</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="wizard-start-date">Session Commences (Start Date)</label>
            <input
              id="wizard-start-date"
              v-model="wizardData.startDate"
              type="date"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="wizard-end-date">Session Concludes (End Date)</label>
            <input
              id="wizard-end-date"
              v-model="wizardData.endDate"
              type="date"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="step-footer">
          <button type="button" class="btn btn-secondary" @click="prevStep">&larr; Back</button>
          <button type="button" class="btn btn-primary" id="wizard-step2-next" @click="nextStep">
            Configure Class Structure &rarr;
          </button>
        </div>
      </div>

      <!-- Step 3: Class Structure & Streams -->
      <div v-if="currentStep === 3" class="step-content" id="step-3-content">
        <h2 class="step-title">Class Structure & Section Allocation</h2>
        <p class="step-desc">
          Customize which educational stages and sections to auto-generate for your institution.
        </p>

        <div class="stages-toggle-group">
          <label class="toggle-card" :class="{ selected: wizardData.includePrePrimary }">
            <input
              type="checkbox"
              v-model="wizardData.includePrePrimary"
              class="form-checkbox"
              id="toggle-pre-primary"
            />
            <div class="toggle-body">
              <strong>Pre-Primary Grades</strong>
              <p>Nursery, LKG, and UKG foundational stages</p>
            </div>
          </label>

          <label class="toggle-card selected">
            <input type="checkbox" checked disabled class="form-checkbox" />
            <div class="toggle-body">
              <strong>Primary & Secondary (Mandatory)</strong>
              <p>Standard Classes 1 through 10 (CBSE/ICSE/State Core)</p>
            </div>
          </label>

          <label class="toggle-card" :class="{ selected: wizardData.includeHigherSecondary }">
            <input
              type="checkbox"
              v-model="wizardData.includeHigherSecondary"
              class="form-checkbox"
              id="toggle-higher-secondary"
            />
            <div class="toggle-body">
              <strong>Senior Secondary (+2)</strong>
              <p>Class 11 and Class 12 junior college streams</p>
            </div>
          </label>
        </div>

        <div class="sections-config-block">
          <label class="form-label">Sections to Create per Grade Level</label>
          <div class="section-selectors">
            <button
              v-for="s in ['A', 'B', 'C', 'D']"
              :key="s"
              type="button"
              class="sec-choice-btn"
              :class="{ active: wizardData.sectionsPerClass.includes(s) }"
              :id="`sec-choice-${s}`"
              @click="toggleSection(s)"
            >
              Section {{ s }}
            </button>
          </div>
          <span class="field-hint">Click to toggle sections automatically provisioned for every class</span>

          <div class="form-group" style="margin-top: 16px; max-width: 240px;">
            <label class="form-label" for="wizard-sec-capacity">Classroom Student Capacity</label>
            <input
              id="wizard-sec-capacity"
              v-model="wizardData.sectionCapacity"
              type="number"
              class="form-input"
              min="10"
              max="100"
            />
          </div>
        </div>

        <div class="step-footer">
          <button type="button" class="btn btn-secondary" @click="prevStep">&larr; Back</button>
          <button type="button" class="btn btn-primary" id="wizard-step3-next" @click="nextStep">
            Review & Finalize &rarr;
          </button>
        </div>
      </div>

      <!-- Step 4: Review & Provision -->
      <div v-if="currentStep === 4" class="step-content" id="step-4-content">
        <h2 class="step-title">Review & Execute Setup</h2>
        <p class="step-desc">
          Confirm the academic configuration summary below before provisioning the database structure.
        </p>

        <div class="summary-card">
          <div class="summary-row">
            <span class="sum-label">Academic Session:</span>
            <span class="sum-value font-bold">{{ wizardData.academicYearName }} (ACTIVE)</span>
          </div>
          <div class="summary-row">
            <span class="sum-label">Calendar Period:</span>
            <span class="sum-value">{{ wizardData.startDate }} to {{ wizardData.endDate }}</span>
          </div>
          <div class="summary-row">
            <span class="sum-label">Grade Levels:</span>
            <span class="sum-value">
              {{ (wizardData.includePrePrimary ? 3 : 0) + 10 + (wizardData.includeHigherSecondary ? 2 : 0) }} Classes
              ({{ wizardData.includePrePrimary ? 'Nursery' : 'Class 1' }} to {{ wizardData.includeHigherSecondary ? 'Class 12' : 'Class 10' }})
            </span>
          </div>
          <div class="summary-row">
            <span class="sum-label">Sections per Grade:</span>
            <span class="sum-value">{{ wizardData.sectionsPerClass.join(', ') }} ({{ wizardData.sectionCapacity }} seats/sec)</span>
          </div>
          <div class="summary-row">
            <span class="sum-label">Total Student Capacity:</span>
            <span class="sum-value highlight">
              {{
                ((wizardData.includePrePrimary ? 3 : 0) + 10 + (wizardData.includeHigherSecondary ? 2 : 0)) *
                wizardData.sectionsPerClass.length *
                wizardData.sectionCapacity
              }} Seats
            </span>
          </div>
        </div>

        <div class="step-footer">
          <button type="button" class="btn btn-secondary" :disabled="isSubmitting" @click="prevStep">
            &larr; Back
          </button>
          <button
            type="button"
            class="btn btn-primary btn-lg"
            id="wizard-execute-btn"
            :disabled="isSubmitting"
            @click="handleCompleteSetup"
          >
            <span v-if="isSubmitting">Provisioning School System...</span>
            <span v-else>Provision Academic System</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Success Celebration View -->
    <div v-else class="success-card" id="wizard-success-card">
      <div class="success-icon-wrap">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 class="success-title">Academic Setup Complete!</h2>
      <p class="success-desc">
        Your school operating system is now initialized with active academic session 
        <strong>{{ wizardData.academicYearName }}</strong>.
      </p>

      <div class="provision-stats-row">
        <div class="prov-stat">
          <div class="prov-num">{{ setupResult?.classesConfigured || 15 }}</div>
          <div class="prov-label">Classes Created</div>
        </div>
        <div class="prov-stat">
          <div class="prov-num">{{ setupResult?.sectionsConfigured || 30 }}</div>
          <div class="prov-label">Sections Allocated</div>
        </div>
        <div class="prov-stat">
          <div class="prov-num">ACTIVE</div>
          <div class="prov-label">Session Status</div>
        </div>
      </div>

      <div class="success-actions">
        <router-link to="/admin/classes" class="btn btn-primary" id="wizard-goto-classes-btn">
          View Classes & Sections
        </router-link>
        <router-link to="/" class="btn btn-secondary" id="wizard-goto-dashboard-btn">
          Go to Dashboard
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: 900px;
  margin: 0 auto;
}

.wizard-header {
  text-align: center;
}

.badge-row {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-2);
}

.wizard-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--color-neutral-900);
  margin-bottom: var(--space-2);
}

.wizard-subtitle {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  max-width: 650px;
  margin: 0 auto var(--space-6);
}

.steps-progress-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
  font-size: var(--text-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.step-name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-neutral-500);
}

.step-indicator.active .step-num {
  background: var(--color-primary);
  color: #ffffff;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
}

.step-indicator.active .step-name {
  color: var(--color-primary);
}

.step-indicator.completed .step-num {
  background: #10b981;
  color: #ffffff;
}

.step-line {
  width: 40px;
  height: 2px;
  background: var(--color-neutral-200);
}

.step-line.completed {
  background: #10b981;
}

.wizard-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-md);
}

.step-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-neutral-900);
  margin-bottom: var(--space-1);
}

.step-desc {
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  margin-bottom: var(--space-6);
}

.profile-preview-box {
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.preview-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.preview-label {
  color: var(--color-neutral-500);
  font-weight: 500;
}

.preview-value {
  color: var(--color-neutral-900);
  font-weight: 600;
}

.font-mono {
  font-family: var(--font-mono);
}

.info-callout {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: #eff6ff;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: #1e40af;
  align-items: center;
}

.info-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.callout-link {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: underline;
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

.form-input {
  height: 42px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

.stages-toggle-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.toggle-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toggle-card.selected {
  border-color: var(--color-primary);
  background: rgba(37, 99, 235, 0.03);
}

.toggle-body strong {
  display: block;
  font-size: var(--text-sm);
  color: var(--color-neutral-900);
}

.toggle-body p {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  margin-top: 2px;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  margin-top: 2px;
}

.section-selectors {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.sec-choice-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-neutral-200);
  background: #ffffff;
  color: var(--color-neutral-700);
  font-weight: 600;
  cursor: pointer;
}

.sec-choice-btn.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
}

.summary-card {
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.sum-label {
  color: var(--color-neutral-500);
}

.sum-value {
  color: var(--color-neutral-900);
}

.sum-value.highlight {
  color: var(--color-primary);
  font-weight: 700;
  font-size: var(--text-base);
}

.font-bold {
  font-weight: 700;
}

.step-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-8);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-neutral-100);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 42px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.btn-lg {
  height: 48px;
  padding: 0 var(--space-6);
  font-size: var(--text-base);
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

.alert {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.alert-error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Success Card */
.success-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-2xl);
  padding: var(--space-12) var(--space-8);
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.success-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #dcfce7;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-4);
}

.success-icon-wrap svg {
  width: 36px;
  height: 36px;
}

.success-title {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-neutral-900);
  margin-bottom: var(--space-2);
}

.success-desc {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
  max-width: 480px;
  margin: 0 auto var(--space-6);
}

.provision-stats-row {
  display: flex;
  justify-content: center;
  gap: var(--space-8);
  margin-bottom: var(--space-8);
}

.prov-num {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--color-primary);
}

.prov-label {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
  font-weight: 600;
}

.success-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
}
</style>
