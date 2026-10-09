<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  useFeesStore,
  PaymentMode,
  StudentFeeStatus,
  FeeFrequency,
  StudentFeeLedgerItem,
  FeeStructure,
} from '../../stores/fees.js';
import { useAcademicsStore } from '../../stores/academics.js';

const route = useRoute();
const feesStore = useFeesStore();
const academicsStore = useAcademicsStore();

// Tab state: 'ledgers' | 'terminal' | 'structures'
const activeTab = ref<'ledgers' | 'terminal' | 'structures'>('ledgers');

// Notifications
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

function showSuccess(msg: string) {
  successMessage.value = msg;
  errorMessage.value = null;
  setTimeout(() => {
    if (successMessage.value === msg) successMessage.value = null;
  }, 4000);
}

function showError(msg: string) {
  errorMessage.value = msg;
  successMessage.value = null;
}

// ----------------------------------------------------------------------------
// Global Filters & Academic Year
// ----------------------------------------------------------------------------
const selectedAcademicYearId = ref('');
const selectedClassFilter = ref('');
const selectedSectionFilter = ref('');
const selectedStatusFilter = ref<string>('ALL');
const searchQuery = ref('');

// Computed classes & sections
const classes = computed(() => academicsStore.classes);
const availableSections = computed(() => {
  if (!selectedClassFilter.value) return [];
  const cls = classes.value.find((c) => c.id === selectedClassFilter.value);
  return cls?.sections || [];
});

// ----------------------------------------------------------------------------
// TAB 1: Ledgers & Filters
// ----------------------------------------------------------------------------
async function loadLedgers() {
  try {
    await feesStore.fetchStudentFees({
      academicYearId: selectedAcademicYearId.value || undefined,
      classId: selectedClassFilter.value || undefined,
      sectionId: selectedSectionFilter.value || undefined,
      status: selectedStatusFilter.value !== 'ALL' ? (selectedStatusFilter.value as StudentFeeStatus) : undefined,
      search: searchQuery.value || undefined,
    });
  } catch (err: any) {
    showError(err.message || 'Failed to load student fee ledgers');
  }
}

// Selected ledger for modal view
const viewingLedger = ref<StudentFeeLedgerItem | null>(null);
const showLedgerModal = ref(false);

function openLedgerDetails(item: StudentFeeLedgerItem) {
  viewingLedger.value = item;
  showLedgerModal.value = true;
}

// ----------------------------------------------------------------------------
// TAB 2: Fee Collection Terminal
// ----------------------------------------------------------------------------
const selectedStudentLedger = ref<StudentFeeLedgerItem | null>(null);

const paymentForm = ref({
  amountPaid: 0,
  paymentMode: 'UPI' as PaymentMode,
  transactionReference: '',
  notes: '',
  paidOn: new Date().toISOString().slice(0, 10),
});

const isSubmittingPayment = ref(false);

function selectStudentForCollection(item: StudentFeeLedgerItem) {
  selectedStudentLedger.value = item;
  paymentForm.value.amountPaid = item.dueAmount;
  paymentForm.value.paymentMode = 'UPI';
  paymentForm.value.transactionReference = '';
  paymentForm.value.notes = '';
  paymentForm.value.paidOn = new Date().toISOString().slice(0, 10);
  activeTab.value = 'terminal';
}

function setFullDueAmount() {
  if (selectedStudentLedger.value) {
    paymentForm.value.amountPaid = selectedStudentLedger.value.dueAmount;
  }
}

async function submitPayment() {
  if (!selectedStudentLedger.value) {
    showError('Please select a student fee ledger first');
    return;
  }
  if (paymentForm.value.amountPaid <= 0) {
    showError('Payment amount must be greater than zero');
    return;
  }
  if (paymentForm.value.amountPaid > selectedStudentLedger.value.dueAmount) {
    showError(
      `Payment amount (₹${paymentForm.value.amountPaid}) cannot exceed outstanding dues (₹${selectedStudentLedger.value.dueAmount})`
    );
    return;
  }

  isSubmittingPayment.value = true;
  try {
    const res = await feesStore.collectPayment({
      studentFeeId: selectedStudentLedger.value.id,
      amountPaid: Number(paymentForm.value.amountPaid),
      paymentMode: paymentForm.value.paymentMode,
      transactionReference: paymentForm.value.transactionReference || undefined,
      notes: paymentForm.value.notes || undefined,
      paidOn: paymentForm.value.paidOn || undefined,
    });

    showSuccess(
      `Payment of ₹${paymentForm.value.amountPaid.toLocaleString('en-IN')} recorded successfully! Receipt ${res.payment?.receiptNumber} issued.`
    );

    // Refresh stats & ledgers
    await Promise.all([
      feesStore.fetchStats(selectedAcademicYearId.value),
      loadLedgers(),
    ]);

    // Update terminal view
    if (res.studentFee) {
      selectedStudentLedger.value = {
        ...selectedStudentLedger.value,
        ...res.studentFee,
      };
      paymentForm.value.amountPaid = res.studentFee.dueAmount;
    }
  } catch (err: any) {
    showError(err.message || 'Payment submission failed');
  } finally {
    isSubmittingPayment.value = false;
  }
}

