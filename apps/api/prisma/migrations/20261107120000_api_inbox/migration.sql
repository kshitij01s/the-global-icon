-- CreateEnum
CREATE TYPE "ApiInboxSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ApiInboxStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "ApiInboxItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" "ApiInboxSeverity" NOT NULL DEFAULT 'WARNING',
    "status" "ApiInboxStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "customerMessage" TEXT NOT NULL,
    "technicalError" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "entityId" TEXT,
    "entityType" TEXT,
    "metadata" JSONB,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "adminNotes" TEXT,
    "emailSentAt" TIMESTAMP(3),

    CONSTRAINT "ApiInboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiInboxItem_status_severity_idx" ON "ApiInboxItem"("status", "severity");

-- CreateIndex
CREATE INDEX "ApiInboxItem_fingerprint_status_idx" ON "ApiInboxItem"("fingerprint", "status");

-- CreateIndex
CREATE INDEX "ApiInboxItem_category_idx" ON "ApiInboxItem"("category");

-- CreateIndex
CREATE INDEX "ApiInboxItem_source_idx" ON "ApiInboxItem"("source");

-- CreateIndex
CREATE INDEX "ApiInboxItem_createdAt_idx" ON "ApiInboxItem"("createdAt");

-- CreateIndex
CREATE INDEX "ApiInboxItem_lastSeenAt_idx" ON "ApiInboxItem"("lastSeenAt");

-- CreateIndex
CREATE INDEX "ApiInboxItem_userId_idx" ON "ApiInboxItem"("userId");

-- CreateIndex
CREATE INDEX "ApiInboxItem_entityType_entityId_idx" ON "ApiInboxItem"("entityType", "entityId");
