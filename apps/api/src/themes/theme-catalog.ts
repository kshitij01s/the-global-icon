/** Built-in theme tokens (CSS custom properties without the `--` prefix for storage). */
export type ThemeTokens = Record<string, string>;

export type ThemeEffects = {
  snowfall?: boolean;
  festiveLights?: boolean;
  snowman?: boolean;
  christmasTree?: boolean;
  diyaGlow?: boolean;
  colourBurst?: boolean;
  hearts?: boolean;
  fireworks?: boolean;
  natureLeaves?: boolean;
  lanterns?: boolean;
  fog?: boolean;
  petals?: boolean;
  confetti?: boolean;
  crescentGlow?: boolean;
  pumpkins?: boolean;
  intensity?: 'subtle' | 'medium';
  speed?: number;
  opacity?: number;
  quantity?: number;
};

export type CatalogTheme = {
  slug: string;
  name: string;
  description: string;
  kind: 'LIBRARY' | 'FESTIVAL';
  festivalKey?: string;
  tokens: ThemeTokens;
  effects?: ThemeEffects;
};

const baseDark = (accent: string, accentBright: string, surface = '#05070b'): ThemeTokens => ({
  'color-midnight': surface,
  'color-navy': '#0b1426',
  'color-navy-2': '#11203b',
  'color-charcoal': '#181b21',
  'color-charcoal-2': '#23262e',
  'color-gold': accent,
  'color-gold-bright': accentBright,
  'color-gold-deep': '#9c7c47',
  'color-ivory': '#f5eedf',
  'color-ivory-2': '#ebe2cf',
  'color-paper': '#fcfaf5',
  'color-crimson': '#a3202f',
  'color-crimson-bright': '#cf3a49',
  'color-ink': '#12151c',
  'theme-mode': 'dark',
});

const baseLight = (accent: string, accentBright: string): ThemeTokens => ({
  'color-midnight': '#f7f4ec',
  'color-navy': '#efe8d8',
  'color-navy-2': '#e4dcc8',
  'color-charcoal': '#f3eee3',
  'color-charcoal-2': '#ebe4d4',
  'color-gold': accent,
  'color-gold-bright': accentBright,
  'color-gold-deep': '#8a6a3a',
  'color-ivory': '#1a1d24',
  'color-ivory-2': '#2a2e38',
  'color-paper': '#ffffff',
  'color-crimson': '#8e1c28',
  'color-crimson-bright': '#b8323f',
  'color-ink': '#12151c',
  'theme-mode': 'light',
});

