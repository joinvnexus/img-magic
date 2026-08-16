# Development

## Phases

Matches the product spec's phased plan.

- [x] **Phase 1 — Foundation.** Project/asset models, upload, storage,
      dashboard, basic editor route, env config. *(this repo)*
- [ ] **Phase 2 — Canvas engine.** Fabric.js integration, layers, selection,
      transform, zoom/pan, undo/redo, autosave.
- [ ] **Phase 3 — AI analysis.** Job system, OCR/detection/segmentation
      abstractions + mock providers, upload → analysis job → layer JSON → editor.
- [ ] **Phase 4 — Reconstruction.** Masks, transparent objects, background
      handling, text reconstruction, confidence scores, fallback mode.
- [ ] **Phase 5 — AI editing.** Erase, replace, background, custom prompt,
      provider abstraction, job tracking, usage tracking.
- [ ] **Phase 6 — Export.** PNG/JPG/WebP, high-resolution server-side render.
- [ ] **Phase 7 — SaaS.** Real auth, project ownership via sessions, usage
      limits, credits, billing.

## Local setup

See `README.md` Quick Start. Summary:

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

## Verification run for Phase 1

```
npx eslint .        → 0 errors, 5 expected warnings (intentionally-unused
                       params in the stubbed S3StorageProvider)
npx tsc --noEmit     → 0 errors
npx prisma generate  → blocked in restricted sandboxes where `binaries.prisma.sh`
                       is unreachable; see "Prisma generate troubleshooting" below
npm run build        → not run here for the same reason; will pass once
                       `prisma generate` (or `npm run db:generate`) succeeds, since
                       typecheck is already clean
```

Run these again after `prisma generate` succeeds in your environment to get a
full, unblocked build.

### Prisma generate troubleshooting

If `npx prisma generate` (or `npm run db:generate`) fails with an error about
`binaries.prisma.sh` or a download/network issue, try the following:

1. Ensure internet access to `https://binaries.prisma.sh` is allowed from your
   environment (corporate proxies / dev sandbox allowlists commonly block it).

2. Use a developer machine with normal network access and run:

```bash
npm run db:generate
```

This downloads the Prisma engines once and caches them in `node_modules`.

3. If you cannot allow direct access to binaries.prisma.sh in your environment,
   you can run database-forward commands that do not require the engines, for
   example using `prisma db push` to sync the schema to a running Postgres:

```bash
# start a local Postgres (Docker) if you don't have one
docker run -d --name reframe-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# generate client (preferred) or skip and use db push to create tables
npm run db:generate || echo "db:generate failed; continuing with db:push"
npm run db:push
```

4. CI / reproducible environments: cache `node_modules/.prisma` between runs so
   the generated binaries are available to subsequent jobs.

5. If your environment blocks external downloads entirely, run `prisma generate`
   on a networked machine and copy the resulting `node_modules/.prisma` and
   `node_modules/@prisma` artifacts into the target environment (advanced).

If none of the above are possible, `prisma`-dependent steps (build/test) will
remain blocked in that environment; development and CI should be performed on
machines with normal outbound access for the initial `prisma generate` step.

## Known limitations (Phase 1 scope)

- No canvas engine — the editor shows the image as a locked background layer.
- No AI provider calls — nothing in `AI_MODE=mock` is wired to a queue yet;
  there's no worker process.
- Auth is a single dev user (`src/server/auth/getCurrentUser.ts`), not real
  sessions.
- `S3StorageProvider` is a typed stub, not a working implementation.

## Next session starting point

Phase 2: pull in Fabric.js, replace the `<img>` in `EditorShell` with a
canvas that reads/writes `Layer` rows (there's exactly one `Background`
layer per project today, which is a fine first case to render/select/lock),
add Zustand for editor-local state, and wire undo/redo + autosave against
`DesignVersion`.
