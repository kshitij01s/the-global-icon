# Cursor frontend + Free LLM Gateway setup (THE GLOBAL ICON)

This project uses **Cursor**, not Claude Code. The uploaded Free LLM Gateway PDF and the UI/UX Pro Max catalogs are adapted accordingly.

## A. UI / UX Pro Max (84+ styles, 192 palettes, 74 fonts)

Installed for Cursor in this repo:

```text
.cursor/skills/ui-ux-pro-max/
```

Also installed companion skills: `brand`, `design`, `design-system`, `ui-styling`, `slides`, `banner-design`.

### Re-install / refresh

```powershell
cd "D:\Magazine Project"
. .\scripts\use-node.ps1
npm install -g ui-ux-pro-max-cli
uipro init --ai cursor
```

### Verify catalogs

```powershell
python .cursor/skills/ui-ux-pro-max/scripts/search.py "digital magazine editorial" --design-system -p "THE GLOBAL ICON"
```

Expect offline recommendations (style, palette, font pairing, checklist). No API keys required.

### How Cursor should use it

- Skill auto-applies on UI work; project rule: `.cursor/rules/tgi-frontend-generative.mdc`.
- Prefer catalog search → then implement against existing TGI brand tokens.
- Motion lab (safe sandbox): http://localhost:5173/lab/motion

## B. Motion / 3D stack (public-web)

| Library | Role |
|---------|------|
| `framer-motion` | Existing page / nav animation |
| `gsap` + `@gsap/react` | Scroll storytelling |
| `three` + `@react-three/fiber` + `@react-three/drei` | Optional immersive 3D |

Helpers: `apps/public-web/src/lib/motion.ts`  
Lab UI: `apps/public-web/src/experience/MotionLab.tsx` → route `/lab/motion`

## C. Free LLM Gateway (from PDF) — Cursor adaptation

PDF tools: **FreeLLMAPI** (`localhost:3001`) and **OmniRoute** (`localhost:20128`).

Claude-specific commands from the PDF (`npx freellmapi setup-claude`, `omniroute run claude`) do **not** apply to Cursor Desktop.

### Cursor equivalent approach

1. Cursor already provides agent models via your Cursor account — use that for Mag Project work.
2. Optional local gateway is for **prototyping other CLIs** (aider, scripts), not for shipping Mag Project prompts that contain secrets or user data.
3. If you still install a gateway for personal experiments:
   - Dev machine only.
   - Your own provider keys; one account per provider (no quota farming).
   - Never route Mag Project `.env`, JWT secrets, reader PII, or client content through free tiers.
   - Prefer OmniRoute smoke: `npm i -g omniroute` then open `http://localhost:20128` — only after reading its ToS notes in the PDF.

### Security priority for THE GLOBAL ICON

- Keep Nest JWT + httpOnly refresh cookies as the only auth path.
- Do not put gateway URLs into the Vite public bundle.
- Public users must never receive stack traces / admin inbox technical errors (already enforced by API Inbox).

## D. Suggested generative workflow

1. Ask Cursor: “Design a scroll chapter for Magazines using UI UX Pro Max + GSAP, keep TGI gold/navy.”
2. Preview on `/lab/motion` or a feature branch page.
3. Promote patterns into real routes only after reduced-motion + mobile checks.
4. Keep Admin/Angular and Nest untouched unless the change is explicitly backend.
