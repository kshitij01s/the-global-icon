-- AlterTable
ALTER TABLE "ReaderPreference" ADD COLUMN     "colorMode" TEXT NOT NULL DEFAULT 'system';

-- CreateTable
CREATE TABLE "ThemeDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'LIBRARY',
    "festivalKey" TEXT,
    "tokens" JSONB NOT NULL,
    "effects" JSONB,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppearanceSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "globalThemeSlug" TEXT NOT NULL DEFAULT 'midnight-dark',
    "manualOverrideSlug" TEXT,
    "manualOverrideUntil" TIMESTAMP(3),
    "festivalAutoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "effectsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowAdminGlobalChange" BOOLEAN NOT NULL DEFAULT false,
    "allowReaderPreference" BOOLEAN NOT NULL DEFAULT true,
    "defaultRestoreSlug" TEXT NOT NULL DEFAULT 'midnight-dark',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AppearanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalSchedule" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "themeSlug" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "priority" INTEGER NOT NULL DEFAULT 10,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "regions" JSONB,
    "restoreThemeSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeHistory" (
    "id" TEXT NOT NULL,
    "previousSlug" TEXT,
    "newSlug" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "actorId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThemeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pageThemeSlug" TEXT,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ManagedPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedPageVersion" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "pageThemeSlug" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ManagedPageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThemeDefinition_slug_key" ON "ThemeDefinition"("slug");

-- CreateIndex
CREATE INDEX "FestivalSchedule_enabled_startsAt_endsAt_idx" ON "FestivalSchedule"("enabled", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "FestivalSchedule_priority_idx" ON "FestivalSchedule"("priority");

-- CreateIndex
CREATE INDEX "ThemeHistory_createdAt_idx" ON "ThemeHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedPage_slug_key" ON "ManagedPage"("slug");

-- CreateIndex
CREATE INDEX "ManagedPageVersion_pageId_createdAt_idx" ON "ManagedPageVersion"("pageId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManagedPageVersion" ADD CONSTRAINT "ManagedPageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ManagedPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
