-- CreateTable
CREATE TABLE "ReviewSignoff" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "userId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSignoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewSignoff_requirementId_idx" ON "ReviewSignoff"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSignoff_requirementId_role_key" ON "ReviewSignoff"("requirementId", "role");

-- AddForeignKey
ALTER TABLE "ReviewSignoff" ADD CONSTRAINT "ReviewSignoff_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSignoff" ADD CONSTRAINT "ReviewSignoff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
