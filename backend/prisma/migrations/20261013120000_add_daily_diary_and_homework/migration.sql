-- CreateTable
CREATE TABLE "daily_diary_entries" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "date" DATE NOT NULL,
    "classwork" TEXT NOT NULL,
    "homework" TEXT,
    "dueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_diary_entries_sectionId_subjectId_date_key" ON "daily_diary_entries"("sectionId", "subjectId", "date");

-- CreateIndex
CREATE INDEX "daily_diary_entries_schoolId_sectionId_date_idx" ON "daily_diary_entries"("schoolId", "sectionId", "date");

-- CreateIndex
CREATE INDEX "daily_diary_entries_schoolId_classId_date_idx" ON "daily_diary_entries"("schoolId", "classId", "date");

-- AddForeignKey
ALTER TABLE "daily_diary_entries" ADD CONSTRAINT "daily_diary_entries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_diary_entries" ADD CONSTRAINT "daily_diary_entries_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_diary_entries" ADD CONSTRAINT "daily_diary_entries_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_diary_entries" ADD CONSTRAINT "daily_diary_entries_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_diary_entries" ADD CONSTRAINT "daily_diary_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_diary_entries" ADD CONSTRAINT "daily_diary_entries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
