import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.js';

export type FeeFrequency = 'ONE_TIME' | 'ANNUAL' | 'TERM_WISE' | 'QUARTERLY' | 'MONTHLY';
export type StudentFeeStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type PaymentMode = 'UPI' | 'NEFT_RTGS' | 'CASH' | 'CHEQUE' | 'DEMAND_DRAFT' | 'CARD';

export interface FeeComponent {
  id: string;
  feeStructureId?: string;
  title: string;
  amount: number;
  frequency: FeeFrequency;
  dueDate?: string | null;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  name: string;
  description?: string | null;
  totalAmount: number;
  components: FeeComponent[];
  class?: {
    id: string;
    name: string;
    code: string;
    stage: string;
  };
  academicYear?: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
  _count?: {
    studentFees: number;
  };
}

export interface FeePayment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  transactionReference?: string | null;
  paidOn: string;
  notes?: string | null;
  collectedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    primaryRole: string;
  } | null;
}

export interface StudentFeeLedgerItem {
  id: string;
  schoolId: string;
  enrollmentId: string;
  feeStructureId: string;
  grossAmount: number;
  concessionAmount: number;
  concessionReason?: string | null;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  status: StudentFeeStatus;
  dueDate?: string | null;
  enrollment: {
    id: string;
    student: {
      id: string;
      admissionNumber: string;
      firstName: string;
      middleName?: string | null;
      lastName: string;
      photoUrl?: string | null;
    };
    class: {
      id: string;
      name: string;
      code: string;
    };
    section: {
      id: string;
      name: string;
    };
    academicYear?: {
      id: string;
      name: string;
    };
    rollNumber?: number | null;
  };
  feeStructure: {
    id: string;
    name: string;
    totalAmount: number;
    components?: FeeComponent[];
  };
  payments?: FeePayment[];
}

