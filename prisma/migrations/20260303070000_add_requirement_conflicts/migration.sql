-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('OPEN', 'DISMISSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ConflictScope" AS ENUM ('INTERNAL', 'CROSS_REQUIREMENT');

-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "RequirementConflict" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "relatedRequirementId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "status" "ConflictStatus" NOT NULL DEFAULT 'OPEN',
    "scope" "ConflictScope" NOT NULL,
    "severity" "ConflictSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "resolutionNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "agentId" TEXT NOT NULL DEFAULT 'conflict-detector',
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementConflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequirementConflict_requirementId_fingerprint_key" ON "RequirementConflict"("requirementId", "fingerprint");

-- CreateIndex
CREATE INDEX "RequirementConflict_requirementId_status_updatedAt_idx" ON "RequirementConflict"("requirementId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "RequirementConflict_relatedRequirementId_idx" ON "RequirementConflict"("relatedRequirementId");

-- AddForeignKey
ALTER TABLE "RequirementConflict" ADD CONSTRAINT "RequirementConflict_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementConflict" ADD CONSTRAINT "RequirementConflict_relatedRequirementId_fkey" FOREIGN KEY ("relatedRequirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
