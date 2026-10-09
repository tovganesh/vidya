import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { useFeesStore } from '../src/stores/fees.js';
import { useAcademicsStore } from '../src/stores/academics.js';
import FeesView from '../src/views/finance/FeesView.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('Frontend FeesStore & Views (Milestone 9: Fees, Dues & Indian Receipts)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with clean default state', () => {
    const store = useFeesStore();
    expect(store.structures).toEqual([]);
    expect(store.studentFees).toEqual([]);
    expect(store.selectedStudentFee).toBeNull();
    expect(store.stats).toBeNull();
    expect(store.activeReceipt).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.saving).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetches financial KPI statistics and populates state', async () => {
    const mockStats = {
      totalGrossInvoiced: 144000,
      totalConcessions: 4800,
      totalNetExpected: 139200,
      totalPaid: 67200,
      totalOutstanding: 72000,
      collectionRatePercentage: 48.3,
      totalStudentsEnrolledInFeePlans: 3,
      statusCounts: { PAID: 1, PARTIALLY_PAID: 1, UNPAID: 1 },
      paymentModeBreakdown: {
        UPI: { count: 1, totalAmount: 24000 },
        NEFT_RTGS: { count: 1, totalAmount: 43200 },
      },
      classBreakdown: [
        {
          className: 'Class 10',
          expected: 139200,
          collected: 67200,
          due: 72000,
          count: 3,
          collectionRate: 48.3,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockStats }),
    });

    const store = useFeesStore();
    const result = await store.fetchStats('ay-1');

    expect(result).toEqual(mockStats);
    expect(store.stats?.totalPaid).toBe(67200);
    expect(store.stats?.collectionRatePercentage).toBe(48.3);
  });

  it('fetches fee structures with individual fee components', async () => {
    const mockStructures = [
      {
        id: 'struct-1',
        schoolId: 'sch-1',
        academicYearId: 'ay-1',
        classId: 'cls-10',
        name: 'Class 10 CBSE Standard Fee Plan 2026-27',
        totalAmount: 48000,
        components: [
          { id: 'comp-1', title: 'Tuition Fee', amount: 36000, frequency: 'ANNUAL' },
          { id: 'comp-2', title: 'Computer Lab Fee', amount: 6000, frequency: 'ANNUAL' },
          { id: 'comp-3', title: 'Sports Fee', amount: 6000, frequency: 'ANNUAL' },
        ],
        _count: { studentFees: 3 },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockStructures }),
    });

    const store = useFeesStore();
    const result = await store.fetchStructures();

    expect(result.length).toBe(1);
    expect(store.structures[0]?.name).toContain('Class 10');
    expect(store.structures[0]?.components.length).toBe(3);
  });

  it('creates a fee structure and prepends to local list', async () => {
    const newStructure = {
      id: 'struct-2',
      schoolId: 'sch-1',
      academicYearId: 'ay-1',
      classId: 'cls-9',
      name: 'Class 9 Standard Fee Plan 2026-27',
      totalAmount: 42000,
      components: [
        { id: 'comp-4', title: 'Tuition Fee', amount: 34000, frequency: 'ANNUAL' },
        { id: 'comp-5', title: 'Lab Fee', amount: 8000, frequency: 'ANNUAL' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: newStructure }),
    });

    const store = useFeesStore();
    const result = await store.createStructure({
      academicYearId: 'ay-1',
      classId: 'cls-9',
      name: 'Class 9 Standard Fee Plan 2026-27',
      components: [
        { title: 'Tuition Fee', amount: 34000 },
        { title: 'Lab Fee', amount: 8000 },
      ],
    });

    expect(result.id).toBe('struct-2');
    expect(store.structures[0]?.id).toBe('struct-2');
  });

  it('fetches student fee ledgers with pagination metadata', async () => {
    const mockLedgers = [
      {
        id: 'fee-1',
        enrollmentId: 'enr-1',
        feeStructureId: 'struct-1',
        grossAmount: 48000,
        concessionAmount: 0,
        netPayable: 48000,
        paidAmount: 24000,
        dueAmount: 24000,
        status: 'PARTIALLY_PAID',
        enrollment: {
          id: 'enr-1',
          student: {
            id: 'stu-1',
            admissionNumber: 'VS-2024-0101',
            firstName: 'Aarav',
            lastName: 'Kumar',
          },
          class: { id: 'c-1', name: 'Class 10', code: 'STD-10' },
          section: { id: 's-1', name: 'A' },
        },
        feeStructure: { id: 'struct-1', name: 'Class 10 Fee Plan', totalAmount: 48000 },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockLedgers,
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      }),
    });

    const store = useFeesStore();
    const result = await store.fetchStudentFees();

    expect(result.length).toBe(1);
    expect(store.studentFees[0]?.enrollment.student.firstName).toBe('Aarav');
    expect(store.totalLedgers).toBe(1);
  });

  it('collects payment and issues formal receipt', async () => {
    const paymentResponse = {
      payment: {
        id: 'pay-1',
        receiptNumber: 'REC-2026-0005',
        amountPaid: 24000,
        paymentMode: 'UPI',
        paidOn: '2026-04-25T10:00:00Z',
      },
      studentFee: {
        id: 'fee-1',
        paidAmount: 48000,
        dueAmount: 0,
        status: 'PAID',
      },
    };

    const mockReceipt = {
      receiptNumber: 'REC-2026-0005',
      paidOn: '2026-04-25T10:00:00Z',
      amountPaid: 24000,
      paymentMode: 'UPI',
      school: { name: 'Vidya Academy, Bengaluru', code: 'VS-BLR-01' },
      student: { name: 'Aarav Kumar', admissionNumber: 'VS-2024-0101', className: 'Class 10' },
      feeStructure: { name: 'Class 10 Fee Plan', components: [] },
      ledger: { grossAmount: 48000, concessionAmount: 0, netPayable: 48000, totalPaidTillDate: 48000, remainingDue: 0, status: 'PAID' },
      collectedBy: { name: 'Suresh Patel', role: 'ACCOUNTANT' },
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: paymentResponse }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockReceipt }),
      });

    const store = useFeesStore();
    store.studentFees = [
      {
        id: 'fee-1',
        dueAmount: 24000,
        paidAmount: 24000,
        status: 'PARTIALLY_PAID',
      } as any,
    ];

    const result = await store.collectPayment({
      studentFeeId: 'fee-1',
      amountPaid: 24000,
      paymentMode: 'UPI',
    });

    expect(result.payment.receiptNumber).toBe('REC-2026-0005');
    expect(store.studentFees[0]?.status).toBe('PAID');
    expect(store.activeReceipt?.receiptNumber).toBe('REC-2026-0005');
  });

  it('mounts FeesView component and renders dashboard sections', async () => {
    const sampleStats = {
      totalGrossInvoiced: 144000,
      totalConcessions: 4800,
      totalNetExpected: 139200,
      totalPaid: 67200,
      totalOutstanding: 72000,
      collectionRatePercentage: 48.3,
      totalStudentsEnrolledInFeePlans: 3,
      statusCounts: { PAID: 1, PARTIALLY_PAID: 1, UNPAID: 1 },
      paymentModeBreakdown: {},
      classBreakdown: [],
    };

    // Mock global fetch for onMounted lifecycle calls
    global.fetch = vi.fn().mockImplementation((input: any) => {
      const url = String(input);
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: sampleStats }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          academicYears: [
            { id: 'ay-1', name: '2026-2027', isCurrent: true },
          ],
          classes: [
            { id: 'c-1', name: 'Class 10', code: 'STD-10', sections: [{ id: 's-1', name: 'A' }] },
          ],
        }),
      });
    });

    const academicsStore = useAcademicsStore();
    academicsStore.academicYears = [
      {
        id: 'ay-1',
        schoolId: 'sch-1',
        name: '2026-2027',
        startDate: '2026-06-01',
        endDate: '2027-04-30',
        status: 'ACTIVE',
        isCurrent: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const feesStore = useFeesStore();
    feesStore.stats = {
      totalGrossInvoiced: 144000,
      totalConcessions: 4800,
      totalNetExpected: 139200,
      totalPaid: 67200,
      totalOutstanding: 72000,
      collectionRatePercentage: 48.3,
      totalStudentsEnrolledInFeePlans: 3,
      statusCounts: { PAID: 1, PARTIALLY_PAID: 1, UNPAID: 1 },
      paymentModeBreakdown: {},
      classBreakdown: [],
    };

    const wrapper = mount(FeesView, {
      global: {
        mocks: {
          $route: { params: {} },
        },
      },
    });

    expect(wrapper.find('.page-title').text()).toContain('Finance & Fee Management');
    expect(wrapper.find('.badge-finance').text()).toBe('Milestone 9');

    // Tab buttons exist
    const tabButtons = wrapper.findAll('.tab-btn');
    expect(tabButtons.length).toBe(3);
    expect(tabButtons[0]?.text()).toContain('Student Fee Ledgers');
    expect(tabButtons[1]?.text()).toContain('Fee Collection Terminal');
    expect(tabButtons[2]?.text()).toContain('Fee Plans & Structures');

    // KPI cards rendered with Indian Rupee currency
    const kpiCards = wrapper.findAll('.kpi-card');
    expect(kpiCards.length).toBe(4);
    expect(wrapper.text()).toContain('₹1,39,200.00'); // Net Expected
    expect(wrapper.text()).toContain('₹67,200.00');  // Total Paid
  });
});
