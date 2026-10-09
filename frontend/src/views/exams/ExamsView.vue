<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useExamsStore, ExamTermType, AssessmentType } from '../../stores/exams.js';
import { useAcademicsStore } from '../../stores/academics.js';
import { usePeopleStore } from '../../stores/people.js';

const route = useRoute();
const examsStore = useExamsStore();
const academicsStore = useAcademicsStore();
const peopleStore = usePeopleStore();

// Tab state: 'terms' | 'marks' | 'report-card'
const activeTab = ref<'terms' | 'marks' | 'report-card'>('terms');

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

// -------------------------------------------------------------
// TAB 1: Terms & Schedules State & Modals
// -------------------------------------------------------------
const selectedAcademicYearId = ref('');
const selectedTermId = ref('');
const selectedExamId = ref('');

// Modals
const showCreateTermModal = ref(false);
const newTermForm = ref({
  name: '',
  type: 'TERM_1' as ExamTermType,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  isCurrent: false,
});

const showCreateExamModal = ref(false);
const newExamForm = ref({
  termId: '',
  classId: '',
  name: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
});

const showCreateAssessmentModal = ref(false);
const newAssessmentForm = ref({
  examId: '',
  subjectId: '',
  type: 'THEORY' as AssessmentType,
  maxMarks: 80,
  passingMarks: 26,
  weightage: 80,
  date: new Date().toISOString().slice(0, 10),
});

// -------------------------------------------------------------
// TAB 2: Marks Entry Sheet State
// -------------------------------------------------------------
const selectedMarksExamId = ref('');
const selectedAssessmentId = ref('');
interface LocalMarkEntry {
  enrollmentId: string;
  studentId: string;
  admissionNumber: string;
  rollNumber: number | null;
  fullName: string;
  sectionName: string;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks: string;
  isError: boolean;
  errorMessage: string;
}
const localMarksEntries = ref<LocalMarkEntry[]>([]);

// -------------------------------------------------------------
// TAB 3: CBSE Report Card State
// -------------------------------------------------------------
const selectedReportClassId = ref('');
const selectedReportSectionId = ref('');
const selectedReportEnrollmentId = ref('');
const selectedReportTermId = ref('');

// -------------------------------------------------------------
// Computed Helpers
// -------------------------------------------------------------
const marksSelectedAssessment = computed(() => {
  return examsStore.assessments.find((a) => a.id === selectedAssessmentId.value) || null;
});

const marksStats = computed(() => {
  const total = localMarksEntries.value.length;
  let entered = 0;
  let absent = 0;
  let totalScore = 0;
  let scoreCount = 0;
  const max = marksSelectedAssessment.value?.maxMarks || 100;

  for (const entry of localMarksEntries.value) {
    if (entry.isAbsent) {
      absent++;
      entered++;
    } else if (entry.marksObtained !== null && !isNaN(entry.marksObtained)) {
      entered++;
      totalScore += entry.marksObtained;
      scoreCount++;
    }
  }

  const avgPercentage = scoreCount > 0 && max > 0 ? Math.round(((totalScore / scoreCount) / max) * 100) : 0;
  return {
    total,
    entered,
    pending: total - entered,
    absent,
    avgPercentage,
  };
});

const availableReportSections = computed(() => {
  if (!selectedReportClassId.value) return academicsStore.sections;
  return academicsStore.sections.filter((s) => s.classId === selectedReportClassId.value);
});

const reportStudentsList = computed(() => {
  return peopleStore.enrollments.filter((enr) => {
    if (selectedReportClassId.value && enr.classId !== selectedReportClassId.value) return false;
    if (selectedReportSectionId.value && enr.sectionId !== selectedReportSectionId.value) return false;
    return true;
  });
});

// -------------------------------------------------------------
// Lifecycle & Data Fetching
// -------------------------------------------------------------
onMounted(async () => {
  try {
    await Promise.all([
      academicsStore.fetchAcademicYears(),
      academicsStore.fetchClasses(),
      academicsStore.fetchSections(),
      academicsStore.fetchSubjects(),
      peopleStore.fetchEnrollments(),
      examsStore.fetchGradingScales(),
    ]);

    // Set default academic year
    const currentYear = academicsStore.academicYears.find((y) => y.isCurrent) || academicsStore.academicYears[0];
    if (currentYear) {
      selectedAcademicYearId.value = currentYear.id;
      await examsStore.fetchTerms(currentYear.id);
    } else {
      await examsStore.fetchTerms();
    }

    if (examsStore.terms.length > 0) {
      selectedTermId.value = examsStore.terms[0]!.id;
      await examsStore.fetchExams({ termId: selectedTermId.value });
      if (examsStore.exams.length > 0) {
        selectedExamId.value = examsStore.exams[0]!.id;
        selectedMarksExamId.value = examsStore.exams[0]!.id;
        await examsStore.fetchAssessments(selectedExamId.value);
        if (examsStore.assessments.length > 0) {
          selectedAssessmentId.value = examsStore.assessments[0]!.id;
          await loadMarksSheet(selectedAssessmentId.value);
        }
      }
    }

    // Check route parameters (e.g. /exams/report-card/:enrollmentId or query ?tab=report-card)
    if (route.params.enrollmentId) {
      selectedReportEnrollmentId.value = route.params.enrollmentId as string;
      activeTab.value = 'report-card';
      await loadReportCard();
    } else if (route.query.tab) {
      activeTab.value = route.query.tab as any;
    }
  } catch (err: any) {
    showError(err.message || 'Error initializing examination dashboard');
  }
});

// Watch academic year changes to reload terms
watch(selectedAcademicYearId, async (newVal) => {
  if (newVal) {
    await examsStore.fetchTerms(newVal);
    if (examsStore.terms.length > 0) {
      selectedTermId.value = examsStore.terms[0]!.id;
    } else {
      selectedTermId.value = '';
    }
  }
});

// Watch term changes to reload exams
watch(selectedTermId, async (newVal) => {
  if (newVal) {
    await examsStore.fetchExams({ termId: newVal });
    if (examsStore.exams.length > 0) {
      selectedExamId.value = examsStore.exams[0]!.id;
      await examsStore.fetchAssessments(selectedExamId.value);
    } else {
      selectedExamId.value = '';
      examsStore.assessments = [];
    }
  }
});

