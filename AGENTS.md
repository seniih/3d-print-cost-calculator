<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- 3D Print Cost Calculator. Next.js 16 (App Router, `cacheComponents`), Prisma 7 + PostgreSQL, Better Auth, next-intl, Tailwind 4.
- All pages live under `src/app/[locale]/` (root layout there; `locale` is a root param read via `next/root-params`). No `src/app/layout.tsx`.
- Anything that reads cookies/headers/env at request time must sit behind `<Suspense>` (Cache Components).
- Authorization goes through `getViewer()` in `src/lib/auth/viewer.ts`. Never trust a user id from the client.
- `getEnv()`, `db()` and `auth()` are lazy so `next build` needs no secrets or database.
- Every user-facing string goes in `messages/en.json` and `messages/tr.json`.
- Money is `Decimal(12,4)` in the user's single currency (`UserSettings.currency`).
