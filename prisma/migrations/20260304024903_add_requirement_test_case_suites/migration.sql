-- CreateTable
CREATE TABLE "RequirementTestCaseSuite" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "sourceRequirementVersion" INTEGER NOT NULL,
    "suite" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "agentId" TEXT NOT NULL DEFAULT 'test-case-generator',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementTestCaseSuite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequirementTestCaseSuite_requirementId_createdAt_idx" ON "RequirementTestCaseSuite"("requirementId", "createdAt");

-- CreateIndex
CREATE INDEX "RequirementTestCaseSuite_requirementId_sourceRequirementVer_idx" ON "RequirementTestCaseSuite"("requirementId", "sourceRequirementVersion");

-- AddForeignKey
ALTER TABLE "RequirementTestCaseSuite" ADD CONSTRAINT "RequirementTestCaseSuite_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