// ----------------------------------------------------------------------------
// TAB 3: Fee Structures & Modal
// ----------------------------------------------------------------------------
const showCreateStructureModal = ref(false);
const newStructureForm = ref({
  academicYearId: '',
  classId: '',
  name: '',
  description: '',
  components: [
    { title: 'Tuition Fee', amount: 36000, frequency: 'ANNUAL' as FeeFrequency },
    { title: 'Computer Lab Fee', amount: 5000, frequency: 'ANNUAL' as FeeFrequency },
    { title: 'Library Fee', amount: 2500, frequency: 'ANNUAL' as FeeFrequency },
    { title: 'Sports & Activity Fee', amount: 3500, frequency: 'ANNUAL' as FeeFrequency },
  ],
});

function addComponentRow() {
  newStructureForm.value.components.push({
    title: '',
    amount: 1000,
    frequency: 'ANNUAL',
  });
}

function removeComponentRow(index: number) {
  if (newStructureForm.value.components.length > 1) {
    newStructureForm.value.components.splice(index, 1);
  }
}

const computedStructureTotal = computed(() => {
  return newStructureForm.value.components.reduce(
    (sum, c) => sum + Number(c.amount || 0),
    0
  );
});

async function saveFeeStructure() {
  if (!newStructureForm.value.name.trim()) {
    showError('Please enter a fee structure name');
    return;
  }
  if (!newStructureForm.value.classId) {
    showError('Please select a target class');
    return;
  }

  try {
    await feesStore.createStructure({
      academicYearId: selectedAcademicYearId.value,
      classId: newStructureForm.value.classId,
      name: newStructureForm.value.name,
      description: newStructureForm.value.description,
      components: newStructureForm.value.components,
    });
    showSuccess('Fee structure created successfully!');
    showCreateStructureModal.value = false;
  } catch (err: any) {
    showError(err.message || 'Failed to create fee structure');
  }
}

// Batch Allocate Modal
const showBatchAllocateModal = ref(false);
const batchAllocateForm = ref({
  feeStructureId: '',
  academicYearId: '',
  classId: '',
  sectionId: '',
});
const isAllocating = ref(false);

function openBatchAllocateModal(structure: FeeStructure) {
  batchAllocateForm.value.feeStructureId = structure.id;
  batchAllocateForm.value.classId = structure.classId;
  batchAllocateForm.value.academicYearId = structure.academicYearId;
  batchAllocateForm.value.sectionId = '';
  showBatchAllocateModal.value = true;
}

async function submitBatchAllocate() {
  isAllocating.value = true;
  try {
    const res = await feesStore.batchAllocateClassFee({
      feeStructureId: batchAllocateForm.value.feeStructureId,
      academicYearId: batchAllocateForm.value.academicYearId,
      classId: batchAllocateForm.value.classId,
      sectionId: batchAllocateForm.value.sectionId || undefined,
    });
    showSuccess(`Allocated fee plan to ${res.count} student(s) successfully!`);
    showBatchAllocateModal.value = false;
    await Promise.all([
      feesStore.fetchStats(selectedAcademicYearId.value),
      loadLedgers(),
    ]);
  } catch (err: any) {
    showError(err.message || 'Failed to allocate fee plan');
  } finally {
    isAllocating.value = false;
  }
}

// ----------------------------------------------------------------------------
// Official Printable Receipt Modal
// ----------------------------------------------------------------------------
const activeReceipt = computed(() => feesStore.activeReceipt);

function printReceipt() {
  window.print();
}

function closeReceipt() {
  feesStore.clearActiveReceipt();
}

