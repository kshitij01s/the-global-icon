-- Festival Theme Studio: catalog, templates, assets, animation presets, schedule regions, test mode

ALTER TABLE "AppearanceSettings" ADD COLUMN IF NOT EXISTS "allowVisitorRegionSelect" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppearanceSettings" ADD COLUMN IF NOT EXISTS "schedulerTestAsOf" TIMESTAMP(3);

ALTER TABLE "FestivalSchedule" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "FestivalSchedule" ADD COLUMN IF NOT EXISTS "countryCode" TEXT;
ALTER TABLE "FestivalSchedule" ADD COLUMN IF NOT EXISTS "regionCode" TEXT;
ALTER TABLE "FestivalSchedule" ADD COLUMN IF NOT EXISTS "festivalId" TEXT;

CREATE TABLE IF NOT EXISTS "Festival" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "countryCode" TEXT NOT NULL,
    "regionCode" TEXT,
    "continent" TEXT,
    "culturalCategory" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "calendarBasis" TEXT NOT NULL DEFAULT 'GREGORIAN',
    "dateSource" TEXT,
    "dateVerified" BOOLEAN NOT NULL DEFAULT false,
    "defaultThemeSlug" TEXT,
    "heroImageKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "sampleStartMonth" INTEGER,
    "sampleStartDay" INTEGER,
    "sampleEndMonth" INTEGER,
    "sampleEndDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Festival_slug_key" ON "Festival"("slug");
CREATE INDEX IF NOT EXISTS "Festival_countryCode_isActive_idx" ON "Festival"("countryCode", "isActive");
CREATE INDEX IF NOT EXISTS "Festival_culturalCategory_idx" ON "Festival"("culturalCategory");

CREATE TABLE IF NOT EXISTS "ThemeTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "festivalId" TEXT,
    "countryCode" TEXT,
    "regionCode" TEXT,
    "baseThemeSlug" TEXT,
    "publishedSlug" TEXT,
    "tokens" JSONB NOT NULL,
    "effects" JSONB,
    "layout" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ThemeTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ThemeTemplate_slug_key" ON "ThemeTemplate"("slug");
CREATE INDEX IF NOT EXISTS "ThemeTemplate_status_updatedAt_idx" ON "ThemeTemplate"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "ThemeTemplate_festivalId_idx" ON "ThemeTemplate"("festivalId");

CREATE TABLE IF NOT EXISTS "ThemeTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "note" TEXT,
    "tokens" JSONB NOT NULL,
    "effects" JSONB,
    "layout" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThemeTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ThemeTemplateVersion_templateId_createdAt_idx" ON "ThemeTemplateVersion"("templateId", "createdAt");

CREATE TABLE IF NOT EXISTS "ThemeAsset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "festivalKey" TEXT,
    "countryCode" TEXT,
    "mimeType" TEXT,
    "urlOrPath" TEXT NOT NULL,
    "meta" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ThemeAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ThemeAsset_key_key" ON "ThemeAsset"("key");
CREATE INDEX IF NOT EXISTS "ThemeAsset_category_isActive_idx" ON "ThemeAsset"("category", "isActive");
CREATE INDEX IF NOT EXISTS "ThemeAsset_festivalKey_idx" ON "ThemeAsset"("festivalKey");

CREATE TABLE IF NOT EXISTS "AnimationPreset" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "festivalKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnimationPreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnimationPreset_slug_key" ON "AnimationPreset"("slug");

CREATE INDEX IF NOT EXISTS "FestivalSchedule_countryCode_enabled_idx" ON "FestivalSchedule"("countryCode", "enabled");
CREATE INDEX IF NOT EXISTS "FestivalSchedule_status_idx" ON "FestivalSchedule"("status");

DO $$ BEGIN
  ALTER TABLE "FestivalSchedule" ADD CONSTRAINT "FestivalSchedule_festivalId_fkey"
    FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ThemeTemplate" ADD CONSTRAINT "ThemeTemplate_festivalId_fkey"
    FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ThemeTemplateVersion" ADD CONSTRAINT "ThemeTemplateVersion_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ThemeTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
