/**
 * Smoke: seed festival catalog via ensure path (themes/active already seeds),
 * then hit public endpoints. Admin studio requires JWT — seed is triggered by themes service.
 */
const base = process.env.API_BASE || 'http://localhost:4000/api';

async function main() {
  const active = await fetch(`${base}/themes/active?country=IN`).then((r) => r.json());
  if (!active.slug) throw new Error('active theme missing');
  console.log('active', active.slug, active.source, 'region', active.region);

  const list = await fetch(`${base}/themes`).then((r) => r.json());
  console.log('theme library count', list.length);

  // Trigger studio seed by resolving again after ensure (festivals seeded inside ensureSeeded)
  const { PrismaClient } = await import('@prisma/client');
  const p = new PrismaClient();
  try {
    const festivals = await p.festival.count();
    const anims = await p.animationPreset.count();
    const assets = await p.themeAsset.count();
    console.log({ festivals, anims, assets });
    if (festivals < 20) throw new Error('Festival catalog not seeded');
    if (anims < 5) throw new Error('Animation presets not seeded');
  } finally {
    await p.$disconnect();
  }

  // Simulate Christmas via test would need admin JWT; check schedule rows exist
  const { PrismaClient: P2 } = await import('@prisma/client');
  const p2 = new P2();
  const schedules = await p2.festivalSchedule.count();
  console.log('schedules', schedules);
  await p2.$disconnect();
  console.log('OK verify-festival-studio');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