// Number to words helper for Indian currency
function formatIndianCurrency(num: number | undefined): string {
  if (num === undefined || isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ----------------------------------------------------------------------------
// Lifecycle & Route sync
// ----------------------------------------------------------------------------
onMounted(async () => {
  try {
    await academicsStore.fetchAcademicYears();
    await academicsStore.fetchClasses();

    if (academicsStore.currentAcademicYear) {
      selectedAcademicYearId.value = academicsStore.currentAcademicYear.id;
      newStructureForm.value.academicYearId = academicsStore.currentAcademicYear.id;
    }

    await Promise.all([
      feesStore.fetchStats(selectedAcademicYearId.value),
      feesStore.fetchStructures({ academicYearId: selectedAcademicYearId.value }),
      loadLedgers(),
    ]);

    // Check for receipt number in route params
    if (route?.params?.receiptNumber) {
      await feesStore.fetchReceipt(route.params.receiptNumber as string);
    }
  } catch (err: any) {
    showError(err.message || 'Error loading fees dashboard');
  }
});

watch(selectedAcademicYearId, async (newVal) => {
  if (newVal) {
    newStructureForm.value.academicYearId = newVal;
    await Promise.all([
      feesStore.fetchStats(newVal),
      feesStore.fetchStructures({ academicYearId: newVal }),
      loadLedgers(),
    ]);
  }
});
</script>

<template>
  <div class="fees-view" id="vidya-fees-view">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <div class="title-with-badge">
          <h1 class="page-title">Finance & Fee Management</h1>
          <span class="badge-finance">Milestone 9</span>
        </div>
        <p class="page-subtitle">
          Manage modular Indian school fee plans, student dues ledgers, multi-mode payment collection, and official CBSE printable receipts.
        </p>
      </div>

      <div class="header-actions">
        <!-- Academic Session Selector -->
        <div class="session-picker">
          <label for="ay-select" class="picker-label">Academic Session:</label>
          <select
            id="ay-select"
            v-model="selectedAcademicYearId"
            class="form-select session-select"
          >
            <option
              v-for="ay in academicsStore.academicYears"
              :key="ay.id"
              :value="ay.id"
            >
              {{ ay.name }} {{ ay.isCurrent ? '(Active)' : '' }}
            </option>
          </select>
        </div>

        <button
          class="btn btn-primary create-plan-btn"
          @click="showCreateStructureModal = true"
        >
          <span class="btn-icon">+</span> Create Fee Plan
        </button>
      </div>
    </header>

    <!-- Global Alerts -->
    <div v-if="successMessage" class="alert alert-success">
      <span class="alert-icon">✓</span>
      <span>{{ successMessage }}</span>
    </div>
    <div v-if="errorMessage" class="alert alert-danger">
      <span class="alert-icon">⚠</span>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Executive KPI Dashboard Cards -->
    <section class="kpi-grid" v-if="feesStore.stats">
      <div class="kpi-card">
        <div class="kpi-label">Gross Invoiced</div>
        <div class="kpi-value text-muted-val">
          {{ formatIndianCurrency(feesStore.stats.totalGrossInvoiced) }}
        </div>
        <div class="kpi-subtext">
          Concessions: -{{ formatIndianCurrency(feesStore.stats.totalConcessions) }}
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Net Expected Revenue</div>
        <div class="kpi-value text-primary">
          {{ formatIndianCurrency(feesStore.stats.totalNetExpected) }}
        </div>
        <div class="kpi-subtext">
          Enrolled Students: {{ feesStore.stats.totalStudentsEnrolledInFeePlans }}
        </div>
      </div>

      <div class="kpi-card success-card">
        <div class="kpi-label">Total Fee Collected</div>
        <div class="kpi-value text-success">
          {{ formatIndianCurrency(feesStore.stats.totalPaid) }}
        </div>
        <div class="kpi-subtext">
          Collection Rate: <strong>{{ feesStore.stats.collectionRatePercentage }}%</strong>
        </div>
      </div>

      <div class="kpi-card warning-card">
        <div class="kpi-label">Outstanding Dues</div>
        <div class="kpi-value text-warning">
          {{ formatIndianCurrency(feesStore.stats.totalOutstanding) }}
        </div>
        <div class="kpi-subtext">
          Pending: {{ feesStore.stats.statusCounts?.['UNPAID'] || 0 }} unpaid |
          {{ feesStore.stats.statusCounts?.['PARTIALLY_PAID'] || 0 }} partial
        </div>
      </div>
    </section>

    <!-- Navigation Tabs -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'ledgers' }"
        @click="activeTab = 'ledgers'"
      >
        Student Fee Ledgers & Dues
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'terminal' }"
        @click="activeTab = 'terminal'"
      >
        Fee Collection Terminal
        <span v-if="selectedStudentLedger" class="tab-badge">Active</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'structures' }"
        @click="activeTab = 'structures'"
      >
        Fee Plans & Structures ({{ feesStore.structures.length }})
      </button>
    </div>

    <!-- ===================================================================== -->
    <!-- TAB 1: Student Fee Ledgers Table & Filters                            -->
    <!-- ===================================================================== -->
    <section v-if="activeTab === 'ledgers'" class="tab-content">
      <!-- Search & Filter Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search student or admission number..."
            class="form-input search-input"
            @input="loadLedgers"
          />
        </div>

        <div class="filter-group">
          <select
            v-model="selectedClassFilter"
            class="form-select"
            @change="loadLedgers"
          >
            <option value="">All Classes</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>

          <select
            v-model="selectedSectionFilter"
            class="form-select"
            :disabled="!selectedClassFilter"
            @change="loadLedgers"
          >
            <option value="">All Sections</option>
            <option v-for="s in availableSections" :key="s.id" :value="s.id">
              Section {{ s.name }}
            </option>
          </select>

          <select
            v-model="selectedStatusFilter"
            class="form-select"
            @change="loadLedgers"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      <!-- Ledgers Table -->
      <div class="table-container">
        <div v-if="feesStore.loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading student fee records...</p>
        </div>

        <div v-else-if="feesStore.studentFees.length === 0" class="empty-state">
          <p>No student fee ledgers match your criteria.</p>
          <span class="empty-hint">Use "Create Fee Plan" or allocate plans to classes to generate student dues.</span>
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Fee Plan</th>
              <th>Gross</th>
              <th>Concession</th>
              <th>Net Due</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in feesStore.studentFees" :key="item.id">
              <td class="student-cell">
                <div class="avatar-circle">
                  {{ item.enrollment.student.firstName.charAt(0) }}
                </div>
                <div>
                  <div class="student-name">
                    {{ item.enrollment.student.firstName }} {{ item.enrollment.student.lastName }}
                  </div>
                  <div class="student-adm">
                    Adm: {{ item.enrollment.student.admissionNumber }}
                  </div>
                </div>
              </td>
              <td>
                <span class="class-badge">
                  {{ item.enrollment.class.name }} - {{ item.enrollment.section.name }}
                </span>
              </td>
              <td class="plan-name">{{ item.feeStructure.name }}</td>
              <td>{{ formatIndianCurrency(item.grossAmount) }}</td>
              <td class="text-muted">
                {{ item.concessionAmount > 0 ? '-' + formatIndianCurrency(item.concessionAmount) : '—' }}
              </td>
              <td class="font-bold">{{ formatIndianCurrency(item.netPayable) }}</td>
              <td class="text-success">{{ formatIndianCurrency(item.paidAmount) }}</td>
              <td class="font-bold" :class="{ 'text-warning': item.dueAmount > 0, 'text-muted': item.dueAmount === 0 }">
                {{ formatIndianCurrency(item.dueAmount) }}
              </td>
              <td>
                <span
                  class="status-pill"
                  :class="{
                    'status-paid': item.status === 'PAID',
                    'status-partial': item.status === 'PARTIALLY_PAID',
                    'status-unpaid': item.status === 'UNPAID',
                    'status-overdue': item.status === 'OVERDUE',
                  }"
                >
                  {{ item.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="text-right">
                <div class="action-buttons">
                  <button
                    v-if="item.dueAmount > 0"
                    class="btn btn-sm btn-primary"
                    @click="selectStudentForCollection(item)"
                    title="Collect payment from student"
                  >
                    Collect
                  </button>
                  <button
                    class="btn btn-sm btn-outline"
                    @click="openLedgerDetails(item)"
                    title="View full fee statement"
                  >
                    Statement
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- TAB 2: Fee Collection Terminal                                        -->
    <!-- ===================================================================== -->
    <section v-if="activeTab === 'terminal'" class="tab-content terminal-grid">
      <!-- Left: Student Selector & Ledger Summary -->
      <div class="terminal-left">
        <div class="card terminal-card">
          <h2 class="card-title">Student Fee Profile</h2>

          <div v-if="!selectedStudentLedger" class="terminal-empty">
            <p>Select a student from the <strong>Student Fee Ledgers</strong> tab to open their payment terminal.</p>
            <button class="btn btn-outline" @click="activeTab = 'ledgers'">
              Browse Students
            </button>
          </div>

          <div v-else class="student-profile-details">
            <div class="profile-header">
              <div class="profile-avatar">
                {{ selectedStudentLedger.enrollment.student.firstName.charAt(0) }}
              </div>
              <div class="profile-meta">
                <h3>
                  {{ selectedStudentLedger.enrollment.student.firstName }}
                  {{ selectedStudentLedger.enrollment.student.lastName }}
                </h3>
                <p>
                  Class: <strong>{{ selectedStudentLedger.enrollment.class.name }} ({{ selectedStudentLedger.enrollment.section.name }})</strong> |
                  Admission No: <strong>{{ selectedStudentLedger.enrollment.student.admissionNumber }}</strong>
                </p>
              </div>
            </div>

            <!-- Ledger Breakdown Cards -->
            <div class="breakdown-cards">
              <div class="b-card">
                <span class="b-label">Total Fee Plan</span>
                <span class="b-val">{{ formatIndianCurrency(selectedStudentLedger.grossAmount) }}</span>
              </div>
              <div class="b-card" v-if="selectedStudentLedger.concessionAmount > 0">
                <span class="b-label">Concession Discount</span>
                <span class="b-val text-success">
                  -{{ formatIndianCurrency(selectedStudentLedger.concessionAmount) }}
                </span>
                <span class="b-sub" v-if="selectedStudentLedger.concessionReason">
                  {{ selectedStudentLedger.concessionReason }}
                </span>
              </div>
              <div class="b-card">
                <span class="b-label">Total Paid Till Date</span>
                <span class="b-val text-success">{{ formatIndianCurrency(selectedStudentLedger.paidAmount) }}</span>
              </div>
              <div class="b-card due-highlight">
                <span class="b-label">Outstanding Balance</span>
                <span class="b-val text-warning">{{ formatIndianCurrency(selectedStudentLedger.dueAmount) }}</span>
              </div>
            </div>

            <!-- Fee Components Accordion -->
            <div class="components-preview" v-if="selectedStudentLedger.feeStructure.components">
              <h4 class="components-title">Fee Heads Breakdown</h4>
              <ul class="components-list">
                <li
                  v-for="comp in selectedStudentLedger.feeStructure.components"
                  :key="comp.title"
                  class="component-item"
                >
                  <span>{{ comp.title }}</span>
                  <strong>{{ formatIndianCurrency(comp.amount) }}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Payment Entry Form -->
      <div class="terminal-right">
        <div class="card terminal-card" v-if="selectedStudentLedger">
          <h2 class="card-title">Collect Fee Payment</h2>

          <div v-if="selectedStudentLedger.dueAmount === 0" class="paid-in-full-banner">
            <span class="banner-icon">✓</span>
            <div>
              <h4>Account Settled in Full!</h4>
              <p>All fee installments for this student have been completed.</p>
            </div>
          </div>

          <form v-else @submit.prevent="submitPayment" class="payment-form">
            <!-- Amount Input -->
            <div class="form-group">
              <div class="label-with-action">
                <label for="amount-paid">Amount to Collect (₹) *</label>
                <button
                  type="button"
                  class="btn-link"
                  @click="setFullDueAmount"
                >
                  Pay Full Balance ({{ formatIndianCurrency(selectedStudentLedger.dueAmount) }})
                </button>
              </div>
              <input
                id="amount-paid"
                v-model.number="paymentForm.amountPaid"
                type="number"
                step="0.01"
                min="1"
                :max="selectedStudentLedger.dueAmount"
                class="form-input amount-large-input"
                required
              />
            </div>

            <!-- Payment Mode Selector -->
            <div class="form-group">
              <label>Payment Mode *</label>
              <div class="payment-modes-grid">
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: paymentForm.paymentMode === 'UPI' }"
                  @click="paymentForm.paymentMode = 'UPI'"
                >
                  <span class="mode-icon">⚡</span>
                  <span>UPI / QR Scan</span>
                </button>
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: paymentForm.paymentMode === 'CASH' }"
                  @click="paymentForm.paymentMode = 'CASH'"
                >
                  <span class="mode-icon">💵</span>
                  <span>Cash Counter</span>
                </button>
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: paymentForm.paymentMode === 'NEFT_RTGS' }"
                  @click="paymentForm.paymentMode = 'NEFT_RTGS'"
                >
                  <span class="mode-icon">🏦</span>
                  <span>Bank NEFT / RTGS</span>
                </button>
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: paymentForm.paymentMode === 'CHEQUE' }"
                  @click="paymentForm.paymentMode = 'CHEQUE'"
                >
                  <span class="mode-icon">✍</span>
                  <span>Bank Cheque</span>
                </button>
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: paymentForm.paymentMode === 'DEMAND_DRAFT' }"
                  @click="paymentForm.paymentMode = 'DEMAND_DRAFT'"
                >
                  <span class="mode-icon">📜</span>
                  <span>Demand Draft</span>
                </button>
                <button
                  type="button"
                  class="mode-btn"
                  :class="{ active: paymentForm.paymentMode === 'CARD' }"
                  @click="paymentForm.paymentMode = 'CARD'"
                >
                  <span class="mode-icon">💳</span>
                  <span>Debit / Credit Card</span>
                </button>
              </div>
            </div>

            <!-- Transaction Reference / UTR -->
            <div class="form-group">
              <label for="txn-ref">Transaction Reference / UTR / Cheque Number</label>
              <input
                id="txn-ref"
                v-model="paymentForm.transactionReference"
                type="text"
                placeholder="e.g. UPI/20260420/192837 or Cheque #00412"
                class="form-input"
              />
            </div>

            <!-- Date & Notes -->
            <div class="form-row">
              <div class="form-group col-half">
                <label for="payment-date">Collection Date *</label>
                <input
                  id="payment-date"
                  v-model="paymentForm.paidOn"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group col-half">
                <label for="payment-notes">Internal Notes / Remarks</label>
                <input
                  id="payment-notes"
                  v-model="paymentForm.notes"
                  type="text"
                  placeholder="e.g. Term 1 partial collection"
                  class="form-input"
                />
              </div>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="btn btn-primary btn-block submit-payment-btn"
              :disabled="isSubmittingPayment || paymentForm.amountPaid <= 0"
            >
              <span v-if="isSubmittingPayment">Processing Transaction...</span>
              <span v-else>
                Submit Payment & Issue Receipt ({{ formatIndianCurrency(paymentForm.amountPaid) }})
              </span>
            </button>
          </form>
        </div>
      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- TAB 3: Fee Structures & Plans                                         -->
    <!-- ===================================================================== -->
    <section v-if="activeTab === 'structures'" class="tab-content">
      <div class="structures-grid">
        <div
          v-for="structure in feesStore.structures"
          :key="structure.id"
          class="structure-card"
        >
          <div class="s-header">
            <div>
              <span class="s-stage-badge">{{ structure.class?.stage }}</span>
              <h3 class="s-title">{{ structure.name }}</h3>
              <p class="s-class">Applicable: Class {{ structure.class?.name }}</p>
            </div>
            <div class="s-total">
              <span class="s-total-label">Annual Plan</span>
              <span class="s-total-val">{{ formatIndianCurrency(structure.totalAmount) }}</span>
            </div>
          </div>

          <p class="s-desc" v-if="structure.description">{{ structure.description }}</p>

          <!-- Components Table -->
          <div class="s-components">
            <h4 class="s-components-head">Fee Heads</h4>
            <div
              v-for="c in structure.components"
              :key="c.id"
              class="s-comp-row"
            >
              <span class="s-comp-title">{{ c.title }}</span>
              <span class="s-comp-freq">{{ c.frequency }}</span>
              <span class="s-comp-amount">{{ formatIndianCurrency(c.amount) }}</span>
            </div>
          </div>

          <div class="s-footer">
            <span class="s-enrolled-count">
              {{ structure._count?.studentFees || 0 }} Students Enrolled
            </span>
            <button
              class="btn btn-sm btn-outline"
              @click="openBatchAllocateModal(structure)"
            >
              Batch Allocate to Class
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- MODAL: Create Fee Structure                                           -->
    <!-- ===================================================================== -->
    <div v-if="showCreateStructureModal" class="modal-backdrop">
      <div class="modal-container">
        <div class="modal-header">
          <h2>Create New Fee Plan</h2>
          <button class="modal-close-btn" @click="showCreateStructureModal = false">×</button>
        </div>

        <form @submit.prevent="saveFeeStructure" class="modal-body">
          <div class="form-row">
            <div class="form-group col-half">
              <label>Plan Name *</label>
              <input
                v-model="newStructureForm.name"
                type="text"
                placeholder="e.g. Class 10 CBSE Standard Fee Plan 2026-27"
                class="form-input"
                required
              />
            </div>
            <div class="form-group col-half">
              <label>Target Class *</label>
              <select
                v-model="newStructureForm.classId"
                class="form-select"
                required
              >
                <option value="">Select Class</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.stage }})
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Plan Description</label>
            <textarea
              v-model="newStructureForm.description"
              rows="2"
              class="form-textarea"
              placeholder="Brief details regarding amenities, installments and board curriculum"
            ></textarea>
          </div>

          <!-- Dynamic Fee Components -->
          <div class="components-builder">
            <div class="builder-header">
              <label class="builder-title">Fee Heads & Components</label>
              <button
                type="button"
                class="btn btn-sm btn-outline"
                @click="addComponentRow"
              >
                + Add Head
              </button>
            </div>

            <div
              v-for="(comp, idx) in newStructureForm.components"
              :key="idx"
              class="comp-builder-row"
            >
              <input
                v-model="comp.title"
                type="text"
                placeholder="Head Title (e.g. Tuition, Computer Lab)"
                class="form-input col-flex-2"
                required
              />
              <input
                v-model.number="comp.amount"
                type="number"
                step="100"
                min="0"
                placeholder="Amount (₹)"
                class="form-input col-flex-1"
                required
              />
              <select v-model="comp.frequency" class="form-select col-flex-1">
                <option value="ANNUAL">Annual</option>
                <option value="TERM_WISE">Term-wise</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="ONE_TIME">One Time</option>
              </select>
              <button
                type="button"
                class="btn-remove-row"
                @click="removeComponentRow(idx)"
                title="Remove component"
              >
                🗑
              </button>
            </div>

            <div class="builder-total">
              <span>Total Annual Fee:</span>
              <strong>{{ formatIndianCurrency(computedStructureTotal) }}</strong>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-outline"
              @click="showCreateStructureModal = false"
            >
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Save Fee Plan
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MODAL: Batch Allocate to Class                                        -->
    <!-- ===================================================================== -->
    <div v-if="showBatchAllocateModal" class="modal-backdrop">
      <div class="modal-container modal-sm">
        <div class="modal-header">
          <h2>Batch Allocate Fee Plan</h2>
          <button class="modal-close-btn" @click="showBatchAllocateModal = false">×</button>
        </div>
        <form @submit.prevent="submitBatchAllocate" class="modal-body">
          <p class="modal-desc">
            This action generates individual student fee ledgers for all active enrollments in the selected class who do not already have this plan.
          </p>

          <div class="form-group">
            <label>Target Section (Optional)</label>
            <select v-model="batchAllocateForm.sectionId" class="form-select">
              <option value="">All Sections in Class</option>
              <option
                v-for="s in classes.find(c => c.id === batchAllocateForm.classId)?.sections || []"
                :key="s.id"
                :value="s.id"
              >
                Section {{ s.name }}
              </option>
            </select>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-outline"
              @click="showBatchAllocateModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isAllocating"
            >
              {{ isAllocating ? 'Allocating...' : 'Confirm Allocation' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MODAL: Printable Official CBSE Fee Receipt                            -->
    <!-- ===================================================================== -->
    <div v-if="activeReceipt" class="modal-backdrop receipt-modal-backdrop">
      <div class="modal-container receipt-modal">
        <div class="no-print receipt-toolbar">
          <button class="btn btn-outline" @click="closeReceipt">Close</button>
          <button class="btn btn-primary" @click="printReceipt">
            🖨 Print Official Receipt
          </button>
        </div>

        <!-- Official Receipt Document (Printable) -->
        <div class="receipt-document" id="printable-fee-receipt">
          <!-- School Header -->
          <div class="receipt-header">
            <div class="receipt-logo-mark">VS</div>
            <div class="receipt-school-info">
              <h2 class="school-name">{{ activeReceipt.school.name }}</h2>
              <p class="school-meta">
                CBSE Affiliation No: {{ activeReceipt.school.affiliationNumber || '830129' }} | School Code: {{ activeReceipt.school.code }}
              </p>
              <p class="school-address" v-if="activeReceipt.school.address">
                {{ activeReceipt.school.address }}
              </p>
            </div>
          </div>

          <div class="receipt-title-banner">
            <h3>FEE PAYMENT RECEIPT</h3>
          </div>

          <!-- Top Meta Grid -->
          <div class="receipt-meta-grid">
            <div class="receipt-meta-item">
              <span class="m-label">Receipt Number:</span>
              <strong class="m-val text-mono">{{ activeReceipt.receiptNumber }}</strong>
            </div>
            <div class="receipt-meta-item">
              <span class="m-label">Date of Payment:</span>
              <strong class="m-val">{{ new Date(activeReceipt.paidOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }}</strong>
            </div>
            <div class="receipt-meta-item">
              <span class="m-label">Student Name:</span>
              <strong class="m-val">{{ activeReceipt.student.name }}</strong>
            </div>
            <div class="receipt-meta-item">
              <span class="m-label">Admission Number:</span>
              <strong class="m-val text-mono">{{ activeReceipt.student.admissionNumber }}</strong>
            </div>
            <div class="receipt-meta-item">
              <span class="m-label">Class & Section:</span>
              <strong class="m-val">Class {{ activeReceipt.student.className }} - {{ activeReceipt.student.sectionName }}</strong>
            </div>
            <div class="receipt-meta-item">
              <span class="m-label">Academic Year:</span>
              <strong class="m-val">{{ activeReceipt.student.academicYear }}</strong>
            </div>
          </div>

          <!-- Fee Breakdown Table -->
          <table class="receipt-table">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Fee Particulars / Heads</th>
                <th>Frequency</th>
                <th class="text-right">Scheduled Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(comp, i) in activeReceipt.feeStructure.components"
                :key="comp.title"
              >
                <td>{{ i + 1 }}</td>
                <td>{{ comp.title }}</td>
                <td>{{ comp.frequency }}</td>
                <td class="text-right">{{ formatIndianCurrency(comp.amount) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-right font-bold">Total Gross Annual Fee:</td>
                <td class="text-right font-bold">{{ formatIndianCurrency(activeReceipt.ledger.grossAmount) }}</td>
              </tr>
              <tr v-if="activeReceipt.ledger.concessionAmount > 0">
                <td colspan="3" class="text-right font-bold text-success">
                  Approved Concession ({{ activeReceipt.ledger.concessionReason || 'Scholarship' }}):
                </td>
                <td class="text-right font-bold text-success">
                  -{{ formatIndianCurrency(activeReceipt.ledger.concessionAmount) }}
                </td>
              </tr>
              <tr>
                <td colspan="3" class="text-right font-bold">Net Annual Payable:</td>
                <td class="text-right font-bold">{{ formatIndianCurrency(activeReceipt.ledger.netPayable) }}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Payment Details Box -->
          <div class="receipt-payment-box">
            <div class="payment-box-left">
              <div class="paid-amount-row">
                <span>Amount Paid This Receipt:</span>
                <span class="paid-sum">{{ formatIndianCurrency(activeReceipt.amountPaid) }}</span>
              </div>
              <div class="paid-mode-row">
                <span>Payment Mode: <strong>{{ activeReceipt.paymentMode }}</strong></span>
                <span v-if="activeReceipt.transactionReference">
                  | Ref / UTR: <strong>{{ activeReceipt.transactionReference }}</strong>
                </span>
              </div>
              <div class="paid-balance-row">
                <span>Remaining Outstanding Balance: </span>
                <strong :class="{ 'text-warning': activeReceipt.ledger.remainingDue > 0 }">
                  {{ formatIndianCurrency(activeReceipt.ledger.remainingDue) }}
                </strong>
              </div>
            </div>

            <div class="payment-box-right">
              <div class="stamp-seal">
                <span class="stamp-verified">✓ PAID</span>
                <span class="stamp-name">VIDYA ACADEMY</span>
                <span class="stamp-sub">FINANCE & ACCOUNTS</span>
              </div>
            </div>
          </div>

          <!-- Signatures -->
          <div class="receipt-signatures">
            <div class="sig-block">
              <div class="sig-line"></div>
              <p>Parent / Guardian Signature</p>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <p>Cashier: {{ activeReceipt.collectedBy?.name || 'Accounts Desk' }}</p>
            </div>
          </div>

          <div class="receipt-footnote">
            <p>This is a computer-generated official receipt issued by Vidya School Operating System.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fees-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.badge-finance {
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary-400);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.25rem;
  max-width: 650px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.session-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.picker-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.session-select {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  color: var(--text-primary);
  border-radius: var(--radius-md);
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.kpi-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.kpi-subtext {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.text-primary {
  color: #818cf8;
}

.text-success {
  color: #10b981;
}

.text-warning {
  color: #f59e0b;
}

.text-muted {
  color: var(--text-muted);
}

.font-bold {
  font-weight: 600;
}

/* Tabs */
.tab-nav {
  display: flex;
  border-bottom: 1px solid var(--color-card-border);
  gap: 0.5rem;
}

.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: #818cf8;
  border-bottom-color: #818cf8;
}

.tab-badge {
  background: #10b981;
  color: white;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 0.85rem 1.25rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-input {
  min-width: 280px;
}

.form-input,
.form-select,
.form-textarea {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #818cf8;
}

/* Table */
.table-container {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table th {
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-card-border);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-card-border);
  color: var(--text-primary);
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.student-name {
  font-weight: 600;
}

.student-adm {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.class-badge {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
}

.plan-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.status-pill {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  display: inline-block;
}

.status-paid {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.status-partial {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.status-unpaid {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover {
  background: #4f46e5;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-card-border);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: var(--color-surface-raised);
}

.btn-sm {
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
}

.btn-block {
  width: 100%;
  justify-content: center;
}

.btn-link {
  background: none;
  border: none;
  color: #818cf8;
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
}

/* Terminal Grid */
.terminal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .terminal-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-card-border);
  padding-bottom: 0.75rem;
}

.terminal-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-meta h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.profile-meta p {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.breakdown-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.b-card {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
}

.b-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.b-val {
  font-size: 1.15rem;
  font-weight: 700;
  margin-top: 0.2rem;
}

.b-sub {
  font-size: 0.7rem;
  color: #10b981;
}

.due-highlight {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.05);
}

.components-preview {
  border-top: 1px solid var(--color-card-border);
  padding-top: 1rem;
}

.components-title {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.components-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.component-item {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  font-size: 0.85rem;
  border-bottom: 1px dashed var(--color-card-border);
}

/* Payment Form */
.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.amount-large-input {
  font-size: 1.5rem !important;
  font-weight: 700;
  padding: 0.75rem 1rem !important;
  color: #10b981 !important;
}

.payment-modes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.mode-btn {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  color: var(--text-primary);
  padding: 0.65rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  border-color: #818cf8;
}

.mode-btn.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.col-half {
  flex: 1;
}

.submit-payment-btn {
  padding: 0.85rem;
  font-size: 1rem;
  margin-top: 0.5rem;
}

/* Structures Tab Grid */
.structures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.structure-card {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.s-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.s-stage-badge {
  font-size: 0.68rem;
  background: rgba(99, 102, 241, 0.1);
  color: #818cf8;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-sm);
  font-weight: 700;
}

.s-title {
  margin: 0.35rem 0 0.15rem;
  font-size: 1rem;
  font-weight: 700;
}

.s-class {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.s-total-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  display: block;
  text-align: right;
}

.s-total-val {
  font-size: 1.25rem;
  font-weight: 700;
  color: #10b981;
}

.s-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.s-components {
  border-top: 1px solid var(--color-card-border);
  padding-top: 0.75rem;
  margin-bottom: 1rem;
}

.s-components-head {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-top: 0;
  margin-bottom: 0.4rem;
}

.s-comp-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.3rem 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
}

.s-comp-freq {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.s-footer {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.s-enrolled-count {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-container {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  max-width: 650px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.modal-sm {
  max-width: 440px;
}

.modal-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--color-card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.modal-close-btn {
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

.components-builder {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-md);
  padding: 1rem;
}

.builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.comp-builder-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.col-flex-2 {
  flex: 2;
}

.col-flex-1 {
  flex: 1;
}

.btn-remove-row {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem;
  font-size: 1rem;
}

.builder-total {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--color-card-border);
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  font-size: 0.9rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

/* ========================================================================= */
/* PRINTABLE OFFICIAL RECEIPT                                                */
/* ========================================================================= */
.receipt-modal-backdrop {
  background: rgba(0, 0, 0, 0.85);
}

.receipt-modal {
  max-width: 780px;
  background: white !important;
  color: #111827 !important;
  border: none;
  border-radius: 8px;
}

.receipt-toolbar {
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.receipt-document {
  padding: 2.5rem;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #111827;
}

.receipt-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border-bottom: 2px solid #111827;
  padding-bottom: 1rem;
}

.receipt-logo-mark {
  width: 56px;
  height: 56px;
  background: #1e1b4b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 800;
  border-radius: 6px;
}

.school-name {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #111827;
}

.school-meta {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  color: #4b5563;
}

.school-address {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: #6b7280;
}

.receipt-title-banner {
  text-align: center;
  margin: 1.25rem 0 1rem;
}

.receipt-title-banner h3 {
  display: inline-block;
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  border-bottom: 2px solid #111827;
  padding-bottom: 2px;
}

.receipt-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 0.85rem 1.25rem;
  border-radius: 6px;
  font-size: 0.82rem;
  margin-bottom: 1.25rem;
}

.receipt-meta-item {
  display: flex;
  justify-content: space-between;
}

.m-label {
  color: #4b5563;
}

.m-val {
  color: #111827;
}

.text-mono {
  font-family: monospace;
}

.receipt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  margin-bottom: 1.25rem;
}

.receipt-table th {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 700;
}

.receipt-table td {
  border: 1px solid #d1d5db;
  padding: 0.45rem 0.75rem;
}

.receipt-table tfoot td {
  border: 1px solid #d1d5db;
  padding: 0.45rem 0.75rem;
}

.receipt-payment-box {
  display: flex;
  justify-content: space-between;
  border: 1px solid #111827;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 2rem;
}

.paid-amount-row {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.paid-sum {
  font-size: 1.25rem;
  color: #047857;
  margin-left: 0.5rem;
}

.paid-mode-row {
  font-size: 0.8rem;
  color: #4b5563;
  margin-bottom: 0.35rem;
}

.paid-balance-row {
  font-size: 0.85rem;
}

.stamp-seal {
  border: 2px dashed #047857;
  color: #047857;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.stamp-verified {
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.stamp-name {
  font-size: 0.65rem;
  font-weight: 800;
}

.stamp-sub {
  font-size: 0.6rem;
  font-weight: 700;
}

.receipt-signatures {
  display: flex;
  justify-content: space-between;
  margin-top: 3rem;
  padding: 0 2rem;
}

.sig-block {
  text-align: center;
  width: 200px;
}

.sig-line {
  border-top: 1px solid #111827;
  margin-bottom: 0.4rem;
}

.sig-block p {
  margin: 0;
  font-size: 0.75rem;
  color: #4b5563;
}

.receipt-footnote {
  text-align: center;
  margin-top: 2rem;
  border-top: 1px dashed #e5e7eb;
  padding-top: 0.75rem;
  font-size: 0.7rem;
  color: #9ca3af;
}

/* Print CSS Rule */
@media print {
  body * {
    visibility: hidden;
  }
  .receipt-modal,
  .receipt-modal * {
    visibility: visible;
  }
  .receipt-modal {
    position: absolute;
    left: 0;
    top: 0;
    width: 100% !important;
    max-width: 100% !important;
    box-shadow: none !important;
  }
  .no-print {
    display: none !important;
  }
}
</style>
