-- CreateEnum
CREATE TYPE "ChangeUnitRiskLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

-- CreateEnum
CREATE TYPE "ChangeUnitStatus" AS ENUM (
    'PROPOSED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'APPLIED',
    'ARCHIVED'
);

-- CreateTable
CREATE TABLE "ChangeUnit" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "changeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changeScope" TEXT,
    "impactSummary" TEXT,
    "riskLevel" "ChangeUnitRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "requiresResignoff" BOOLEAN NOT NULL DEFAULT false,
    "affectsTests" BOOLEAN NOT NULL DEFAULT false,
    "affectsPrototype" BOOLEAN NOT NULL DEFAULT false,
    "affectsCode" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "status" "ChangeUnitStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeUnitRequirementUnit" (
    "id" TEXT NOT NULL,
    "changeUnitId" TEXT NOT NULL,
    "requirementUnitId" TEXT NOT NULL,
    "relationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeUnitRequirementUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeUnitIssueUnit" (
    "id" TEXT NOT NULL,
    "changeUnitId" TEXT NOT NULL,
    "issueUnitId" TEXT NOT NULL,
    "relationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeUnitIssueUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChangeUnit_requirementId_changeKey_key" ON "ChangeUnit"("requirementId", "changeKey");
CREATE INDEX "ChangeUnit_requirementId_status_updatedAt_idx" ON "ChangeUnit"("requirementId", "status", "updatedAt");
CREATE INDEX "ChangeUnit_requirementId_riskLevel_status_idx" ON "ChangeUnit"("requirementId", "riskLevel", "status");
CREATE INDEX "ChangeUnit_requirementId_requiresResignoff_idx" ON "ChangeUnit"("requirementId", "requiresResignoff");
CREATE INDEX "ChangeUnit_sourceType_sourceRef_idx" ON "ChangeUnit"("sourceType", "sourceRef");
CREATE INDEX "ChangeUnit_proposedBy_idx" ON "ChangeUnit"("proposedBy");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeUnitRequirementUnit_changeUnitId_requirementUnitId_key" ON "ChangeUnitRequirementUnit"("changeUnitId", "requirementUnitId");
CREATE INDEX "ChangeUnitRequirementUnit_requirementUnitId_idx" ON "ChangeUnitRequirementUnit"("requirementUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeUnitIssueUnit_changeUnitId_issueUnitId_key" ON "ChangeUnitIssueUnit"("changeUnitId", "issueUnitId");
CREATE INDEX "ChangeUnitIssueUnit_issueUnitId_idx" ON "ChangeUnitIssueUnit"("issueUnitId");

-- AddForeignKey
ALTER TABLE "ChangeUnit" ADD CONSTRAINT "ChangeUnit_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeUnitRequirementUnit" ADD CONSTRAINT "ChangeUnitRequirementUnit_changeUnitId_fkey" FOREIGN KEY ("changeUnitId") REFERENCES "ChangeUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeUnitRequirementUnit" ADD CONSTRAINT "ChangeUnitRequirementUnit_requirementUnitId_fkey" FOREIGN KEY ("requirementUnitId") REFERENCES "RequirementUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeUnitIssueUnit" ADD CONSTRAINT "ChangeUnitIssueUnit_changeUnitId_fkey" FOREIGN KEY ("changeUnitId") REFERENCES "ChangeUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeUnitIssueUnit" ADD CONSTRAINT "ChangeUnitIssueUnit_issueUnitId_fkey" FOREIGN KEY ("issueUnitId") REFERENCES "IssueUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