// Watch selected exam for assessments
watch(selectedExamId, async (newVal) => {
  if (newVal) {
    await examsStore.fetchAssessments(newVal);
  }
});

// Watch marks exam selection
watch(selectedMarksExamId, async (newVal) => {
  if (newVal) {
    await examsStore.fetchAssessments(newVal);
    if (examsStore.assessments.length > 0) {
      selectedAssessmentId.value = examsStore.assessments[0]!.id;
      await loadMarksSheet(selectedAssessmentId.value);
    } else {
      selectedAssessmentId.value = '';
      localMarksEntries.value = [];
    }
  }
});

// Watch assessment selection for marks spreadsheet
watch(selectedAssessmentId, async (newVal) => {
  if (newVal) {
    await loadMarksSheet(newVal);
  }
});

// -------------------------------------------------------------
// Methods: Tab 1 Actions
// -------------------------------------------------------------
function openCreateTerm() {
  newTermForm.value = {
    name: '',
    type: 'TERM_1',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    isCurrent: false,
  };
  showCreateTermModal.value = true;
}

async function handleCreateTerm() {
  if (!selectedAcademicYearId.value) {
    showError('Please select an academic year');
    return;
  }
  if (!newTermForm.value.name.trim()) {
    showError('Term name is required');
    return;
  }
  try {
    await examsStore.createTerm({
      academicYearId: selectedAcademicYearId.value,
      name: newTermForm.value.name.trim(),
      type: newTermForm.value.type,
      startDate: newTermForm.value.startDate,
      endDate: newTermForm.value.endDate,
      isCurrent: newTermForm.value.isCurrent,
    });
    showCreateTermModal.value = false;
    showSuccess('Exam term created successfully');
    if (examsStore.terms.length > 0) {
      selectedTermId.value = examsStore.terms[examsStore.terms.length - 1]!.id;
    }
  } catch (err: any) {
    showError(err.message || 'Failed to create exam term');
  }
}

function openCreateExam() {
  if (!selectedTermId.value) {
    showError('Please select an exam term first');
    return;
  }
  newExamForm.value = {
    termId: selectedTermId.value,
    classId: academicsStore.classes[0]?.id || '',
    name: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
  };
  showCreateExamModal.value = true;
}

async function handleCreateExam() {
  if (!newExamForm.value.name.trim()) {
    showError('Exam name is required');
    return;
  }
  if (!newExamForm.value.classId) {
    showError('Class is required');
    return;
  }
  try {
    await examsStore.createExam({
      termId: newExamForm.value.termId,
      classId: newExamForm.value.classId,
      name: newExamForm.value.name.trim(),
      startDate: newExamForm.value.startDate,
      endDate: newExamForm.value.endDate,
    });
    showCreateExamModal.value = false;
    showSuccess('Exam scheduled successfully');
  } catch (err: any) {
    showError(err.message || 'Failed to schedule exam');
  }
}

function openCreateAssessment(examId: string) {
  newAssessmentForm.value = {
    examId,
    subjectId: academicsStore.subjects[0]?.id || '',
    type: 'THEORY',
    maxMarks: 80,
    passingMarks: 26,
    weightage: 80,
    date: new Date().toISOString().slice(0, 10),
  };
  showCreateAssessmentModal.value = true;
}

async function handleCreateAssessment() {
  if (!newAssessmentForm.value.subjectId) {
    showError('Subject is required');
    return;
  }
  if (newAssessmentForm.value.maxMarks <= 0) {
    showError('Maximum marks must be greater than 0');
    return;
  }
  try {
    await examsStore.createAssessment({
      examId: newAssessmentForm.value.examId,
      subjectId: newAssessmentForm.value.subjectId,
      type: newAssessmentForm.value.type,
      maxMarks: Number(newAssessmentForm.value.maxMarks),
      passingMarks: Number(newAssessmentForm.value.passingMarks) || undefined,
      weightage: Number(newAssessmentForm.value.weightage) || undefined,
      date: newAssessmentForm.value.date,
    });
    showCreateAssessmentModal.value = false;
    showSuccess('Assessment component added successfully');
  } catch (err: any) {
    showError(err.message || 'Failed to add assessment component');
  }
}

function jumpToMarksEntry(examId: string, assessmentId: string) {
  selectedMarksExamId.value = examId;
  selectedAssessmentId.value = assessmentId;
  activeTab.value = 'marks';
}

// -------------------------------------------------------------
// Methods: Tab 2 Marks Spreadsheet Actions
// -------------------------------------------------------------
async function loadMarksSheet(assessmentId: string) {
  try {
    const sheet = await examsStore.fetchMarksSheet(assessmentId);
    localMarksEntries.value = sheet.students.map((s: any) => ({
      enrollmentId: s.enrollmentId,
      studentId: s.studentId,
      admissionNumber: s.admissionNumber,
      rollNumber: s.rollNumber,
      fullName: s.fullName,
      sectionName: s.sectionName,
      marksObtained: s.marksObtained,
      isAbsent: Boolean(s.isAbsent),
      remarks: s.remarks || '',
      isError: false,
      errorMessage: '',
    }));
  } catch (err: any) {
    showError(err.message || 'Failed to load marks roster');
  }
}

function validateEntry(entry: LocalMarkEntry) {
  const max = marksSelectedAssessment.value?.maxMarks ?? 100;
  if (entry.isAbsent) {
    entry.marksObtained = null;
    entry.isError = false;
    entry.errorMessage = '';
    return;
  }

  if (entry.marksObtained === null || isNaN(entry.marksObtained as number)) {
    entry.isError = false;
    entry.errorMessage = '';
    return;
  }

  if (entry.marksObtained < 0) {
    entry.isError = true;
    entry.errorMessage = 'Cannot be negative';
  } else if (entry.marksObtained > max) {
    entry.isError = true;
    entry.errorMessage = `Exceeds max (${max})`;
  } else {
    entry.isError = false;
    entry.errorMessage = '';
  }
}

