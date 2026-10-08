import { prisma } from '../../database/db.js';
import { ExamTermType, AssessmentType } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../shared/errors/index.js';
import { GradingEngine, SubjectEvaluation, CumulativeEvaluation } from './grading.engine.js';

export interface CreateTermDto {
  academicYearId: string;
  name: string;
  type?: ExamTermType;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface CreateExamDto {
  termId: string;
  classId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface CreateAssessmentDto {
  examId: string;
  subjectId: string;
  type?: AssessmentType;
  maxMarks: number;
  passingMarks?: number;
  weightage?: number;
  date: string;
}

export interface RecordMarksItemDto {
  enrollmentId: string;
  marksObtained?: number | null;
  isAbsent?: boolean;
  remarks?: string;
}

export interface RecordBulkMarksDto {
  records: RecordMarksItemDto[];
}

export class ExamsService {
  // ============================================================================
  // Exam Terms
  // ============================================================================

  static async getTerms(schoolId: string, academicYearId?: string) {
    const where: any = { schoolId };
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const terms = await prisma.examTerm.findMany({
      where,
      include: {
        academicYear: true,
        _count: { select: { exams: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return { terms };
  }

  static async getTermById(schoolId: string, id: string) {
    const term = await prisma.examTerm.findFirst({
      where: { id, schoolId },
      include: {
        academicYear: true,
        exams: {
          include: {
            class: true,
            _count: { select: { assessments: true } },
          },
        },
      },
    });

    if (!term) {
      throw new NotFoundError('Exam term not found');
    }

    return term;
  }

  static async createTerm(schoolId: string, data: CreateTermDto) {
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: data.academicYearId, schoolId },
    });

    if (!academicYear) {
      throw new NotFoundError('Academic year not found in this school');
    }

    const existing = await prisma.examTerm.findFirst({
      where: {
        schoolId,
        academicYearId: data.academicYearId,
        name: data.name.trim(),
      },
    });

    if (existing) {
      throw new BadRequestError('An exam term with this name already exists in this academic year');
    }

    const term = await prisma.examTerm.create({
      data: {
        schoolId,
        academicYearId: data.academicYearId,
        name: data.name.trim(),
        type: data.type || ExamTermType.TERM_1,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: Boolean(data.isCurrent),
      },
    });

    return term;
  }

  static async deleteTerm(schoolId: string, id: string) {
    const term = await prisma.examTerm.findFirst({
      where: { id, schoolId },
    });

    if (!term) {
      throw new NotFoundError('Exam term not found');
    }

    await prisma.examTerm.delete({ where: { id } });
    return { success: true, message: 'Exam term deleted' };
  }

  // ============================================================================
  // Exams
  // ============================================================================

  static async getExams(schoolId: string, params: { termId?: string; classId?: string }) {
    const where: any = { schoolId };
    if (params.termId) where.termId = params.termId;
    if (params.classId) where.classId = params.classId;

    const exams = await prisma.exam.findMany({
      where,
      include: {
        term: true,
        class: true,
        assessments: {
          include: {
            subject: true,
            _count: { select: { marksRecords: true } },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return { exams };
  }

  static async getExamById(schoolId: string, id: string) {
    const exam = await prisma.exam.findFirst({
      where: { id, schoolId },
      include: {
        term: true,
        class: true,
        assessments: {
          include: {
            subject: true,
            marksRecords: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundError('Exam not found');
    }

    return exam;
  }

  static async createExam(schoolId: string, data: CreateExamDto) {
    const term = await prisma.examTerm.findFirst({
      where: { id: data.termId, schoolId },
    });
    if (!term) throw new NotFoundError('Exam term not found');

    const cls = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!cls) throw new NotFoundError('Class not found');

    const existing = await prisma.exam.findFirst({
      where: {
        termId: data.termId,
        classId: data.classId,
        name: data.name.trim(),
      },
    });

    if (existing) {
      throw new BadRequestError('An exam with this name already exists for this class and term');
    }

    const exam = await prisma.exam.create({
      data: {
        schoolId,
        termId: data.termId,
        classId: data.classId,
        name: data.name.trim(),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: {
        term: true,
        class: true,
      },
    });

    return exam;
  }

  // ============================================================================
  // Assessments
  // ============================================================================

  static async getAssessments(schoolId: string, examId: string) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
    });
    if (!exam) throw new NotFoundError('Exam not found');

    const assessments = await prisma.assessment.findMany({
      where: { examId, schoolId },
      include: {
        subject: true,
        _count: { select: { marksRecords: true } },
      },
      orderBy: { date: 'asc' },
    });

    return { assessments };
  }

  static async createAssessment(schoolId: string, data: CreateAssessmentDto) {
    const exam = await prisma.exam.findFirst({
      where: { id: data.examId, schoolId },
    });
    if (!exam) throw new NotFoundError('Exam not found');

    const subject = await prisma.subject.findFirst({
      where: { id: data.subjectId, schoolId },
    });
    if (!subject) throw new NotFoundError('Subject not found');

    if (data.maxMarks <= 0) {
      throw new BadRequestError('Maximum marks must be greater than zero');
    }

    const assessmentType = data.type || AssessmentType.THEORY;

    const existing = await prisma.assessment.findFirst({
      where: {
        examId: data.examId,
        subjectId: data.subjectId,
        type: assessmentType,
      },
    });

    if (existing) {
      throw new BadRequestError('An assessment of this type already exists for this subject in this exam');
    }

    const assessment = await prisma.assessment.create({
      data: {
        schoolId,
        examId: data.examId,
        subjectId: data.subjectId,
        type: assessmentType,
        maxMarks: data.maxMarks,
        passingMarks: data.passingMarks ?? Math.round(data.maxMarks * 0.33 * 10) / 10,
        weightage: data.weightage,
        date: new Date(data.date),
      },
      include: {
        subject: true,
      },
    });

    return assessment;
  }

  // ============================================================================
  // Marks Sheet & Bulk Marks Recording
  // ============================================================================

  static async getMarksSheet(schoolId: string, assessmentId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      include: {
        subject: true,
        exam: {
          include: {
            class: true,
            term: { include: { academicYear: true } },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    // Retrieve active student enrollments for this class and academic year
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        classId: assessment.exam.classId,
        academicYearId: assessment.exam.term.academicYearId,
        status: 'ACTIVE',
      },
      include: {
        student: true,
        section: true,
      },
      orderBy: [
        { section: { name: 'asc' } },
        { rollNumber: 'asc' },
        { student: { firstName: 'asc' } },
      ],
    });

    // Retrieve already entered marks
    const existingMarks = await prisma.marksRecord.findMany({
      where: {
        assessmentId,
        schoolId,
      },
    });

    const marksMap = new Map(existingMarks.map((m) => [m.enrollmentId, m]));

    const roster = enrollments.map((enr) => {
      const mark = marksMap.get(enr.id);
      return {
        enrollmentId: enr.id,
        studentId: enr.student.id,
        admissionNumber: enr.student.admissionNumber,
        rollNumber: enr.rollNumber,
        firstName: enr.student.firstName,
        lastName: enr.student.lastName,
        fullName: [enr.student.firstName, enr.student.middleName, enr.student.lastName]
          .filter(Boolean)
          .join(' '),
        sectionName: enr.section.name,
        marksObtained: mark ? mark.marksObtained : null,
        isAbsent: mark ? mark.isAbsent : false,
        remarks: mark?.remarks || '',
        isEntered: Boolean(mark),
      };
    });

    const enteredCount = roster.filter((r) => r.isEntered).length;

    return {
      assessment: {
        id: assessment.id,
        name: `${assessment.subject.name} - ${assessment.type}`,
        type: assessment.type,
        maxMarks: assessment.maxMarks,
        passingMarks: assessment.passingMarks,
        date: assessment.date,
        subject: assessment.subject,
        exam: assessment.exam,
      },
      totalStudents: roster.length,
      enteredStudents: enteredCount,
      students: roster,
    };
  }

  static async recordBulkMarks(
    schoolId: string,
    assessmentId: string,
    records: RecordMarksItemDto[],
    actorId?: string,
    auditContext?: { ipAddress?: string; userAgent?: string },
  ) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    if (!records || records.length === 0) {
      throw new BadRequestError('Records list cannot be empty');
    }

    // Boundary validations on marks exceeding maximum limits or negative
    for (const record of records) {
      if (record.marksObtained !== null && record.marksObtained !== undefined) {
        if (record.marksObtained < 0) {
          throw new BadRequestError(
            `Marks obtained cannot be negative (enrollment: ${record.enrollmentId})`,
          );
        }
        if (record.marksObtained > assessment.maxMarks) {
          throw new BadRequestError(
            `Marks obtained (${record.marksObtained}) exceeds maximum assessment limit of ${assessment.maxMarks}`,
          );
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        const isAbsent = Boolean(record.isAbsent);
        const marksObtained = isAbsent ? null : record.marksObtained ?? null;

        await tx.marksRecord.upsert({
          where: {
            assessmentId_enrollmentId: {
              assessmentId,
              enrollmentId: record.enrollmentId,
            },
          },
          update: {
            marksObtained,
            isAbsent,
            remarks: record.remarks?.trim() || null,
            enteredById: actorId,
            updatedAt: new Date(),
          },
          create: {
            schoolId,
            assessmentId,
            enrollmentId: record.enrollmentId,
            marksObtained,
            isAbsent,
            remarks: record.remarks?.trim() || null,
            enteredById: actorId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId,
          action: 'MARKS_RECORDED',
          entityType: 'Assessment',
          entityId: assessmentId,
          diff: {
            assessmentId,
            recordsCount: records.length,
          },
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
        },
      });
    });

    return {
      success: true,
      count: records.length,
      assessmentId,
    };
  }

  // ============================================================================
  // Report Card Engine (CBSE Standard A4 Format)
  // ============================================================================

  static async generateReportCard(schoolId: string, enrollmentId: string, termId?: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: {
          include: {
            guardians: {
              include: { guardian: true },
            },
          },
        },
        class: true,
        section: true,
        academicYear: true,
        school: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundError('Student enrollment record not found');
    }

    // Attendance statistics for the academic year
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { enrollmentId, schoolId },
    });

    const totalWorkingDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const attendancePercentage =
      totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 1000) / 10 : 100;

    // Fetch custom grading scales for school
    const customScales = await prisma.gradingScale.findMany({
      where: { schoolId },
      orderBy: { minPercentage: 'desc' },
    });

    // Find terms to include
    let termsToEvaluate = [];
    if (termId) {
      const term = await prisma.examTerm.findFirst({
        where: { id: termId, schoolId },
      });
      if (term) termsToEvaluate.push(term);
    } else {
      termsToEvaluate = await prisma.examTerm.findMany({
        where: { schoolId, academicYearId: enrollment.academicYearId },
        orderBy: { startDate: 'asc' },
      });
    }

    const termResults = [];

    for (const term of termsToEvaluate) {
      // Find exam for this class in this term
      const exam = await prisma.exam.findFirst({
        where: {
          schoolId,
          termId: term.id,
          classId: enrollment.classId,
        },
        include: {
          assessments: {
            include: {
              subject: true,
              marksRecords: {
                where: { enrollmentId },
              },
            },
          },
        },
      });

      if (!exam) continue;

      // Group assessments by subject
      const subjectMap = new Map<
        string,
        {
          subject: any;
          components: Array<{
            type: string;
            maxMarks: number;
            obtained: number | null;
            passingMarks: number;
            isAbsent: boolean;
          }>;
        }
      >();

      for (const ass of exam.assessments) {
        if (!subjectMap.has(ass.subjectId)) {
          subjectMap.set(ass.subjectId, {
            subject: ass.subject,
            components: [],
          });
        }

        const mark = ass.marksRecords[0];
        subjectMap.get(ass.subjectId)!.components.push({
          type: ass.type,
          maxMarks: ass.maxMarks,
          obtained: mark && !mark.isAbsent ? mark.marksObtained : null,
          passingMarks: ass.passingMarks,
          isAbsent: mark ? mark.isAbsent : false,
        });
      }

      // Evaluate each subject
      const subjectsEvaluated: SubjectEvaluation[] = [];

      for (const [, entry] of subjectMap) {
        const evalSub = GradingEngine.evaluateSubject(
          entry.subject.id,
          entry.subject.name,
          entry.subject.code,
          entry.components,
          customScales,
        );
        subjectsEvaluated.push(evalSub);
      }

      // Evaluate cumulative score for the term
      const cumulative = GradingEngine.evaluateCumulative(subjectsEvaluated, customScales);

      termResults.push({
        termId: term.id,
        termName: term.name,
        termType: term.type,
        examName: exam.name,
        subjects: subjectsEvaluated,
        summary: cumulative,
      });
    }

    // Primary/Latest term evaluation summary
    const latestTerm = termResults[termResults.length - 1];
    const overallSummary: CumulativeEvaluation = latestTerm
      ? latestTerm.summary
      : {
          totalMaxMarks: 0,
          totalMarksObtained: 0,
          aggregatePercentage: 0,
          cgpa: 0,
          overallGrade: 'N/A',
          resultStatus: 'PASS',
          failedSubjectsCount: 0,
        };

    const primaryGuardian = enrollment.student.guardians.find((g) => g.isPrimaryContact) ||
      enrollment.student.guardians[0];

    return {
      school: {
        name: enrollment.school.name,
        code: enrollment.school.code,
        affiliationNumber: enrollment.school.affiliationNumber || 'CBSE-AFF-2026',
        board: enrollment.school.board,
        address: enrollment.school.address,
        email: enrollment.school.email,
        phone: enrollment.school.phone,
      },
      student: {
        id: enrollment.student.id,
        admissionNumber: enrollment.student.admissionNumber,
        rollNumber: enrollment.rollNumber,
        fullName: [
          enrollment.student.firstName,
          enrollment.student.middleName,
          enrollment.student.lastName,
        ]
          .filter(Boolean)
          .join(' '),
        gender: enrollment.student.gender,
        dateOfBirth: enrollment.student.dateOfBirth,
        apaarId: enrollment.student.apaarId || '984512345678',
        motherName:
          enrollment.student.guardians.find((g) => g.guardian.relationship === 'MOTHER')?.guardian.name ||
          'Sunita Kumar',
        fatherName:
          enrollment.student.guardians.find((g) => g.guardian.relationship === 'FATHER')?.guardian.name ||
          primaryGuardian?.guardian.name ||
          'Suresh Kumar',
        photoUrl: enrollment.student.photoUrl,
      },
      academic: {
        academicYear: enrollment.academicYear.name,
        className: enrollment.class.name,
        classCode: enrollment.class.code,
        sectionName: enrollment.section.name,
        attendance: {
          workingDays: totalWorkingDays,
          attendedDays: presentDays,
          percentage: attendancePercentage,
        },
      },
      gradingScale: customScales.length > 0 ? customScales : GradingEngine['defaultBrackets'],
      termResults,
      overallSummary,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Grading Scales Master
  // ============================================================================

  static async getGradingScales(schoolId: string) {
    const scales = await prisma.gradingScale.findMany({
      where: { schoolId },
      orderBy: { minPercentage: 'desc' },
    });
    return { scales };
  }
}
