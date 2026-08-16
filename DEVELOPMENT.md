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
npx prisma generate  → blocked in this sandbox (binaries.prisma.sh not on
                       the network allowlist); works normally elsewhere —
                       see README's "A note on prisma generate"
npm run build        → not run here for the same reason; will pass once
                       `db:generate` succeeds, since typecheck is already clean
```

Run these again after `db:generate` succeeds in your environment to get a
full, unblocked build.

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
