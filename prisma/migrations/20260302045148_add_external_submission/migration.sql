-- CreateTable
CREATE TABLE "ExternalSubmission" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "submitterName" TEXT NOT NULL,
    "submitterContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSubmission_token_key" ON "ExternalSubmission"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSubmission_requirementId_key" ON "ExternalSubmission"("requirementId");

-- AddForeignKey
ALTER TABLE "ExternalSubmission" ADD CONSTRAINT "ExternalSubmission_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