function getGradePreview(marks: number | null, isAbsent: boolean) {
  if (isAbsent) return { grade: 'AB', color: 'badge-absent' };
  if (marks === null || isNaN(marks)) return { grade: '—', color: 'badge-pending' };
  const max = marksSelectedAssessment.value?.maxMarks || 100;
  const pct = (marks / max) * 100;

  if (pct >= 91) return { grade: 'A1', color: 'badge-a1' };
  if (pct >= 81) return { grade: 'A2', color: 'badge-a2' };
  if (pct >= 71) return { grade: 'B1', color: 'badge-b1' };
  if (pct >= 61) return { grade: 'B2', color: 'badge-b2' };
  if (pct >= 51) return { grade: 'C1', color: 'badge-c1' };
  if (pct >= 41) return { grade: 'C2', color: 'badge-c2' };
  if (pct >= 33) return { grade: 'D', color: 'badge-d' };
  return { grade: 'E', color: 'badge-e' };
}

async function handleSaveMarks() {
  if (!selectedAssessmentId.value) return;

  // Validate all records before saving
  let hasErrors = false;
  for (const entry of localMarksEntries.value) {
    validateEntry(entry);
    if (entry.isError) hasErrors = true;
  }

  if (hasErrors) {
    showError('Please fix mark boundary errors before saving (marks cannot exceed maximum or be negative)');
    return;
  }

  try {
    const payload = localMarksEntries.value.map((entry) => ({
      enrollmentId: entry.enrollmentId,
      marksObtained: entry.isAbsent ? null : (entry.marksObtained !== null && !isNaN(entry.marksObtained as number) ? Number(entry.marksObtained) : null),
      isAbsent: entry.isAbsent,
      remarks: entry.remarks?.trim() || undefined,
    }));

    await examsStore.saveMarksBatch(selectedAssessmentId.value, payload);
    showSuccess(`Successfully saved marks for ${payload.length} students`);
  } catch (err: any) {
    showError(err.message || 'Failed to save marks');
  }
}

// -------------------------------------------------------------
// Methods: Tab 3 Report Card Actions
// -------------------------------------------------------------
async function loadReportCard() {
  if (!selectedReportEnrollmentId.value) return;
  try {
    await examsStore.fetchReportCard(
      selectedReportEnrollmentId.value,
      selectedReportTermId.value || undefined,
    );
    showSuccess('Report card generated successfully');
  } catch (err: any) {
    showError(err.message || 'Failed to generate report card');
  }
}

function handlePrint() {
  window.print();
}

function viewStudentReportCard(enrollmentId: string) {
  selectedReportEnrollmentId.value = enrollmentId;
  activeTab.value = 'report-card';
  loadReportCard();
}
</script>

