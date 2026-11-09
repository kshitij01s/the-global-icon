# Content protection — THE GLOBAL ICON

## What CIO Today does (observed)

On https://theciotoday.com/magazines-2026/ the site runs a WordPress-style inline script that:

- Disables right-click (`contextmenu`)
- Blocks drag-and-drop of images
- Blocks `copy` / `cut` / `paste` / `print` events
- Blocks F12 and Ctrl+Shift+I/K
- Blocks Ctrl+U (view source)
- Applies widespread `user-select: none`

They also use flipbook / PDF viewer plugins for magazines.

## What we implemented

Public React app (`ContentProtection` + CSS):

| Control | Scope |
|---------|--------|
| Right-click block | Site-wide (except `/lab/*`) |
| Copy / cut / paste block | Non-editable content |
| Drag / drop block | Non-editable content |
| Ctrl/Cmd+S, Ctrl/Cmd+P | Magazines / reader paths |
| F12 / Ctrl+Shift+I/J/C/K / Ctrl+U | Site-wide |
| `user-select: none` | Site-wide; inputs/textareas remain selectable |
| Print stylesheet blanking | Protected pages |

Forms (Sign In, Contact, newsletter) still allow typing and paste because handlers ignore `INPUT` / `TEXTAREA` / `SELECT`.

## Honest limits

- **Screenshots** (PrintScreen, phone camera, OS snipping) cannot be stopped by a website.
- Determined users with DevTools can still inspect network/PDF streams.
- Real protection remains: JWT + RBAC, private PDF streaming, no filesystem paths in responses, Helmet, throttling, production CORS, and no Swagger in production.

## API hardening added for deploy

- Swagger `/docs` disabled when `NODE_ENV=production`
- Stricter Helmet (`referrerPolicy`, `X-Frame-Options: deny`)
- Production requires non-empty `CORS_ORIGINS`
