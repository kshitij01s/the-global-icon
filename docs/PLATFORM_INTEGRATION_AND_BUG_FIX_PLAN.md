# Platform Integration & Bug Fix Plan

Date: 2026-11-04 · THE GLOBAL ICON

## Priority issues

| # | Issue | Root cause | Fix |
|---|-------|------------|-----|
| P0 | Staff login on `:5173` never opens Admin | SignIn only does same-origin `navigate()` | Role-aware hard redirect to `VITE_ADMIN_URL` |
| P0 | Admin does not adopt React session | `AuthService.initialize()` skips cookie refresh when localStorage empty | Always attempt `/auth/refresh` on boot |
| P0 | Header horizontal overflow | Desktop shows 9 nav links + region + theme + RSS + Sign in with `nowrap` | Slim nav; overflow menu; `overflow-x: clip` on body |
| P1 | Light/Dark unreliable | Reader mode mutates CSS vars without restoring tokens | Re-apply `active.tokens` before reader overrides |
| P1 | Theme/RSS missing on mobile | Controls only in `xl` desktop bar | Mirror in mobile drawer |
| P1 | No staff entry point on public site | No Admin console link | Show for authenticated staff only |
| P2 | Dev accounts unclear from public UI | Seed file exists but not documented on Sign In | Dev-only collapsible note (no production passwords in source) |
| P2 | RSS appears decorative | Link is correct; needs head discovery + clearer affordance | Ensure `<link rel="alternate">` + working header link |

## Architecture (preserve)

- React `:5173` + Angular `:4200` + Nest `:4000`
- Shared auth: Bearer access (memory/localStorage) + httpOnly `tgi_refresh` cookie on API host
- No second auth system; optional one-time handoff for harder redirects

## Test cases

1. Public user login → stays on React home.
2. Admin login from React → lands on Angular dashboard.
3. Super Admin login from React → Angular Super Admin capabilities.
4. Direct `:4200` without session → login.
5. Theme Light/Dark/System toggles and persists.
6. No page-level horizontal scrollbar at 1366 / 768 / 390.
7. RSS opens `/api/rss/articles.xml`.
8. CMS publish on Angular reflects on React.
