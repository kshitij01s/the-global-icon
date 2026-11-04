# UI Bug Fix Report

Date: 2026-11-04

## Horizontal scrolling

**Cause:** Sticky header packed brand + many `nowrap` nav links + region select + theme + RSS + Sign in from `xl` breakpoint; Contact globe used `absolute -right-24`.

**Fix:** Desktop primary nav starts at `2xl`; compact icon controls; `overflow-x: clip` on `html`/`body`/`#root`; Contact globe constrained inside aside.

## Header / navigation

- Slimmer brand mark and header height.
- Editions moved under Magazines mega (still in mobile nav).
- Staff-only **Admin** link to Angular console.
- Theme + RSS available in mobile drawer.
- Single hamburger below `2xl` (no desktop duplicate menu).

## Light / Dark / System

**Cause:** Reader mode overwrote CSS variables without restoring brand tokens when switching back.

**Fix:** `applyReaderMode` always re-applies `active.tokens` first; System listens to `prefers-color-scheme`; distinct icons (Sun / Moon / Monitor).

## RSS

- Header / mobile / footer link to `GET /api/rss/articles.xml`.
- `<link rel="alternate" type="application/rss+xml">` in `index.html`.

## Removed / clarified nonfunctional claims

- Homepage no longer claims bookmark library that is not productized.
- Sign In documents staff redirect behavior; local seed hint only under `import.meta.env.DEV`.
