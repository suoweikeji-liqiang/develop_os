-- CreateEnum
CREATE TYPE "RequirementStabilityLevel" AS ENUM (
    'S0_IDEA',
    'S1_ROUGHLY_DEFINED',
    'S2_MAIN_FLOW_CLEAR',
    'S3_ALMOST_READY',
    'S4_READY_FOR_DEVELOPMENT',
    'S5_VERIFIED_STABLE'
);

-- CreateEnum
CREATE TYPE "RequirementUnitStatus" AS ENUM (
    'DRAFT',
    'REFINING',
    'AGREED',
    'READY_FOR_DESIGN',
    'READY_FOR_DEV',
    'ARCHIVED'
);

-- CreateEnum
CREATE TYPE "IssueUnitSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

-- CreateEnum
CREATE TYPE "IssueUnitStatus" AS ENUM (
    'OPEN',
    'TRIAGED',
    'IN_PROGRESS',
    'WAITING_CONFIRMATION',
    'RESOLVED',
    'REJECTED',
    'ARCHIVED'
);

-- AlterTable
ALTER TABLE "Requirement"
ADD COLUMN "stabilityLevel" "RequirementStabilityLevel" NOT NULL DEFAULT 'S0_IDEA',
ADD COLUMN "stabilityScore" INTEGER,
ADD COLUMN "stabilityReason" TEXT,
ADD COLUMN "stabilityUpdatedAt" TIMESTAMP(3),
ADD COLUMN "stabilityUpdatedBy" TEXT;

-- Backfill existing requirements to a minimally useful baseline.
UPDATE "Requirement"
SET "stabilityLevel" = CASE
    WHEN "model" IS NOT NULL THEN 'S1_ROUGHLY_DEFINED'::"RequirementStabilityLevel"
    ELSE 'S0_IDEA'::"RequirementStabilityLevel"
END;

-- CreateTable
CREATE TABLE "RequirementUnit" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "parentUnitId" TEXT,
    "unitKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "status" "RequirementUnitStatus" NOT NULL DEFAULT 'DRAFT',
    "stabilityLevel" "RequirementStabilityLevel" NOT NULL DEFAULT 'S0_IDEA',
    "stabilityScore" INTEGER,
    "stabilityReason" TEXT,
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "acceptanceNotes" TEXT,
    "ownerId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueUnit" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "primaryRequirementUnitId" TEXT,
    "type" TEXT NOT NULL,
    "severity" "IssueUnitSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IssueUnitStatus" NOT NULL DEFAULT 'OPEN',
    "blockDev" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "suggestedResolution" TEXT,
    "resolvedNote" TEXT,
    "ownerId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Requirement_stabilityLevel_idx" ON "Requirement"("stabilityLevel");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementUnit_requirementId_unitKey_key" ON "RequirementUnit"("requirementId", "unitKey");

-- CreateIndex
CREATE INDEX "RequirementUnit_requirementId_sortOrder_idx" ON "RequirementUnit"("requirementId", "sortOrder");
CREATE INDEX "RequirementUnit_requirementId_layer_status_idx" ON "RequirementUnit"("requirementId", "layer", "status");
CREATE INDEX "RequirementUnit_requirementId_stabilityLevel_idx" ON "RequirementUnit"("requirementId", "stabilityLevel");
CREATE INDEX "RequirementUnit_parentUnitId_idx" ON "RequirementUnit"("parentUnitId");
CREATE INDEX "RequirementUnit_ownerId_idx" ON "RequirementUnit"("ownerId");

-- CreateIndex
CREATE INDEX "IssueUnit_requirementId_status_updatedAt_idx" ON "IssueUnit"("requirementId", "status", "updatedAt");
CREATE INDEX "IssueUnit_requirementId_severity_status_idx" ON "IssueUnit"("requirementId", "severity", "status");
CREATE INDEX "IssueUnit_requirementId_blockDev_status_idx" ON "IssueUnit"("requirementId", "blockDev", "status");
CREATE INDEX "IssueUnit_primaryRequirementUnitId_idx" ON "IssueUnit"("primaryRequirementUnitId");
CREATE INDEX "IssueUnit_ownerId_idx" ON "IssueUnit"("ownerId");

-- AddForeignKey
ALTER TABLE "RequirementUnit" ADD CONSTRAINT "RequirementUnit_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementUnit" ADD CONSTRAINT "RequirementUnit_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "RequirementUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IssueUnit" ADD CONSTRAINT "IssueUnit_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueUnit" ADD CONSTRAINT "IssueUnit_primaryRequirementUnitId_fkey" FOREIGN KEY ("primaryRequirementUnitId") REFERENCES "RequirementUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
