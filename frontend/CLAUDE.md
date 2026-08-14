@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
- Next.js 16.2.11 (App Router only — no `pages/`), React 19, TypeScript (strict mode), Tailwind CSS v4, ESLint 9 (flat config, `eslint-config-next`).
- Package manager: pnpm.
- No `src/` directory — App Router files live at the repo root; the `@/*` path alias maps to the repo root, not `src/`.

## Next.js 16 breaking changes confirmed in this repo
- `middleware.ts` no longer exists — it's been renamed to `proxy.ts` (exported as `proxy`). See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- Caching has shifted to a "Cache Components" model — read `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` before writing any fetch/caching logic.

## UI conventions
- **Content text is black.** Headings, paragraphs, spans, list items — any text that carries content — must use `text-black`. Do not use `text-foreground`, opacity modifiers (`text-black/70`), or gray shades to soften it. Only use a different color when the user explicitly names one for that element.
- This does not apply to text whose color is dictated by its component's variant (e.g. the white label on a `primary` `ButtonGeneric`).

## Commands
- `pnpm dev` / `pnpm build` / `pnpm start` / `pnpm lint`
- No test framework and no formatter (Prettier/Biome) are configured — don't assume `pnpm test` or a format script exists.
