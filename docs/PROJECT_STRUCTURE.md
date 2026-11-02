# Project structure — THE GLOBAL ICON

```text
D:\Magazine Project
├── apps/
│   ├── api/                 # NestJS + Prisma + PostgreSQL API (:4000)
│   ├── public-web/          # React + Vite public site (:5173)
│   └── admin-dashboard/     # Angular admin console (:4200)
├── docs/                    # Architecture, API, themes, verification
├── storage/development-only/# Local media (PDFs gitignored; covers may be tracked)
├── publications/            # Legacy Django app (preserved)
├── templates/               # Legacy Django templates
├── static/                  # Legacy static assets
├── package.json             # Workspace scripts (dev:api / dev:web / dev:admin)
├── README.md
├── README-MODERN.md
├── CONTRIBUTING.md
└── LICENSE
```

## Key modules (modern)

| Path | Purpose |
|------|---------|
| `apps/api/src/themes/` | Theme catalog, active resolution, festival schedules |
| `apps/api/src/admin/` | Magazines, pages CMS, announcements, themes admin |
| `apps/public-web/src/lib/theme.tsx` | Applies design tokens + reader preference |
| `apps/public-web/src/components/FestivalEffects.tsx` | Lightweight festival decorations |
| `apps/admin-dashboard/src/app/pages/themes.component.ts` | Appearance & Themes console |
| `apps/admin-dashboard/src/app/pages/pages-editor.component.ts` | Webpage CMS editor |

## Theme priority

1. Manual Super Admin override  
2. Active festival schedule (server clock)  
3. Global default theme  
4. Reader light/dark/system preference (client)