export const THEME_CATALOG: CatalogTheme[] = [
  {
    slug: 'classic-light',
    name: 'Classic Light',
    description: 'Clean ivory and white editorial style.',
    kind: 'LIBRARY',
    tokens: baseLight('#9c7c47', '#c5a572'),
  },
  {
    slug: 'midnight-dark',
    name: 'Midnight Dark',
    description: 'Premium charcoal and midnight blue — default brand look.',
    kind: 'LIBRARY',
    tokens: baseDark('#c5a572', '#e3c997'),
  },
  {
    slug: 'royal-gold',
    name: 'Royal Gold',
    description: 'Dark surfaces with champagne gold accents.',
    kind: 'LIBRARY',
    tokens: { ...baseDark('#d4af37', '#f0d78c', '#0a0a0c'), 'color-navy': '#16120a' },
  },
  {
    slug: 'crimson-editorial',
    name: 'Crimson Editorial',
    description: 'Burgundy and elegant red for feature moments.',
    kind: 'LIBRARY',
    tokens: {
      ...baseDark('#c5a572', '#e3c997', '#14080c'),
      'color-navy': '#2a0f16',
      'color-crimson': '#8b1e2d',
      'color-crimson-bright': '#d64555',
    },
  },
  {
    slug: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Cool blues and neutral textures.',
    kind: 'LIBRARY',
    tokens: {
      ...baseDark('#7eb6d9', '#b8daf0', '#061018'),
      'color-navy': '#0a2438',
      'color-gold': '#7eb6d9',
      'color-gold-bright': '#b8daf0',
    },
  },
  {
    slug: 'emerald-luxury',
    name: 'Emerald Luxury',
    description: 'Deep green with warm gold.',
    kind: 'LIBRARY',
    tokens: {
      ...baseDark('#c5a572', '#e3c997', '#06140f'),
      'color-navy': '#0d2a20',
      'color-gold': '#c9a227',
    },
  },
  {
    slug: 'minimal-magazine',
    name: 'Minimal Magazine',
    description: 'Clean typography and subtle surfaces.',
    kind: 'LIBRARY',
    tokens: baseLight('#555555', '#888888'),
  },
  {
    slug: 'modern-technology',
    name: 'Modern Technology',
    description: 'Dark futuristic style with cool accents.',
    kind: 'LIBRARY',
    tokens: {
      ...baseDark('#5eead4', '#99f6e4', '#020617'),
      'color-navy': '#0f172a',
      'color-gold': '#5eead4',
      'color-gold-bright': '#99f6e4',
    },
  },
  {
    slug: 'autumn-edition',
    name: 'Autumn Edition',
    description: 'Warm orange, brown, and cream.',
    kind: 'LIBRARY',
    tokens: {
      ...baseDark('#d97706', '#fbbf24', '#1c1208'),
      'color-navy': '#2a1a0c',
      'color-ivory': '#fff7ed',
    },
  },
  {
    slug: 'spring-edition',
    name: 'Spring Edition',
    description: 'Fresh green and soft pastel accents.',
    kind: 'LIBRARY',
    tokens: {
      ...baseLight('#4d7c5a', '#86b891'),
      'color-midnight': '#f4faf5',
      'color-navy': '#e8f2ea',
    },
  },
  {
    slug: 'festival-christmas',
    name: 'Christmas',
    description: 'Winter white, evergreen, and festive gold with subtle snowfall.',
    kind: 'FESTIVAL',
    festivalKey: 'christmas',
    tokens: {
      ...baseDark('#c5a572', '#f0e6c8', '#0a1210'),
      'color-navy': '#12261c',
      'color-crimson': '#b91c1c',
      'color-crimson-bright': '#ef4444',
      'color-gold': '#d4af37',
    },
    effects: {
      snowfall: true,
      festiveLights: true,
      snowman: true,
      christmasTree: true,
      intensity: 'subtle',
    },
  },
  {
    slug: 'festival-diwali',
    name: 'Diwali',
    description: 'Warm golden glow and elegant festive lights.',
    kind: 'FESTIVAL',
    festivalKey: 'diwali',
    tokens: {
      ...baseDark('#f59e0b', '#fde68a', '#1a0f05'),
      'color-navy': '#2a1808',
      'color-gold': '#f59e0b',
    },
    effects: { diyaGlow: true, festiveLights: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-holi',
    name: 'Holi',
    description: 'Colourful powder-inspired accents.',
    kind: 'FESTIVAL',
    festivalKey: 'holi',
    tokens: {
      ...baseLight('#db2777', '#f472b6'),
      'color-midnight': '#fff1f8',
      'color-navy': '#fce7f3',
      'color-crimson': '#7c3aed',
    },
    effects: { colourBurst: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-halloween',
    name: 'Halloween',
    description: 'Dark purple and orange accents.',
    kind: 'FESTIVAL',
    festivalKey: 'halloween',
    tokens: {
      ...baseDark('#f97316', '#fdba74', '#0c0612'),
      'color-navy': '#1e1030',
      'color-crimson': '#7c2d12',
    },
    effects: { intensity: 'subtle' },
  },
  {
    slug: 'festival-new-year',
    name: 'New Year',
    description: 'Celebration lights for the year ahead.',
    kind: 'FESTIVAL',
    festivalKey: 'new-year',
    tokens: { ...baseDark('#e3c997', '#fff1c2', '#050510'), 'color-navy': '#101028' },
    effects: { fireworks: true, festiveLights: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-valentines',
    name: "Valentine's Day",
    description: 'Soft burgundy and heart-inspired accents.',
    kind: 'FESTIVAL',
    festivalKey: 'valentines',
    tokens: {
      ...baseDark('#e11d48', '#fb7185', '#1a0810'),
      'color-navy': '#2a1020',
      'color-crimson': '#be123c',
    },
    effects: { hearts: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-earth-day',
    name: 'Earth Day',
    description: 'Natural greens and environmental textures.',
    kind: 'FESTIVAL',
    festivalKey: 'earth-day',
    tokens: {
      ...baseDark('#65a30d', '#bef264', '#07140a'),
      'color-navy': '#12301a',
      'color-gold': '#84cc16',
    },
    effects: { natureLeaves: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-womens-day',
    name: "International Women's Day",
    description: 'Premium purple editorial accents.',
    kind: 'FESTIVAL',
    festivalKey: 'womens-day',
    tokens: {
      ...baseDark('#a855f7', '#d8b4fe', '#120818'),
      'color-navy': '#241038',
      'color-gold': '#c084fc',
    },
  },
  {
    slug: 'festival-independence-day-in',
    name: 'Independence Day (India)',
    description: 'Restrained tricolour-inspired accents.',
    kind: 'FESTIVAL',
    festivalKey: 'independence-day-in',
    tokens: {
      ...baseDark('#ff9933', '#ffcc80', '#0a120e'),
      'color-navy': '#0f2a1a',
      'color-crimson': '#ff671f',
      'color-gold': '#138808',
    },
  },
  {
    slug: 'festival-eid',
    name: 'Eid',
    description: 'Elegant greens and soft moonlight tones.',
    kind: 'FESTIVAL',
    festivalKey: 'eid',
    tokens: {
      ...baseDark('#c5a572', '#e8d5a3', '#071410'),
      'color-navy': '#0f2a22',
    },
    effects: { festiveLights: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-lunar-new-year',
    name: 'Lunar New Year',
    description: 'Crimson and gold celebration tones.',
    kind: 'FESTIVAL',
    festivalKey: 'lunar-new-year',
    tokens: {
      ...baseDark('#f59e0b', '#fde68a', '#1a0606'),
      'color-navy': '#3b0a0a',
      'color-crimson': '#dc2626',
    },
    effects: { festiveLights: true, lanterns: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-thanksgiving',
    name: 'Thanksgiving',
    description: 'Warm harvest amber and deep brown.',
    kind: 'FESTIVAL',
    festivalKey: 'thanksgiving',
    tokens: {
      ...baseDark('#d97706', '#fbbf24', '#1a1008'),
      'color-navy': '#2a1c10',
      'color-ivory': '#fff7ed',
    },
    effects: { natureLeaves: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-july-4',
    name: 'Independence Day (USA)',
    description: 'Navy, ivory, and restrained crimson accents.',
    kind: 'FESTIVAL',
    festivalKey: 'july-4',
    tokens: {
      ...baseDark('#93c5fd', '#dbeafe', '#060b18'),
      'color-navy': '#0c1a36',
      'color-crimson': '#b91c1c',
      'color-gold': '#f8fafc',
    },
    effects: { fireworks: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-ramadan',
    name: 'Ramadan',
    description: 'Deep emerald, midnight blue, and soft gold.',
    kind: 'FESTIVAL',
    festivalKey: 'ramadan',
    tokens: {
      ...baseDark('#c5a572', '#e8d5a3', '#061018'),
      'color-navy': '#0c2430',
      'color-gold': '#c9a227',
    },
    effects: { crescentGlow: true, festiveLights: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-sakura',
    name: 'Sakura Season',
    description: 'Soft blossom pinks and charcoal ink.',
    kind: 'FESTIVAL',
    festivalKey: 'sakura',
    tokens: {
      ...baseLight('#db2777', '#f9a8d4'),
      'color-midnight': '#fff5f8',
      'color-navy': '#fce7f3',
    },
    effects: { petals: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-st-patrick',
    name: "St Patrick's Day",
    description: 'Emerald greens with soft gold.',
    kind: 'FESTIVAL',
    festivalKey: 'st-patrick',
    tokens: {
      ...baseDark('#22c55e', '#86efac', '#06140c'),
      'color-navy': '#0d2a18',
      'color-gold': '#c9a227',
    },
  },
  {
    slug: 'festival-oktoberfest',
    name: 'Oktoberfest',
    description: 'Warm Bavarian amber and deep blue.',
    kind: 'FESTIVAL',
    festivalKey: 'oktoberfest',
    tokens: {
      ...baseDark('#f59e0b', '#fde68a', '#0c1220'),
      'color-navy': '#1e3a5f',
    },
  },
  {
    slug: 'festival-republic-day-in',
    name: 'Republic Day (India)',
    description: 'Tricolour-inspired restrained accents.',
    kind: 'FESTIVAL',
    festivalKey: 'republic-day-in',
    tokens: {
      ...baseDark('#ff9933', '#ffcc80', '#0a120e'),
      'color-navy': '#0f2a1a',
      'color-crimson': '#ff671f',
      'color-gold': '#138808',
    },
  },
  {
    slug: 'festival-ganesh',
    name: 'Ganesh Chaturthi',
    description: 'Saffron, marigold, and deep indigo.',
    kind: 'FESTIVAL',
    festivalKey: 'ganesh',
    tokens: {
      ...baseDark('#f59e0b', '#fbbf24', '#120a18'),
      'color-navy': '#2a1840',
      'color-crimson': '#ea580c',
    },
    effects: { festiveLights: true, intensity: 'subtle' },
  },
  {
    slug: 'festival-navratri',
    name: 'Navratri',
    description: 'Jewel tones and celebratory gold.',
    kind: 'FESTIVAL',
    festivalKey: 'navratri',
    tokens: {
      ...baseDark('#eab308', '#fde047', '#140818'),
      'color-navy': '#2d1040',
      'color-crimson': '#c026d3',
    },
    effects: { colourBurst: true, intensity: 'subtle' },
  },
  {
    slug: 'editorial-ivory',
    name: 'Editorial Ivory',
    description: 'Premium light editorial paper tones.',
    kind: 'LIBRARY',
    tokens: baseLight('#9c7c47', '#c5a572'),
  },
  {
    slug: 'luxury-black',
    name: 'Luxury Black',
    description: 'Near-black surfaces with champagne accents.',
    kind: 'LIBRARY',
    tokens: { ...baseDark('#d4af37', '#f0d78c', '#050505'), 'color-navy': '#111111' },
  },
  {
    slug: 'premium-gold',
    name: 'Premium Gold',
    description: 'Gold-forward luxury magazine look.',
    kind: 'LIBRARY',
    tokens: { ...baseDark('#d4af37', '#ffe6a3', '#0c0a06'), 'color-navy': '#1a1508' },
  },
];

export function catalogBySlug(slug: string): CatalogTheme | undefined {
  return THEME_CATALOG.find((t) => t.slug === slug);
}
