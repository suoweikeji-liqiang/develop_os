-- Create enums
CREATE TYPE "ClarificationSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "ClarificationQuestionCategory" AS ENUM ('GOAL', 'SCOPE', 'USER', 'IO', 'CONSTRAINT', 'ACCEPTANCE', 'RISK', 'OTHER');
CREATE TYPE "ClarificationQuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'RESOLVED', 'SKIPPED');
CREATE TYPE "SpecArtifactFormat" AS ENUM ('markdown', 'json');

-- CreateTable
CREATE TABLE "ClarificationSession" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" "ClarificationSessionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClarificationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClarificationQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "category" "ClarificationQuestionCategory" NOT NULL,
    "questionText" TEXT NOT NULL,
    "status" "ClarificationQuestionStatus" NOT NULL DEFAULT 'OPEN',
    "answerText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClarificationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelChangeLog" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "changeSource" TEXT NOT NULL,
    "patchJson" JSONB NOT NULL,
    "rationale" TEXT,
    "confidence" DOUBLE PRECISION,
    "evidenceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecArtifact" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "format" "SpecArtifactFormat" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClarificationSession_requirementId_createdAt_idx" ON "ClarificationSession"("requirementId", "createdAt");
CREATE INDEX "ClarificationQuestion_sessionId_status_idx" ON "ClarificationQuestion"("sessionId", "status");
CREATE INDEX "ClarificationQuestion_category_idx" ON "ClarificationQuestion"("category");
CREATE INDEX "ModelChangeLog_requirementId_createdAt_idx" ON "ModelChangeLog"("requirementId", "createdAt");
CREATE INDEX "ModelChangeLog_requirementId_changeSource_createdAt_idx" ON "ModelChangeLog"("requirementId", "changeSource", "createdAt");
CREATE INDEX "SpecArtifact_requirementId_createdAt_idx" ON "SpecArtifact"("requirementId", "createdAt");

-- Create unique
CREATE UNIQUE INDEX "SpecArtifact_requirementId_version_key" ON "SpecArtifact"("requirementId", "version");

-- AddForeignKey
ALTER TABLE "ClarificationSession" ADD CONSTRAINT "ClarificationSession_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClarificationQuestion" ADD CONSTRAINT "ClarificationQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClarificationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModelChangeLog" ADD CONSTRAINT "ModelChangeLog_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpecArtifact" ADD CONSTRAINT "SpecArtifact_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
