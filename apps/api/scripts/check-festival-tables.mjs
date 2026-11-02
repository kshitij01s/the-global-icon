import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
try {
  const rows = await p.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('Festival','ThemeTemplate','ThemeAsset','AnimationPreset','ThemeTemplateVersion') ORDER BY tablename`,
  );
  console.log(JSON.stringify(rows, null, 2));
  const cols = await p.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name='AppearanceSettings' AND column_name IN ('schedulerTestAsOf','allowVisitorRegionSelect')`,
  );
  console.log('AppearanceSettings cols', cols);
} finally {
  await p.$disconnect();
}