<template>
  <div class="exams-container" id="vidya-exams-view">
    <!-- Header -->
    <header class="page-header no-print">
      <div class="header-content">
        <div class="title-meta">
          <span class="badge-milestone">MILESTONE 8 • ACADEMIC SUITE</span>
          <h1 class="page-title">Examinations & CBSE Report Cards</h1>
          <p class="page-subtitle">
            CBSE 9-point grading engine, assessment scheduling, bulk spreadsheet marks recording, and official A4 report cards.
          </p>
        </div>

        <div class="header-actions">
          <button v-if="activeTab === 'terms'" @click="openCreateTerm" class="btn btn-secondary">
            + New Exam Term
          </button>
          <button v-if="activeTab === 'terms'" @click="openCreateExam" class="btn btn-primary">
            + Schedule Exam
          </button>
          <button v-if="activeTab === 'marks'" @click="handleSaveMarks" :disabled="examsStore.saving" class="btn btn-primary">
            <span v-if="examsStore.saving">Saving...</span>
            <span v-else>💾 Save Marks Sheet</span>
          </button>
          <button v-if="activeTab === 'report-card'" @click="handlePrint" class="btn btn-secondary">
            🖨️ Print / PDF
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="nav-tabs" aria-label="Exams Navigation">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'terms' }"
          @click="activeTab = 'terms'"
        >
          <span class="tab-icon">📅</span>
          <span>Exam Terms & Schedules</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'marks' }"
          @click="activeTab = 'marks'"
        >
          <span class="tab-icon">📊</span>
          <span>Marks Entry Spreadsheet</span>
          <span v-if="marksStats.pending > 0" class="tab-badge">{{ marksStats.pending }} pending</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'report-card' }"
          @click="activeTab = 'report-card'"
        >
          <span class="tab-icon">🎓</span>
          <span>CBSE Report Card Generator</span>
        </button>
      </nav>
    </header>

    <!-- Global Alert Banners -->
    <div v-if="successMessage" class="alert alert-success no-print" role="alert">
      <span>{{ successMessage }}</span>
      <button @click="successMessage = null" class="alert-close">×</button>
    </div>
    <div v-if="errorMessage" class="alert alert-danger no-print" role="alert">
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage = null" class="alert-close">×</button>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 1: EXAM TERMS & SCHEDULES -->
    <!-- ========================================================================= -->
    <section v-if="activeTab === 'terms'" class="tab-content no-print" id="tab-terms-content">
      <!-- Academic Year Filter & Term Selector -->
      <div class="filter-card">
        <div class="filter-group">
          <label for="filter-year">Academic Session:</label>
          <select id="filter-year" v-model="selectedAcademicYearId" class="form-select">
            <option v-for="yr in academicsStore.academicYears" :key="yr.id" :value="yr.id">
              {{ yr.name }} {{ yr.isCurrent ? '(Active)' : '' }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label for="filter-term">Selected Exam Term:</label>
          <select id="filter-term" v-model="selectedTermId" class="form-select">
            <option v-for="term in examsStore.terms" :key="term.id" :value="term.id">
              {{ term.name }} ({{ term.type }})
            </option>
          </select>
        </div>
      </div>

      <!-- Terms Overview Cards Grid -->
      <div class="terms-grid">
        <div
          v-for="term in examsStore.terms"
          :key="term.id"
          class="term-card"
          :class="{ selected: term.id === selectedTermId }"
          @click="selectedTermId = term.id"
        >
          <div class="term-card-header">
            <span class="term-type-tag">{{ term.type }}</span>
            <span v-if="term.isCurrent" class="status-pill active">CURRENT</span>
          </div>
          <h3 class="term-name">{{ term.name }}</h3>
          <p class="term-dates">
            📅 {{ new Date(term.startDate).toLocaleDateString() }} — {{ new Date(term.endDate).toLocaleDateString() }}
          </p>
          <div class="term-footer">
            <span class="exam-count">📚 {{ term._count?.exams || 0 }} Scheduled Exams</span>
            <button @click.stop="openCreateExam" class="btn-link">+ Schedule Exam</button>
          </div>
        </div>
      </div>

      <!-- Exams & Assessments Schedule for Selected Term -->
      <div class="section-block">
        <div class="block-header">
          <div>
            <h2 class="block-title">Class Exams & Subject Assessments</h2>
            <p class="block-subtitle">Configure theory, practical, and internal assessment maximum marks</p>
          </div>
          <button @click="openCreateExam" class="btn btn-sm btn-primary">+ Schedule Exam</button>
        </div>

        <div v-if="examsStore.exams.length === 0" class="empty-state">
          <p>No exams scheduled under this term yet.</p>
          <button @click="openCreateExam" class="btn btn-secondary mt-2">Schedule First Exam</button>
        </div>

        <div v-else class="exams-accordion">
          <div v-for="exam in examsStore.exams" :key="exam.id" class="exam-panel">
            <div class="exam-panel-header">
              <div class="exam-title-group">
                <span class="class-pill">{{ exam.class?.name || 'Class' }}</span>
                <span class="exam-name">{{ exam.name }}</span>
                <span class="exam-period">
                  {{ new Date(exam.startDate).toLocaleDateString() }} to {{ new Date(exam.endDate).toLocaleDateString() }}
                </span>
              </div>
              <div class="exam-actions">
                <button @click="openCreateAssessment(exam.id)" class="btn btn-sm btn-secondary">
                  + Add Subject Component
                </button>
              </div>
            </div>

            <!-- Assessments Table -->
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Assessment Type</th>
                    <th>Max Marks</th>
                    <th>Passing Marks</th>
                    <th>Exam Date</th>
                    <th>Records Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ass in exam.assessments" :key="ass.id">
                    <td>
                      <div class="subject-cell">
                        <strong>{{ ass.subject?.name }}</strong>
                        <span class="subject-code">{{ ass.subject?.code }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="component-pill" :class="ass.type.toLowerCase()">
                        {{ ass.type.replace('_', ' ') }}
                      </span>
                    </td>
                    <td><strong class="font-mono">{{ ass.maxMarks }}</strong></td>
                    <td><span class="font-mono text-muted">{{ ass.passingMarks ?? '—' }}</span></td>
                    <td>{{ new Date(ass.date).toLocaleDateString() }}</td>
                    <td>
                      <span class="status-badge" :class="ass._count?.marksRecords ? 'badge-completed' : 'badge-pending'">
                        {{ ass._count?.marksRecords ? `${ass._count.marksRecords} marks recorded` : 'Pending entry' }}
                      </span>
                    </td>
                    <td class="text-right">
                      <button @click="jumpToMarksEntry(exam.id, ass.id)" class="btn btn-sm btn-primary">
                        Enter Marks →
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!exam.assessments || exam.assessments.length === 0">
                    <td colspan="7" class="text-center text-muted py-3">
                      No assessment components added yet. Click "+ Add Subject Component".
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- TAB 2: MARKS ENTRY SPREADSHEET GRID -->
    <!-- ========================================================================= -->
    <section v-if="activeTab === 'marks'" class="tab-content no-print" id="tab-marks-content">
      <!-- Selectors Bar -->
      <div class="marks-toolbar">
        <div class="toolbar-selectors">
          <div class="filter-group">
            <label>Select Exam:</label>
            <select v-model="selectedMarksExamId" class="form-select">
              <option v-for="e in examsStore.exams" :key="e.id" :value="e.id">
                {{ e.class?.name }} — {{ e.name }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>Subject Assessment Component:</label>
            <select v-model="selectedAssessmentId" class="form-select">
              <option v-for="ass in examsStore.assessments" :key="ass.id" :value="ass.id">
                {{ ass.subject?.name }} ({{ ass.type }}) — Max: {{ ass.maxMarks }}
              </option>
            </select>
          </div>
        </div>

        <!-- Live Statistics Chips -->
        <div class="marks-stat-bar">
          <div class="stat-chip">
            <span class="stat-label">Total Roster</span>
            <span class="stat-val">{{ marksStats.total }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Entered</span>
            <span class="stat-val text-success">{{ marksStats.entered }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Pending</span>
            <span class="stat-val text-warning">{{ marksStats.pending }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Absent</span>
            <span class="stat-val text-danger">{{ marksStats.absent }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">Class Avg</span>
            <span class="stat-val">{{ marksStats.avgPercentage }}%</span>
          </div>
        </div>
      </div>

      <!-- Marks Spreadsheet Table -->
      <div class="spreadsheet-container">
        <table class="spreadsheet-table">
          <thead>
            <tr>
              <th style="width: 70px;">Roll No</th>
              <th style="width: 120px;">Adm No</th>
              <th>Student Name</th>
              <th style="width: 80px;">Section</th>
              <th style="width: 160px;">Marks (Max: {{ marksSelectedAssessment?.maxMarks || 100 }})</th>
              <th style="width: 110px;">Absent?</th>
              <th style="width: 90px;">Grade</th>
              <th>Teacher Remarks</th>
              <th style="width: 120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, idx) in localMarksEntries"
              :key="entry.enrollmentId"
              :class="{ 'row-absent': entry.isAbsent, 'row-error': entry.isError }"
            >
              <td class="font-mono">{{ entry.rollNumber ?? idx + 1 }}</td>
              <td class="font-mono text-muted">{{ entry.admissionNumber }}</td>
              <td>
                <div class="student-name-cell">
                  <strong>{{ entry.fullName }}</strong>
                </div>
              </td>
              <td><span class="section-tag">{{ entry.sectionName }}</span></td>
              <td>
                <div class="input-wrapper">
                  <input
                    type="number"
                    v-model.number="entry.marksObtained"
                    :disabled="entry.isAbsent"
                    :max="marksSelectedAssessment?.maxMarks || 100"
                    min="0"
                    step="0.5"
                    class="marks-input"
                    :class="{ 'input-error': entry.isError }"
                    @input="validateEntry(entry)"
                    placeholder="0.0"
                  />
                  <span v-if="entry.isError" class="input-error-msg">{{ entry.errorMessage }}</span>
                </div>
              </td>
              <td class="text-center">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="entry.isAbsent"
                    @change="validateEntry(entry)"
                  />
                  <span class="checkbox-text">ABS</span>
                </label>
              </td>
              <td>
                <span
                  class="grade-badge"
                  :class="getGradePreview(entry.marksObtained, entry.isAbsent).color"
                >
                  {{ getGradePreview(entry.marksObtained, entry.isAbsent).grade }}
                </span>
              </td>
              <td>
                <input
                  type="text"
                  v-model="entry.remarks"
                  placeholder="Optional remarks"
                  class="remarks-input"
                />
              </td>
              <td>
                <button
                  @click="viewStudentReportCard(entry.enrollmentId)"
                  class="btn-link text-xs"
                >
                  View Report Card
                </button>
              </td>
            </tr>
            <tr v-if="localMarksEntries.length === 0">
              <td colspan="9" class="text-center py-4 text-muted">
                No students found for this assessment. Select an active exam and subject above.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Sticky Save Bar -->
      <div class="sticky-save-bar">
        <div class="save-status">
          <span v-if="marksStats.pending > 0" class="text-warning">
            ⚠️ {{ marksStats.pending }} students pending marks entry.
          </span>
          <span v-else class="text-success">
            ✅ All student marks entered and verified against CBSE boundaries.
          </span>
        </div>
        <button
          @click="handleSaveMarks"
          :disabled="examsStore.saving"
          class="btn btn-primary"
        >
          <span v-if="examsStore.saving">Saving to Database...</span>
          <span v-else>💾 Submit & Save Marks Sheet</span>
        </button>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- TAB 3: CBSE PRINTABLE REPORT CARD -->
    <!-- ========================================================================= -->
    <section v-if="activeTab === 'report-card'" class="tab-content" id="tab-report-card-content">
      <!-- Selector bar (Hidden during Print) -->
      <div class="report-card-selector no-print">
        <div class="selector-row">
          <div class="filter-group">
            <label>Filter by Class:</label>
            <select v-model="selectedReportClassId" class="form-select">
              <option value="">All Classes</option>
              <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>Section:</label>
            <select v-model="selectedReportSectionId" class="form-select">
              <option value="">All Sections</option>
              <option v-for="s in availableReportSections" :key="s.id" :value="s.id">
                Section {{ s.name }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>Student Roster:</label>
            <select v-model="selectedReportEnrollmentId" @change="loadReportCard" class="form-select">
              <option value="">-- Choose Student --</option>
              <option
                v-for="enr in reportStudentsList"
                :key="enr.id"
                :value="enr.id"
              >
                {{ enr.fullName }} (Roll: {{ enr.rollNumber || 'N/A' }} | {{ enr.className }}-{{ enr.sectionName }})
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>Filter Term:</label>
            <select v-model="selectedReportTermId" @change="loadReportCard" class="form-select">
              <option value="">All Terms (Cumulative Year)</option>
              <option v-for="t in examsStore.terms" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>

          <div class="btn-group-align">
            <button @click="loadReportCard" :disabled="!selectedReportEnrollmentId" class="btn btn-primary">
              Generate
            </button>
            <button @click="handlePrint" :disabled="!examsStore.reportCard" class="btn btn-secondary">
              🖨️ Print Report Card
            </button>
          </div>
        </div>
      </div>

      <!-- Report Card Canvas / Printable A4 Document -->
      <div v-if="examsStore.reportCard" class="report-card-sheet" id="printable-report-card">
        <!-- Official Border Header -->
        <div class="cbse-header">
          <div class="board-emblem">
            <div class="emblem-circle">
              <span class="emblem-text">VIDYA</span>
            </div>
          </div>
          <div class="school-affiliation-meta">
            <h1 class="school-name">{{ examsStore.reportCard.school.name.toUpperCase() }}</h1>
            <p class="affiliation-text">
              AFFILIATED TO CENTRAL BOARD OF SECONDARY EDUCATION (CBSE), NEW DELHI
            </p>
            <p class="school-credentials">
              AFFILIATION NO: <strong>{{ examsStore.reportCard.school.affiliationNumber }}</strong> |
              SCHOOL CODE: <strong>{{ examsStore.reportCard.school.code }}</strong> |
              BOARD: <strong>{{ examsStore.reportCard.school.board }}</strong>
            </p>
            <p v-if="examsStore.reportCard.school.address" class="school-address">
              {{ examsStore.reportCard.school.address }}
            </p>
            <div class="report-badge-title">
              ACADEMIC PERFORMANCE REPORT (PROGRESS CARD)
            </div>
            <div class="session-year">
              ACADEMIC SESSION: {{ examsStore.reportCard.academic.academicYear }}
            </div>
          </div>
        </div>

        <!-- Student Demographics 360 -->
        <div class="student-profile-strip">
          <div class="demo-grid">
            <div class="demo-item">
              <span class="label">STUDENT NAME:</span>
              <span class="val highlight">{{ examsStore.reportCard.student.fullName }}</span>
            </div>
            <div class="demo-item">
              <span class="label">ADMISSION NO:</span>
              <span class="val font-mono">{{ examsStore.reportCard.student.admissionNumber }}</span>
            </div>
            <div class="demo-item">
              <span class="label">ROLL NO:</span>
              <span class="val font-mono">{{ examsStore.reportCard.student.rollNumber || '01' }}</span>
            </div>
            <div class="demo-item">
              <span class="label">CLASS & SEC:</span>
              <span class="val">{{ examsStore.reportCard.academic.className }} - {{ examsStore.reportCard.academic.sectionName }}</span>
            </div>
            <div class="demo-item">
              <span class="label">APAAR / PEN ID:</span>
              <span class="val font-mono font-bold">{{ examsStore.reportCard.student.apaarId }}</span>
            </div>
            <div class="demo-item">
              <span class="label">DATE OF BIRTH:</span>
              <span class="val">{{ new Date(examsStore.reportCard.student.dateOfBirth).toLocaleDateString() }}</span>
            </div>
            <div class="demo-item">
              <span class="label">MOTHER'S NAME:</span>
              <span class="val">{{ examsStore.reportCard.student.motherName }}</span>
            </div>
            <div class="demo-item">
              <span class="label">FATHER'S NAME:</span>
              <span class="val">{{ examsStore.reportCard.student.fatherName }}</span>
            </div>
            <div class="demo-item full-width">
              <span class="label">ANNUAL ATTENDANCE:</span>
              <span class="val">
                <strong>{{ examsStore.reportCard.academic.attendance.attendedDays }}</strong> /
                {{ examsStore.reportCard.academic.attendance.workingDays }} Working Days
                (<strong>{{ examsStore.reportCard.academic.attendance.percentage }}%</strong>)
              </span>
            </div>
          </div>
        </div>

        <!-- Scholastic Performance Table Per Term -->
        <div v-for="termRes in examsStore.reportCard.termResults" :key="termRes.termId" class="term-eval-block">
          <div class="term-title-banner">
            PART 1: SCHOLASTIC AREAS — {{ termRes.termName.toUpperCase() }} ({{ termRes.examName }})
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 100px;">SUBJECT CODE</th>
                <th rowspan="2">SUBJECT NAME</th>
                <th colspan="3" class="text-center">MARKS BREAKDOWN</th>
                <th rowspan="2" style="width: 80px;" class="text-center">TOTAL (100)</th>
                <th rowspan="2" style="width: 70px;" class="text-center">GRADE</th>
                <th rowspan="2" style="width: 70px;" class="text-center">GRADE POINT</th>
              </tr>
              <tr>
                <th style="width: 90px;" class="text-center">Theory (80)</th>
                <th style="width: 90px;" class="text-center">Internal (20)</th>
                <th style="width: 90px;" class="text-center">Practical</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in termRes.subjects" :key="sub.subjectId">
                <td class="font-mono font-bold">{{ sub.subjectCode }}</td>
                <td>
                  <strong>{{ sub.subjectName }}</strong>
                </td>
                <td class="text-center font-mono">
                  {{ sub.components.find(c => c.type === 'THEORY')?.obtained ?? '—' }}
                </td>
                <td class="text-center font-mono">
                  {{ sub.components.find(c => c.type === 'INTERNAL_ASSESSMENT')?.obtained ?? '—' }}
                </td>
                <td class="text-center font-mono">
                  {{ sub.components.find(c => c.type === 'PRACTICAL')?.obtained ?? '—' }}
                </td>
                <td class="text-center font-mono font-bold">
                  {{ sub.totalMarksObtained }}
                </td>
                <td class="text-center font-bold" :class="sub.grade === 'E' ? 'text-danger' : 'text-primary'">
                  {{ sub.grade }}
                </td>
                <td class="text-center font-mono font-bold">
                  {{ sub.gradePoint.toFixed(1) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="summary-footer-row">
                <td colspan="5" class="text-right font-bold">TERM AGGREGATE TOTAL:</td>
                <td class="text-center font-mono font-bold">
                  {{ termRes.summary.totalMarksObtained }} / {{ termRes.summary.totalMaxMarks }}
                </td>
                <td class="text-center font-bold">{{ termRes.summary.overallGrade }}</td>
                <td class="text-center font-mono font-bold">{{ termRes.summary.cgpa.toFixed(2) }}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Term Performance Summary Badges -->
          <div class="term-stats-footer">
            <div class="stat-box">
              <span class="title">PERCENTAGE:</span>
              <span class="metric font-bold">{{ termRes.summary.aggregatePercentage.toFixed(1) }}%</span>
            </div>
            <div class="stat-box">
              <span class="title">CGPA (OUT OF 10):</span>
              <span class="metric font-bold">{{ termRes.summary.cgpa.toFixed(2) }}</span>
            </div>
            <div class="stat-box">
              <span class="title">OVERALL GRADE:</span>
              <span class="metric font-bold">{{ termRes.summary.overallGrade }}</span>
            </div>
            <div class="stat-box">
              <span class="title">RESULT STATUS:</span>
              <span
                class="metric font-bold"
                :class="termRes.summary.resultStatus === 'PASS' ? 'text-success' : 'text-danger'"
              >
                {{ termRes.summary.resultStatus }}
              </span>
            </div>
          </div>
        </div>

        <!-- CBSE 9-Point Grading Scale Reference Block -->
        <div class="grading-scale-block">
          <div class="grading-title">CBSE 9-POINT GRADING SCALE KEY</div>
          <div class="scale-chips-row">
            <div class="scale-chip"><span>A1</span>: 91-100% (10.0 GP)</div>
            <div class="scale-chip"><span>A2</span>: 81-90% (9.0 GP)</div>
            <div class="scale-chip"><span>B1</span>: 71-80% (8.0 GP)</div>
            <div class="scale-chip"><span>B2</span>: 61-70% (7.0 GP)</div>
            <div class="scale-chip"><span>C1</span>: 51-60% (6.0 GP)</div>
            <div class="scale-chip"><span>C2</span>: 41-50% (5.0 GP)</div>
            <div class="scale-chip"><span>D</span>: 33-40% (4.0 GP)</div>
            <div class="scale-chip error"><span>E</span>: &lt; 33% (Essential Repeat)</div>
          </div>
        </div>

        <!-- Official Signatures -->
        <div class="signatures-block">
          <div class="sig-column">
            <div class="sig-line"></div>
            <div class="sig-title">Class Teacher Signature</div>
          </div>
          <div class="sig-column text-center">
            <div class="seal-placeholder">
              <span>SCHOOL OFFICIAL SEAL</span>
            </div>
            <div class="sig-date">Date: {{ new Date(examsStore.reportCard.generatedAt).toLocaleDateString() }}</div>
          </div>
          <div class="sig-column text-right">
            <div class="sig-line"></div>
            <div class="sig-title">Principal / Examination Head</div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>Please select a student above and click "Generate" to preview and print the official CBSE Report Card.</p>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- MODALS -->
    <!-- ========================================================================= -->

    <!-- Create Term Modal -->
    <div v-if="showCreateTermModal" class="modal-backdrop" @click.self="showCreateTermModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">Create Exam Term</h3>
          <button @click="showCreateTermModal = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Term Name *</label>
            <input
              type="text"
              v-model="newTermForm.name"
              placeholder="e.g. Mid-Term Examination 2025"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Term Type</label>
            <select v-model="newTermForm.type" class="form-select">
              <option value="TERM_1">Term 1 (Mid-Term)</option>
              <option value="TERM_2">Term 2 (Final / Annual)</option>
              <option value="UNIT_TEST_1">Unit Test 1</option>
              <option value="UNIT_TEST_2">Unit Test 2</option>
              <option value="PRE_BOARD">Pre-Board Examination</option>
              <option value="ANNUAL">Annual Board</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group col">
              <label>Start Date</label>
              <input type="date" v-model="newTermForm.startDate" class="form-input" />
            </div>
            <div class="form-group col">
              <label>End Date</label>
              <input type="date" v-model="newTermForm.endDate" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="newTermForm.isCurrent" />
              <span>Mark as Current Active Exam Term</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showCreateTermModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="handleCreateTerm" class="btn btn-primary" :disabled="examsStore.saving">
            {{ examsStore.saving ? 'Creating...' : 'Create Term' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Exam Modal -->
    <div v-if="showCreateExamModal" class="modal-backdrop" @click.self="showCreateExamModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">Schedule Exam for Class</h3>
          <button @click="showCreateExamModal = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Target Class *</label>
            <select v-model="newExamForm.classId" class="form-select">
              <option v-for="c in academicsStore.classes" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.code }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Exam Name *</label>
            <input
              type="text"
              v-model="newExamForm.name"
              placeholder="e.g. Class 10 Mid-Term Examination"
              class="form-input"
            />
          </div>
          <div class="form-row">
            <div class="form-group col">
              <label>Start Date</label>
              <input type="date" v-model="newExamForm.startDate" class="form-input" />
            </div>
            <div class="form-group col">
              <label>End Date</label>
              <input type="date" v-model="newExamForm.endDate" class="form-input" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showCreateExamModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="handleCreateExam" class="btn btn-primary" :disabled="examsStore.saving">
            {{ examsStore.saving ? 'Scheduling...' : 'Schedule Exam' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Assessment Modal -->
    <div v-if="showCreateAssessmentModal" class="modal-backdrop" @click.self="showCreateAssessmentModal = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">Add Subject Assessment Component</h3>
          <button @click="showCreateAssessmentModal = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Subject *</label>
            <select v-model="newAssessmentForm.subjectId" class="form-select">
              <option v-for="s in academicsStore.subjects" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.code }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Assessment Type *</label>
            <select v-model="newAssessmentForm.type" class="form-select">
              <option value="THEORY">Theory (Written)</option>
              <option value="INTERNAL_ASSESSMENT">Internal Assessment</option>
              <option value="PRACTICAL">Practical / Lab</option>
              <option value="PROJECT">Project Work</option>
              <option value="ORAL">Oral / Viva</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group col">
              <label>Max Marks *</label>
              <input type="number" v-model.number="newAssessmentForm.maxMarks" min="1" max="100" class="form-input" />
            </div>
            <div class="form-group col">
              <label>Passing Marks</label>
              <input type="number" v-model.number="newAssessmentForm.passingMarks" min="0" max="100" class="form-input" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group col">
              <label>Weightage (%)</label>
              <input type="number" v-model.number="newAssessmentForm.weightage" min="1" max="100" class="form-input" />
            </div>
            <div class="form-group col">
              <label>Exam Date</label>
              <input type="date" v-model="newAssessmentForm.date" class="form-input" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showCreateAssessmentModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="handleCreateAssessment" class="btn btn-primary" :disabled="examsStore.saving">
            {{ examsStore.saving ? 'Saving...' : 'Add Component' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exams-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--text-primary);
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--color-card-border);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.badge-milestone {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  background: rgba(14, 165, 233, 0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  display: inline-block;
  margin-bottom: 0.35rem;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0;
}

.page-subtitle {
  color: var(--text-muted);
  font-size: 0.88rem;
  margin-top: 0.25rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.nav-tabs {
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid var(--color-card-border);
  padding-top: 1rem;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.15rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: var(--color-hover);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--color-primary);
  color: #ffffff;
}

.tab-badge {
  background: #f59e0b;
  color: #ffffff;
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
}

/* Alerts */
.alert {
  padding: 0.85rem 1.25rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.alert-success {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.alert-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.alert-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
}

/* Filters */
.filter-card, .marks-toolbar {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.filter-group label {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-muted);
}

.form-select, .form-input {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  color: var(--text-primary);
  padding: 0.5rem 0.85rem;
  border-radius: 6px;
  font-size: 0.88rem;
}

/* Terms Grid */
.terms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.term-card {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: 10px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.term-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary);
}

.term-card.selected {
  border: 2px solid var(--color-primary);
  background: rgba(14, 165, 233, 0.04);
}

.term-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.term-type-tag {
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--color-canvas);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.status-pill.active {
  font-size: 0.7rem;
  background: #10b981;
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-weight: 700;
}

.term-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.term-dates {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

.term-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--color-card-border);
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.82rem;
}

/* Section Blocks */
.section-block {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.block-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.block-subtitle {
  font-size: 0.84rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

/* Exam Panel */
.exam-panel {
  border: 1px solid var(--color-card-border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.exam-panel-header {
  background: var(--color-canvas);
  padding: 0.85rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-card-border);
}

.exam-title-group {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.class-pill {
  background: var(--color-primary);
  color: white;
  font-weight: 700;
  font-size: 0.76rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.exam-name {
  font-weight: 700;
  font-size: 0.96rem;
}

.exam-period {
  font-size: 0.82rem;
  color: var(--text-muted);
}

/* Data Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.data-table th, .data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-card-border);
}

.data-table th {
  text-align: left;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--color-surface);
}

.component-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.component-pill.theory {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.component-pill.internal_assessment {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.component-pill.practical {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

/* Marks Spreadsheet */
.marks-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.toolbar-selectors {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.marks-stat-bar {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.stat-chip {
  background: var(--color-canvas);
  border: 1px solid var(--color-card-border);
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.68rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.stat-val {
  font-weight: 800;
  font-size: 0.95rem;
}

.spreadsheet-container {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  overflow-x: auto;
}

.spreadsheet-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.spreadsheet-table th, .spreadsheet-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--color-card-border);
  vertical-align: middle;
}

.spreadsheet-table th {
  background: var(--color-canvas);
  font-weight: 700;
  color: var(--text-muted);
  text-align: left;
}

.marks-input {
  width: 100px;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--color-card-border);
  background: var(--color-canvas);
  color: var(--text-primary);
  font-family: monospace;
  font-weight: 700;
  font-size: 0.95rem;
}

.marks-input.input-error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.input-error-msg {
  display: block;
  font-size: 0.72rem;
  color: #ef4444;
  margin-top: 0.2rem;
}

.remarks-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--color-card-border);
  background: var(--color-canvas);
  color: var(--text-primary);
  font-size: 0.82rem;
}

.grade-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

.badge-a1 { background: #10b981; color: white; }
.badge-a2 { background: #34d399; color: black; }
.badge-b1 { background: #3b82f6; color: white; }
.badge-b2 { background: #60a5fa; color: black; }
.badge-c1 { background: #f59e0b; color: white; }
.badge-c2 { background: #fbbf24; color: black; }
.badge-d  { background: #f97316; color: white; }
.badge-e  { background: #ef4444; color: white; }
.badge-absent { background: #6b7280; color: white; }
.badge-pending { background: #9ca3af; color: white; }

.sticky-save-bar {
  position: sticky;
  bottom: 1rem;
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: 10px;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

/* ========================================================================= */
/* CBSE REPORT CARD PRINTABLE SHEET */
/* ========================================================================= */
.report-card-selector {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.selector-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.btn-group-align {
  display: flex;
  gap: 0.5rem;
}

.report-card-sheet {
  background: #ffffff;
  color: #111827;
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 3rem;
  border: 3px double #1f2937;
  box-shadow: 0 15px 35px rgba(0,0,0,0.15);
  font-family: 'Times New Roman', Times, serif, system-ui;
  line-height: 1.4;
}

.cbse-header {
  text-align: center;
  border-bottom: 2px solid #1f2937;
  padding-bottom: 1.2rem;
  margin-bottom: 1.2rem;
}

.emblem-circle {
  width: 60px;
  height: 60px;
  border: 2px solid #1f2937;
  border-radius: 50%;
  margin: 0 auto 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  letter-spacing: 0.1em;
  font-size: 0.9rem;
}

.school-name {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  margin: 0;
  color: #111827;
}

.affiliation-text {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0.2rem 0;
  letter-spacing: 0.02em;
}

.school-credentials {
  font-size: 0.82rem;
  margin: 0.2rem 0;
}

.report-badge-title {
  display: inline-block;
  background: #1f2937;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.95rem;
  padding: 0.25rem 1.2rem;
  border-radius: 4px;
  margin-top: 0.5rem;
  letter-spacing: 0.08em;
}

.session-year {
  font-size: 0.88rem;
  font-weight: 700;
  margin-top: 0.3rem;
}

.student-profile-strip {
  border: 1px solid #1f2937;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem 1.5rem;
  font-size: 0.88rem;
}

.demo-item {
  display: flex;
  gap: 0.4rem;
}

.demo-item .label {
  font-weight: 700;
  width: 140px;
  color: #374151;
}

.demo-item.full-width {
  grid-column: span 2;
  border-top: 1px dashed #d1d5db;
  padding-top: 0.35rem;
  margin-top: 0.2rem;
}

.term-title-banner {
  background: #f3f4f6;
  border: 1px solid #1f2937;
  border-bottom: none;
  font-weight: 800;
  font-size: 0.88rem;
  padding: 0.4rem 0.75rem;
  letter-spacing: 0.04em;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  margin-bottom: 0.5rem;
}

.report-table th, .report-table td {
  border: 1px solid #1f2937;
  padding: 0.4rem 0.6rem;
}

.report-table th {
  background: #f9fafb;
  font-weight: 800;
}

.summary-footer-row {
  background: #f3f4f6;
  font-weight: 800;
}

.term-stats-footer {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid #1f2937;
  margin-bottom: 1.5rem;
}

.stat-box {
  padding: 0.5rem 0.75rem;
  border-right: 1px solid #1f2937;
  display: flex;
  flex-direction: column;
}

.stat-box:last-child {
  border-right: none;
}

.stat-box .title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #4b5563;
}

.stat-box .metric {
  font-size: 1.05rem;
}

.grading-scale-block {
  border: 1px solid #9ca3af;
  padding: 0.5rem 0.75rem;
  margin-bottom: 2rem;
  font-size: 0.78rem;
}

.grading-title {
  font-weight: 800;
  margin-bottom: 0.35rem;
}

.scale-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.scale-chip span {
  font-weight: 800;
}

.signatures-block {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 3.5rem;
  padding-top: 1rem;
}

.sig-column {
  width: 200px;
}

.sig-line {
  border-bottom: 1px solid #1f2937;
  height: 1px;
  margin-bottom: 0.4rem;
}

.sig-title {
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
}

.seal-placeholder {
  width: 100px;
  height: 50px;
  border: 1px dashed #9ca3af;
  margin: 0 auto 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: #6b7280;
  font-weight: 700;
}

.sig-date {
  font-size: 0.76rem;
  color: #4b5563;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  width: 90%;
  max-width: 520px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.modal-header {
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-card-border);
}

.modal-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.modal-body {
  padding: 1.5rem;
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
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-muted);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .col {
  flex: 1;
}

.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--color-card-border);
}

/* Base Buttons */
.btn {
  padding: 0.55rem 1.15rem;
  border-radius: 6px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-secondary {
  background: var(--color-canvas);
  color: var(--text-primary);
  border: 1px solid var(--color-card-border);
}

.btn-secondary:hover {
  background: var(--color-hover);
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 600;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
}

.font-mono { font-family: monospace; }
.font-bold { font-weight: 700; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-success { color: #10b981; }
.text-warning { color: #f59e0b; }
.text-danger { color: #ef4444; }

/* ========================================================================= */
/* PRINT MEDIA RULES */
/* ========================================================================= */
@media print {
  .no-print,
  #app-sidebar,
  #vidya-top-nav,
  .top-nav,
  .header-actions {
    display: none !important;
  }

  body, html, #vidya-root-app, .main-content, .exams-container {
    background: #ffffff !important;
    color: #000000 !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .report-card-sheet {
    box-shadow: none !important;
    border: 2px solid #000000 !important;
    padding: 1.5cm !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    page-break-after: always;
  }
}
</style>
