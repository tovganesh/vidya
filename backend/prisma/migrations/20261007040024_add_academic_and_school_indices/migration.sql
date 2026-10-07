-- CreateIndex
CREATE INDEX "academic_years_schoolId_status_idx" ON "academic_years"("schoolId", "status");

-- CreateIndex
CREATE INDEX "campuses_schoolId_idx" ON "campuses"("schoolId");

-- CreateIndex
CREATE INDEX "subjects_schoolId_idx" ON "subjects"("schoolId");
