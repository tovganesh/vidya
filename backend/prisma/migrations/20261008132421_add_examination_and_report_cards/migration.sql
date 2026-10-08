-- CreateEnum
CREATE TYPE "ExamTermType" AS ENUM ('TERM_1', 'TERM_2', 'UNIT_TEST_1', 'UNIT_TEST_2', 'PRE_BOARD', 'ANNUAL');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('THEORY', 'PRACTICAL', 'INTERNAL_ASSESSMENT', 'PROJECT', 'ORAL');

-- CreateTable
CREATE TABLE "exam_terms" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ExamTermType" NOT NULL DEFAULT 'TERM_1',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL DEFAULT 'THEORY',
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "passingMarks" DOUBLE PRECISION NOT NULL DEFAULT 33.0,
    "weightage" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marks_records" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "enteredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marks_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_scales" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'CBSE 9-Point Scale',
    "grade" TEXT NOT NULL,
    "minPercentage" DOUBLE PRECISION NOT NULL,
    "maxPercentage" DOUBLE PRECISION NOT NULL,
    "gradePoint" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_scales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_terms_schoolId_academicYearId_idx" ON "exam_terms"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_terms_schoolId_academicYearId_name_key" ON "exam_terms"("schoolId", "academicYearId", "name");

-- CreateIndex
CREATE INDEX "exams_schoolId_termId_idx" ON "exams"("schoolId", "termId");

-- CreateIndex
CREATE INDEX "exams_classId_idx" ON "exams"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "exams_termId_classId_name_key" ON "exams"("termId", "classId", "name");

-- CreateIndex
CREATE INDEX "assessments_examId_idx" ON "assessments"("examId");

-- CreateIndex
CREATE INDEX "assessments_subjectId_idx" ON "assessments"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_examId_subjectId_type_key" ON "assessments"("examId", "subjectId", "type");

-- CreateIndex
CREATE INDEX "marks_records_assessmentId_idx" ON "marks_records"("assessmentId");

-- CreateIndex
CREATE INDEX "marks_records_enrollmentId_idx" ON "marks_records"("enrollmentId");

-- CreateIndex
CREATE INDEX "marks_records_schoolId_idx" ON "marks_records"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "marks_records_assessmentId_enrollmentId_key" ON "marks_records"("assessmentId", "enrollmentId");

-- CreateIndex
CREATE INDEX "grading_scales_schoolId_idx" ON "grading_scales"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "grading_scales_schoolId_grade_key" ON "grading_scales"("schoolId", "grade");

-- AddForeignKey
ALTER TABLE "exam_terms" ADD CONSTRAINT "exam_terms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_terms" ADD CONSTRAINT "exam_terms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_termId_fkey" FOREIGN KEY ("termId") REFERENCES "exam_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marks_records" ADD CONSTRAINT "marks_records_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marks_records" ADD CONSTRAINT "marks_records_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marks_records" ADD CONSTRAINT "marks_records_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_scales" ADD CONSTRAINT "grading_scales_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
