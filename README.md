# Reframe — AI image-to-editable design editor

Turn a flattened raster image (menu, poster, flyer, product shot, screenshot…)
into an AI-reconstructed, editable design. See `ARCHITECTURE.md` for the full
system design and `DEVELOPMENT.md` for the phased roadmap this repo follows.

**Status: Phase 1 (Foundation) complete.** Upload → project creation →
storage → dashboard → a basic editor route that shows the image as a locked
background layer. No AI analysis yet — that's Phase 3. See "What's built" below.

## Quick start

```bash
# Install dependencies
npm install
# Copy template env (do NOT commit your .env with secrets)
cp .env.example .env

# Generate Prisma client (this downloads Prisma engines once)
npm run db:generate

# Push schema to your running Postgres (or use prisma migrate when ready)
npm run db:push

# Run dev server
npm run dev
```

Open http://localhost:3000, drop in an image, and you'll land on the editor
route for that project.

### A note on `prisma generate`

This repo was built inside a sandboxed environment whose network allowlist
didn't include `binaries.prisma.sh`, so `prisma generate` couldn't complete
there — every other check (`eslint`, `tsc --noEmit` against hand-written
types) passed clean. This is a one-time engine download; it works normally
on a developer machine, CI, or other networked environments. Run
`npm run db:generate` once you have that, and `npm run build` will pass.

If `prisma generate` fails due to network restrictions, see `DEVELOPMENT.md`
for troubleshooting and alternative commands (for example `npm run db:push`).

### Running tests and CI

This repository includes unit tests using Vitest and a GitHub Actions CI
workflow that runs linting, tests, and TypeScript checks on PRs to `main`.

- Run tests locally: `npm test` (uses Vitest)
- CI: `.github/workflows/ci.yml` — runs `npm ci`, `npm run lint`, `npm test`,
  and `npx tsc --noEmit` on pushes and PRs to `main`.

### Database

You need a Postgres instance reachable at `DATABASE_URL`. Easiest local
option:

```bash
docker run -d --name reframe-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

### No AI keys needed yet

`AI_MODE=mock` is the default and Phase 1 doesn't call any AI provider —
uploads are stored and shown as-is. Real providers get wired in Phase 3/5
behind provider interfaces (see `AI_PIPELINE.md` for the planned shape).

## What's built (Phase 1)

- Upload with real content-sniffed validation (never trusts filename/MIME header)
- Original image stored immutably; preview + thumbnail derived from it
- `StorageProvider` abstraction: `LocalStorageProvider` (default, filesystem)
  and a stubbed `S3StorageProvider` (S3/R2/Supabase-compatible, not yet wired)
- Prisma schema for the full data model (`User`, `Project`, `Asset`, `Design`,
  `DesignVersion`, `Layer`, `AIJob`, `Export`)
- Project dashboard (drag-drop upload, project grid)
- Editor route shell (toolbar / tools / canvas / properties / layers panels)
  showing the uploaded image as a single locked "Background" layer — the
  documented fallback behavior for when no reconstruction has run
- Dev-only auth stub (`src/server/auth/getCurrentUser.ts`) with real
  ownership checks already wired through every route, so swapping in real
  auth in Phase 7 doesn't require touching authorization logic elsewhere

## What's intentionally not built yet

Canvas engine / selection / transforms (Phase 2), OCR/detection/segmentation
pipeline (Phase 3), background reconstruction & fallback confidence scoring
(Phase 4), AI erase/replace/background editing (Phase 5), high-res export
(Phase 6), real auth/billing/credits (Phase 7). See `DEVELOPMENT.md`.

## Project structure

```
prisma/schema.prisma          data model
src/server/storage/           StorageProvider abstraction (local + s3 stub)
src/server/db/                Prisma client singleton
src/server/auth/               dev-mode user + ownership checks
src/server/assets/             upload → validate → store → derive preview/thumbnail
src/server/validation/         image content validation
src/app/api/                   upload, projects, project detail, asset serving
src/app/                       dashboard + editor route
src/components/                UI: Button, UploadDropzone, ProjectCard, EditorShell
```
