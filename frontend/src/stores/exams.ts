import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth.js';

export type ExamTermType = 'TERM_1' | 'TERM_2' | 'UNIT_TEST_1' | 'UNIT_TEST_2' | 'PRE_BOARD' | 'ANNUAL';
export type AssessmentType = 'THEORY' | 'PRACTICAL' | 'INTERNAL_ASSESSMENT' | 'PROJECT' | 'ORAL';

export interface ExamTerm {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  type: ExamTermType;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  academicYear?: {
    id: string;
    name: string;
  };
  _count?: {
    exams: number;
  };
}

export interface Exam {
  id: string;
  schoolId: string;
  termId: string;
  classId: string;
  name: string;
  startDate: string;
  endDate: string;
  term?: ExamTerm;
  class?: {
    id: string;
    name: string;
    code: string;
  };
  assessments?: Assessment[];
}

export interface Assessment {
  id: string;
  examId: string;
  subjectId: string;
  type: AssessmentType;
  maxMarks: number;
  passingMarks?: number;
  weightage?: number;
  date: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  exam?: {
    id: string;
    name: string;
  };
  _count?: {
    marksRecords: number;
  };
}

export interface MarksSheetStudent {
  enrollmentId: string;
  studentId: string;
  admissionNumber: string;
  rollNumber: number | null;
  firstName: string;
  lastName: string;
  fullName: string;
  sectionName: string;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks: string;
  isEntered: boolean;
}

export interface MarksSheet {
  assessment: Assessment;
  totalStudents: number;
  enteredStudents: number;
  students: MarksSheetStudent[];
}

export interface SubjectComponentEval {
  type: string;
  maxMarks: number;
  obtained: number | null;
  passingMarks: number;
  isAbsent: boolean;
}

export interface SubjectEvaluation {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  description: string;
  resultStatus: 'PASS' | 'FAIL' | 'COMPARTMENT';
  components: SubjectComponentEval[];
}

export interface CumulativeEvaluation {
  totalMaxMarks: number;
  totalMarksObtained: number;
  aggregatePercentage: number;
  cgpa: number;
  overallGrade: string;
  resultStatus: 'PASS' | 'COMPARTMENT' | 'ESSENTIAL_REPEAT';
  failedSubjectsCount: number;
}

export interface TermResult {
  termId: string;
  termName: string;
  termType: string;
  examName: string;
  subjects: SubjectEvaluation[];
  summary: CumulativeEvaluation;
}

export interface ReportCardData {
  school: {
    name: string;
    code: string;
    affiliationNumber: string;
    board: string;
    address: string | null;
    email: string | null;
    phone: string | null;
  };
  student: {
    id: string;
    admissionNumber: string;
    rollNumber: number | null;
    fullName: string;
    gender: string;
    dateOfBirth: string;
    apaarId: string;
    motherName: string;
    fatherName: string;
    photoUrl: string | null;
  };
  academic: {
    academicYear: string;
    className: string;
    classCode: string;
    sectionName: string;
    attendance: {
      workingDays: number;
      attendedDays: number;
      percentage: number;
    };
  };
  gradingScale: Array<{
    grade: string;
    minPercentage?: number;
    maxPercentage?: number;
    min?: number;
    max?: number;
    gradePoint?: number;
    gp?: number;
    description?: string;
    desc?: string;
  }>;
  termResults: TermResult[];
  overallSummary: CumulativeEvaluation;
  generatedAt: string;
}

export interface GradingScaleItem {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
  description: string | null;
}

export const useExamsStore = defineStore('exams', () => {
  const terms = ref<ExamTerm[]>([]);
  const exams = ref<Exam[]>([]);
  const currentExam = ref<Exam | null>(null);
  const assessments = ref<Assessment[]>([]);
  const marksSheet = ref<MarksSheet | null>(null);
  const reportCard = ref<ReportCardData | null>(null);
  const gradingScales = ref<GradingScaleItem[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  function getAuthHeaders(): HeadersInit {
    const authStore = useAuthStore();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authStore.accessToken}`,
    };
  }

  async function fetchTerms(academicYearId?: string) {
    loading.value = true;
    error.value = null;
    try {
      const q = academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : '';
      const res = await fetch(`/api/v1/exams/terms${q}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch exam terms');
      terms.value = json.terms || [];
      return terms.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createTerm(payload: {
    academicYearId: string;
    name: string;
    type?: ExamTermType;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/exams/terms', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create exam term');
      await fetchTerms(payload.academicYearId);
      return json;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function fetchExams(params?: { termId?: string; classId?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const sp = new URLSearchParams();
      if (params?.termId) sp.append('termId', params.termId);
      if (params?.classId) sp.append('classId', params.classId);
      const q = sp.toString() ? `?${sp.toString()}` : '';
      const res = await fetch(`/api/v1/exams${q}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch exams');
      exams.value = json.exams || [];
      return exams.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createExam(payload: {
    termId: string;
    classId: string;
    name: string;
    startDate: string;
    endDate: string;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/exams', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create exam');
      await fetchExams({ termId: payload.termId });
      return json;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function fetchAssessments(examId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/exams/${encodeURIComponent(examId)}/assessments`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch assessments');
      assessments.value = json.assessments || [];
      return assessments.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createAssessment(payload: {
    examId: string;
    subjectId: string;
    type?: AssessmentType;
    maxMarks: number;
    passingMarks?: number;
    weightage?: number;
    date: string;
  }) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/exams/${encodeURIComponent(payload.examId)}/assessments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create assessment');
      await fetchAssessments(payload.examId);
      return json;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function fetchMarksSheet(assessmentId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/exams/assessments/${encodeURIComponent(assessmentId)}/marks-sheet`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch marks sheet');
      marksSheet.value = json;
      return json;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveMarksBatch(
    assessmentId: string,
    records: Array<{
      enrollmentId: string;
      marksObtained?: number | null;
      isAbsent?: boolean;
      remarks?: string;
    }>,
  ) {
    saving.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/exams/assessments/${encodeURIComponent(assessmentId)}/marks/batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ records }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to record marks');
      // Refresh marks sheet
      await fetchMarksSheet(assessmentId);
      return json;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function fetchReportCard(enrollmentId: string, termId?: string) {
    loading.value = true;
    error.value = null;
    try {
      const q = termId ? `?termId=${encodeURIComponent(termId)}` : '';
      const res = await fetch(`/api/v1/exams/report-card/${encodeURIComponent(enrollmentId)}${q}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to generate report card');
      reportCard.value = json;
      return json;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchGradingScales() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/exams/grading-scales', {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch grading scales');
      gradingScales.value = json.scales || [];
      return gradingScales.value;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    terms,
    exams,
    currentExam,
    assessments,
    marksSheet,
    reportCard,
    gradingScales,
    loading,
    saving,
    error,
    fetchTerms,
    createTerm,
    fetchExams,
    createExam,
    fetchAssessments,
    createAssessment,
    fetchMarksSheet,
    saveMarksBatch,
    fetchReportCard,
    fetchGradingScales,
  };
});
