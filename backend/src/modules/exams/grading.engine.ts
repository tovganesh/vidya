export interface GradeResult {
  grade: string;
  gradePoint: number;
  description: string;
}

export interface SubjectComponentScore {
  type: string;
  maxMarks: number;
  obtained: number | null;
  passingMarks?: number;
  isAbsent?: boolean;
}

export interface SubjectEvaluation {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  components: SubjectComponentScore[];
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  isPassed: boolean;
  isAbsent: boolean;
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

export class GradingEngine {
  /**
   * Default CBSE 9-point scale brackets
   */
  private static defaultBrackets = [
    { grade: 'A1', min: 91.0, max: 100.0, gp: 10.0, desc: 'Outstanding' },
    { grade: 'A2', min: 81.0, max: 90.99, gp: 9.0, desc: 'Excellent' },
    { grade: 'B1', min: 71.0, max: 80.99, gp: 8.0, desc: 'Very Good' },
    { grade: 'B2', min: 61.0, max: 70.99, gp: 7.0, desc: 'Good' },
    { grade: 'C1', min: 51.0, max: 60.99, gp: 6.0, desc: 'Fair' },
    { grade: 'C2', min: 41.0, max: 50.99, gp: 5.0, desc: 'Average' },
    { grade: 'D',  min: 33.0, max: 40.99, gp: 4.0, desc: 'Pass' },
    { grade: 'E',  min: 0.0,  max: 32.99, gp: 0.0, desc: 'Essential Repeat' },
  ];

  /**
   * Calculate grade for a given percentage based on CBSE brackets or custom scales
   */
  static calculateGrade(
    percentage: number,
    customScales?: Array<{ grade: string; minPercentage: number; maxPercentage: number; gradePoint: number; description?: string | null }>,
  ): GradeResult {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const scales = customScales && customScales.length > 0 ? customScales : this.defaultBrackets;

    for (const scale of scales) {
      const isCustom = 'minPercentage' in scale;
      const min = isCustom ? scale.minPercentage : scale.min;
      const max = isCustom ? scale.maxPercentage : scale.max;
      const gp = isCustom ? scale.gradePoint : scale.gp;
      const desc = isCustom ? (scale.description || '') : scale.desc;

      // Allow inclusive upper bound for top bracket
      if (clampedPercentage >= min && (clampedPercentage <= max || (max === 100 && clampedPercentage >= 99.99))) {
        return {
          grade: scale.grade,
          gradePoint: gp,
          description: desc || scale.grade,
        };
      }
    }

    return {
      grade: 'E',
      gradePoint: 0.0,
      description: 'Essential Repeat',
    };
  }

  /**
   * Evaluate subject performance across multiple components (Theory, Practical, Internal)
   */
  static evaluateSubject(
    subjectId: string,
    subjectName: string,
    subjectCode: string,
    components: SubjectComponentScore[],
    customScales?: any[],
  ): SubjectEvaluation {
    let totalMaxMarks = 0;
    let totalMarksObtained = 0;
    let isAllAbsent = components.length > 0;
    let isPassed = true;

    for (const comp of components) {
      totalMaxMarks += comp.maxMarks;
      if (!comp.isAbsent && comp.obtained !== null) {
        totalMarksObtained += comp.obtained;
        isAllAbsent = false;
        if (comp.passingMarks !== undefined && comp.obtained < comp.passingMarks) {
          isPassed = false;
        }
      } else {
        isPassed = false;
      }
    }

    const percentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 10) / 10;
    const gradeResult = this.calculateGrade(roundedPercentage, customScales);

    // If overall percentage is below 33%, subject is failed
    if (roundedPercentage < 33.0) {
      isPassed = false;
    }

    return {
      subjectId,
      subjectName,
      subjectCode,
      components,
      totalMaxMarks,
      totalMarksObtained: Math.round(totalMarksObtained * 10) / 10,
      percentage: roundedPercentage,
      grade: gradeResult.grade,
      gradePoint: gradeResult.gradePoint,
      isPassed,
      isAbsent: isAllAbsent,
    };
  }

  /**
   * Evaluate overall cumulative result across all scholastic subjects
   */
  static evaluateCumulative(
    subjects: SubjectEvaluation[],
    customScales?: any[],
  ): CumulativeEvaluation {
    if (subjects.length === 0) {
      return {
        totalMaxMarks: 0,
        totalMarksObtained: 0,
        aggregatePercentage: 0,
        cgpa: 0,
        overallGrade: 'E',
        resultStatus: 'ESSENTIAL_REPEAT',
        failedSubjectsCount: 0,
      };
    }

    let totalMax = 0;
    let totalObtained = 0;
    let totalGradePoints = 0;
    let failedCount = 0;

    for (const sub of subjects) {
      totalMax += sub.totalMaxMarks;
      totalObtained += sub.totalMarksObtained;
      totalGradePoints += sub.gradePoint;
      if (!sub.isPassed) {
        failedCount++;
      }
    }

    const aggregatePercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
    const cgpa = Math.round((totalGradePoints / subjects.length) * 10) / 10;
    const overallGradeResult = this.calculateGrade(aggregatePercentage, customScales);

    let resultStatus: 'PASS' | 'COMPARTMENT' | 'ESSENTIAL_REPEAT' = 'PASS';
    if (failedCount === 1) {
      resultStatus = 'COMPARTMENT';
    } else if (failedCount >= 2) {
      resultStatus = 'ESSENTIAL_REPEAT';
    }

    return {
      totalMaxMarks: totalMax,
      totalMarksObtained: Math.round(totalObtained * 10) / 10,
      aggregatePercentage,
      cgpa,
      overallGrade: overallGradeResult.grade,
      resultStatus,
      failedSubjectsCount: failedCount,
    };
  }
}