export interface OfficialReceipt {
  receiptNumber: string;
  paidOn: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  transactionReference?: string | null;
  notes?: string | null;
  school: {
    id: string;
    name: string;
    code: string;
    board: string;
    affiliationNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  student: {
    id: string;
    admissionNumber: string;
    name: string;
    className: string;
    sectionName: string;
    rollNumber?: number | null;
    academicYear: string;
  };
  feeStructure: {
    id: string;
    name: string;
    components: Array<{
      title: string;
      amount: number;
      frequency: FeeFrequency;
    }>;
  };
  ledger: {
    grossAmount: number;
    concessionAmount: number;
    concessionReason?: string | null;
    netPayable: number;
    totalPaidTillDate: number;
    remainingDue: number;
    status: StudentFeeStatus;
  };
  collectedBy: {
    name: string;
    role: string;
    email?: string;
  } | null;
}

export interface FeeStatistics {
  totalGrossInvoiced: number;
  totalConcessions: number;
  totalNetExpected: number;
  totalPaid: number;
  totalOutstanding: number;
  collectionRatePercentage: number;
  totalStudentsEnrolledInFeePlans: number;
  statusCounts: Record<string, number>;
  paymentModeBreakdown: Record<string, { count: number; totalAmount: number }>;
  classBreakdown: Array<{
    className: string;
    expected: number;
    collected: number;
    due: number;
    count: number;
    collectionRate: number;
  }>;
}

export const useFeesStore = defineStore('fees', () => {
  const structures = ref<FeeStructure[]>([]);
  const studentFees = ref<StudentFeeLedgerItem[]>([]);
  const selectedStudentFee = ref<StudentFeeLedgerItem | null>(null);
  const stats = ref<FeeStatistics | null>(null);
  const activeReceipt = ref<OfficialReceipt | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  // Pagination metadata
  const totalLedgers = ref(0);
  const currentPage = ref(1);
  const totalPages = ref(1);

  function getAuthHeaders(): HeadersInit {
    const authStore = useAuthStore();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authStore.accessToken}`,
    };
  }

  /**
   * Fetch executive financial stats
   */
  async function fetchStats(academicYearId?: string) {
    loading.value = true;
    error.value = null;
    try {
      const q = academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : '';
      const res = await fetch(`/api/v1/fees/stats${q}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch financial stats');
      stats.value = json.data;
      return stats.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch fee structures
   */
  async function fetchStructures(filter?: { academicYearId?: string; classId?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filter?.academicYearId) params.append('academicYearId', filter.academicYearId);
      if (filter?.classId) params.append('classId', filter.classId);

      const q = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/v1/fees/structures${q}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch fee structures');
      structures.value = json.data || [];
      return structures.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new fee structure
   */
  async function createStructure(payload: {
    academicYearId: string;
    classId: string;
    name: string;
    description?: string;
    components: Array<{
      title: string;
      amount: number;
      frequency?: FeeFrequency;
      dueDate?: string;
    }>;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/fees/structures', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create fee structure');

      structures.value.unshift(json.data);
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Fetch paginated student fee ledgers
   */
  async function fetchStudentFees(query: {
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    status?: StudentFeeStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (query.academicYearId) params.append('academicYearId', query.academicYearId);
      if (query.classId) params.append('classId', query.classId);
      if (query.sectionId) params.append('sectionId', query.sectionId);
      if (query.status) params.append('status', query.status);
      if (query.search) params.append('search', query.search);
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());

      const res = await fetch(`/api/v1/fees/students?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch student fees');

      studentFees.value = json.data || [];
      if (json.meta) {
        totalLedgers.value = json.meta.total;
        currentPage.value = json.meta.page;
        totalPages.value = json.meta.totalPages;
      }
      return studentFees.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get single student fee details
   */
  async function fetchStudentFeeDetails(enrollmentId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/fees/students/${encodeURIComponent(enrollmentId)}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch student fee details');
      selectedStudentFee.value = json.data;
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Collect a fee payment
   */
  async function collectPayment(payload: {
    studentFeeId: string;
    amountPaid: number;
    paymentMode: PaymentMode;
    transactionReference?: string;
    notes?: string;
    paidOn?: string;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/fees/payments/collect', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to collect payment');

      // Update in local studentFees list if present
      const updatedIndex = studentFees.value.findIndex((s) => s.id === payload.studentFeeId);
      if (updatedIndex !== -1 && json.data.studentFee) {
        studentFees.value[updatedIndex] = {
          ...studentFees.value[updatedIndex],
          ...json.data.studentFee,
        };
      }

      // Automatically fetch full receipt for immediate display/print
      if (json.data.payment?.receiptNumber) {
        await fetchReceipt(json.data.payment.receiptNumber);
      }

      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Allocate fee structure to individual student
   */
  async function allocateStudentFee(payload: {
    enrollmentId: string;
    feeStructureId: string;
    concessionAmount?: number;
    concessionReason?: string;
    dueDate?: string;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/fees/allocate/student', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to allocate student fee');
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Batch allocate fee structure to an entire class
   */
  async function batchAllocateClassFee(payload: {
    academicYearId: string;
    classId: string;
    feeStructureId: string;
    sectionId?: string;
    defaultConcessionAmount?: number;
    defaultConcessionReason?: string;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/fees/allocate/class', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to batch allocate fee to class');
      return json.data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Fetch official receipt by receipt number
   */
  async function fetchReceipt(receiptNumber: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/fees/receipts/${encodeURIComponent(receiptNumber)}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch official receipt');
      activeReceipt.value = json.data;
      return activeReceipt.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearActiveReceipt() {
    activeReceipt.value = null;
  }

  return {
    structures,
    studentFees,
    selectedStudentFee,
    stats,
    activeReceipt,
    loading,
    saving,
    error,
    totalLedgers,
    currentPage,
    totalPages,
    fetchStats,
    fetchStructures,
    createStructure,
    fetchStudentFees,
    fetchStudentFeeDetails,
    collectPayment,
    allocateStudentFee,
    batchAllocateClassFee,
    fetchReceipt,
    clearActiveReceipt,
  };
});
