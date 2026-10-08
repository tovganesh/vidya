import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useExamsStore } from '../src/stores/exams.js';

describe('Frontend ExamsStore (Milestone 8: Examinations & CBSE Report Cards)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with empty exams state and not loading', () => {
    const store = useExamsStore();
    expect(store.terms).toEqual([]);
    expect(store.exams).toEqual([]);
    expect(store.assessments).toEqual([]);
    expect(store.marksSheet).toBeNull();
    expect(store.reportCard).toBeNull();
    expect(store.gradingScales).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.saving).toBe(false);
  });

  it('fetches exam terms and populates state', async () => {
    const mockTerms = [
      {
        id: 'term-1',
        schoolId: 'sch-1',
        academicYearId: 'ay-1',
        name: 'Term 1 Examination',
        type: 'TERM_1',
        startDate: '2026-09-15',
        endDate: '2026-09-30',
        isCurrent: true,
        _count: { exams: 1 },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ terms: mockTerms }),
    });

    const store = useExamsStore();
    const data = await store.fetchTerms('ay-1');

    expect(data.length).toBe(1);
    expect(store.terms).toEqual(mockTerms);
    expect(store.terms[0]?.name).toBe('Term 1 Examination');
  });

  it('creates an exam term and reloads terms', async () => {
    const createdTerm = {
      id: 'term-new',
      name: 'Pre-Board Examination',
      type: 'PRE_BOARD',
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createdTerm,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ terms: [createdTerm] }),
      });

    const store = useExamsStore();
    const res = await store.createTerm({
      academicYearId: 'ay-1',
      name: 'Pre-Board Examination',
      type: 'PRE_BOARD',
      startDate: '2027-01-10',
      endDate: '2027-01-25',
    });

    expect(res.id).toBe('term-new');
    expect(store.terms.length).toBe(1);
  });

  it('fetches exams by term', async () => {
    const mockExams = [
      {
        id: 'exam-1',
        termId: 'term-1',
        classId: 'cls-10',
        name: 'Class 10 Mid-Term Assessment',
        startDate: '2026-09-15',
        endDate: '2026-09-25',
        class: { id: 'cls-10', name: 'Class 10', code: 'STD-10' },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ exams: mockExams }),
    });

    const store = useExamsStore();
    const data = await store.fetchExams({ termId: 'term-1' });

    expect(data.length).toBe(1);
    expect(store.exams).toEqual(mockExams);
  });

  it('fetches assessments for an exam', async () => {
    const mockAssessments = [
      {
        id: 'ass-1',
        examId: 'exam-1',
        subjectId: 'sub-mat',
        type: 'THEORY',
        maxMarks: 80,
        passingMarks: 26,
        date: '2026-09-18',
        subject: { id: 'sub-mat', name: 'Mathematics', code: 'MATH-10' },
      },
      {
        id: 'ass-2',
        examId: 'exam-1',
        subjectId: 'sub-mat',
        type: 'INTERNAL_ASSESSMENT',
        maxMarks: 20,
        passingMarks: 7,
        date: '2026-09-18',
        subject: { id: 'sub-mat', name: 'Mathematics', code: 'MATH-10' },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ assessments: mockAssessments }),
    });

    const store = useExamsStore();
    const data = await store.fetchAssessments('exam-1');

    expect(data.length).toBe(2);
    expect(store.assessments).toEqual(mockAssessments);
  });

  it('fetches marks sheet and records batch marks', async () => {
    const mockSheet = {
      assessment: {
        id: 'ass-1',
        name: 'Mathematics - THEORY',
        type: 'THEORY',
        maxMarks: 80,
      },
      totalStudents: 2,
      enteredStudents: 1,
      students: [
        {
          enrollmentId: 'enr-1',
          studentId: 'st-1',
          rollNumber: 1,
          admissionNumber: 'VS-01',
          fullName: 'Aarav Kumar',
          sectionName: 'A',
          marksObtained: 76,
          isAbsent: false,
          remarks: 'Excellent',
          isEntered: true,
        },
      ],
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSheet,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSheet,
      });

    const store = useExamsStore();
    const sheet = await store.fetchMarksSheet('ass-1');

    expect(sheet.totalStudents).toBe(2);
    expect(store.marksSheet?.assessment.id).toBe('ass-1');

    const saveRes = await store.saveMarksBatch('ass-1', [
      { enrollmentId: 'enr-1', marksObtained: 76, isAbsent: false },
    ]);
    expect(saveRes.success).toBe(true);
  });

  it('generates CBSE official report card with APAAR ID and CGPA metrics', async () => {
    const mockReportCard = {
      school: {
        name: 'Vidya Model Academy',
        code: 'VS-BLR-01',
        affiliationNumber: 'CBSE-AFF-2026',
        board: 'CBSE',
        address: 'Whitefield, Bengaluru',
      },
      student: {
        id: 'st-1',
        admissionNumber: 'VS-2024-001',
        rollNumber: 1,
        fullName: 'Aarav Kumar',
        gender: 'MALE',
        dateOfBirth: '2010-05-14',
        apaarId: '984512345678',
        motherName: 'Sunita Kumar',
        fatherName: 'Suresh Kumar',
      },
      academic: {
        academicYear: '2025-26',
        className: 'Class 10',
        classCode: 'STD-10',
        sectionName: 'A',
        attendance: { workingDays: 120, attendedDays: 114, percentage: 95 },
      },
      gradingScale: [],
      termResults: [
        {
          termId: 'term-1',
          termName: 'Term 1 Mid-Term Examination',
          termType: 'TERM_1',
          examName: 'Class 10 Mid-Term',
          subjects: [
            {
              subjectId: 'sub-1',
              subjectName: 'Mathematics',
              subjectCode: 'MATH-10',
              totalMaxMarks: 100,
              totalMarksObtained: 94,
              percentage: 94,
              grade: 'A1',
              gradePoint: 10.0,
              description: 'Top 1/8th of passed candidates',
              resultStatus: 'PASS',
              components: [
                { type: 'THEORY', maxMarks: 80, obtained: 76, passingMarks: 26, isAbsent: false },
                { type: 'INTERNAL_ASSESSMENT', maxMarks: 20, obtained: 18, passingMarks: 7, isAbsent: false },
              ],
            },
          ],
          summary: {
            totalMaxMarks: 100,
            totalMarksObtained: 94,
            aggregatePercentage: 94,
            cgpa: 10.0,
            overallGrade: 'A1',
            resultStatus: 'PASS',
            failedSubjectsCount: 0,
          },
        },
      ],
      overallSummary: {
        totalMaxMarks: 100,
        totalMarksObtained: 94,
        aggregatePercentage: 94,
        cgpa: 10.0,
        overallGrade: 'A1',
        resultStatus: 'PASS',
        failedSubjectsCount: 0,
      },
      generatedAt: '2026-10-08T14:00:00.000Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReportCard,
    });

    const store = useExamsStore();
    const rc = await store.fetchReportCard('enr-1');

    expect(rc.student.fullName).toBe('Aarav Kumar');
    expect(rc.student.apaarId).toBe('984512345678');
    expect(rc.termResults[0]?.subjects[0]?.grade).toBe('A1');
    expect(rc.termResults[0]?.summary.cgpa).toBe(10.0);
    expect(rc.termResults[0]?.summary.resultStatus).toBe('PASS');
    expect(store.reportCard).toEqual(mockReportCard);
  });
});
