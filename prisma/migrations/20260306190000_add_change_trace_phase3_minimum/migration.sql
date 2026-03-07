-- AlterTable
ALTER TABLE "RequirementVersion"
ADD COLUMN "changeUnitId" TEXT;

-- AlterTable
ALTER TABLE "ModelChangeLog"
ADD COLUMN "changeUnitId" TEXT;

-- CreateIndex
CREATE INDEX "RequirementVersion_changeUnitId_idx" ON "RequirementVersion"("changeUnitId");
CREATE INDEX "RequirementVersion_requirementId_changeUnitId_idx" ON "RequirementVersion"("requirementId", "changeUnitId");

-- CreateIndex
CREATE INDEX "ModelChangeLog_changeUnitId_idx" ON "ModelChangeLog"("changeUnitId");
CREATE INDEX "ModelChangeLog_requirementId_changeUnitId_createdAt_idx" ON "ModelChangeLog"("requirementId", "changeUnitId", "createdAt");

-- AddForeignKey
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_changeUnitId_fkey" FOREIGN KEY ("changeUnitId") REFERENCES "ChangeUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModelChangeLog" ADD CONSTRAINT "ModelChangeLog_changeUnitId_fkey" FOREIGN KEY ("changeUnitId") REFERENCES "ChangeUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
