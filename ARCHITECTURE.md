# Architecture

## Layers

```
UI (Next.js App Router, React, Tailwind)
  ↓
API routes (src/app/api/**)      — thin: validate input, call server/, return JSON
  ↓
Server modules (src/server/**)   — the actual business logic
  ├─ storage/    StorageProvider abstraction
  ├─ db/         Prisma client
  ├─ auth/       current-user + ownership checks
  ├─ assets/     upload ingestion pipeline
  └─ validation/ input validation
  ↓
Prisma → Postgres
```

API routes are intentionally thin. They parse the request, call a server
module, and shape the response — they don't contain business logic
themselves. That logic lives in `src/server/*`, importable from anywhere
(API routes today; a BullMQ worker process in Phase 3 without duplicating
code).

## Why a scene graph, not "just re-render the image"

The central abstraction (see the product spec, section 53) is:

```
Raster Image → AI Understanding → Editable Scene Graph → Canvas Renderer
  → Human Editing → AI Editing → Export
```

`DesignVersion` + `Layer` *is* that scene graph. It's deliberately decoupled
from:

- **The canvas library.** Fabric.js (Phase 2) reads/writes this schema; if
  it's replaced later, the schema doesn't change.
- **The AI providers.** OCR/detection/segmentation/inpainting all populate
  `Layer` rows through the same shape regardless of provider — see
  `AI_PIPELINE.md`.

`DesignVersion` is immutable once created. Every AI operation or explicit
"save version" forks a new `DesignVersion` with new `Layer` rows rather than
mutating layers in place. This is what makes undo/redo and the version
history feature (section 26 of the spec) tractable instead of ad hoc —
"undo" is just "point the UI at the previous version," not a bespoke
diff/patch system.

## Storage abstraction

Every binary (original image, preview, mask, generated asset, export) is
referenced by a `storageKey` string on an `Asset` row — never stored in
Postgres. `StorageProvider` (`src/server/storage/StorageProvider.ts`) is the
only interface business logic depends on:

```ts
interface StorageProvider {
  putObject(input): Promise<string>;
  getObject(key): Promise<Buffer>;
  deleteObject(key): Promise<void>;
  getSignedReadUrl(key, expiresInSeconds?): Promise<string>;
  getSignedUploadUrl(key, expiresInSeconds?): Promise<string>;
}
```

`STORAGE_PROVIDER=local` (default) uses the filesystem so the whole app runs
without any cloud account. `STORAGE_PROVIDER=s3` switches to
`S3StorageProvider`, which works against AWS S3, Cloudflare R2, or Supabase
Storage — same interface, no call site changes. The S3 implementation is a
stub in Phase 1 (throws with a clear message) since wiring
`@aws-sdk/client-s3` wasn't needed to prove out Phase 1; it's a self-contained
follow-up.

## Ownership and security posture

`src/server/auth/getCurrentUser.ts` is a dev-only stub returning a single
user — there's no real session yet (Phase 7). Every route already calls
`assertProjectOwnership` (or the equivalent inline check) before touching
project data, so `projectId`/`assetId` values from the client are never
trusted blindly. When real auth lands, only this file changes; the
ownership-checking call sites stay the same.

## What Phase 1 deliberately stubs out

- **Canvas engine.** The editor route renders the uploaded preview as a
  static `<img>` inside the panel layout. Selection, drag, resize, rotate,
  and the Fabric.js integration are Phase 2.
- **Analysis pipeline / AI job queue.** No `AIJob` rows are created yet;
  there's no Redis/BullMQ worker process. The `AIJob` table exists in the
  schema so Phase 3 doesn't need a migration to introduce it.
- **Layer reconstruction.** Every project today is exactly one locked
  `Background` layer (the uploaded image) — this is the explicit fallback
  mode described in the spec (section 12/33), used honestly here because no
  reconstruction has run, not as a workaround.
