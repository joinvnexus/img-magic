# AI Pipeline (planned — Phase 3 / Phase 5)

Not implemented yet. This documents the shape Phase 3 will build to, so
Phase 1's schema and storage layer are already compatible with it.

## Provider interfaces

```ts
interface OCRProvider {
  analyze(image: Buffer): Promise<OCRResult>;
}
interface ObjectDetectionProvider {
  detect(image: Buffer): Promise<DetectedObject[]>;
}
interface SegmentationProvider {
  segment(image: Buffer, box: BoundingBox): Promise<MaskResult>;
}
interface InpaintingProvider {
  inpaint(image: Buffer, mask: Buffer): Promise<Buffer>;
}
interface ImageGenerationProvider {
  generate(prompt: string, context?: GenerationContext): Promise<Buffer>;
}
```

Each gets a `Mock*Provider` (deterministic sample output, simulated
latency, no network calls — this is what `AI_MODE=mock` selects) and one or
more real implementations behind the same interface, selected by env var,
mirroring `src/server/storage/index.ts`'s factory pattern.

## Pipeline

```
Upload (done — Phase 1)
   ↓
Create AIJob (type=ANALYSIS, status=QUEUED)
   ↓
Enqueue (Redis/BullMQ)
   ↓
Worker picks up job, updates status=PROCESSING + progress
   ↓
OCR → ObjectDetection → Segmentation → background reconstruction (inpainting
  where objects were extracted) → confidence scoring
   ↓
Write Layer rows against a new DesignVersion
   ↓
status=COMPLETED, project.status=READY
```

Frontend polls `AIJob.status`/`progress` (or subscribes via SSE/websocket —
TBD in Phase 3) and renders the step labels from spec section 6.

## Fallback behavior (already partially implemented in Phase 1)

If OCR fails, continue with object detection. If segmentation fails, keep
the object detection bounding box without a pixel mask. If full
reconstruction confidence is below threshold, keep the original image as a
locked background layer and add whatever editable overlays were detected
with confidence — this is exactly what every Phase 1 project looks like
today (locked background, no overlays, because no analysis has run), so the
editor UI already knows how to render this state.

## AI editing (erase / replace / background — Phase 5)

```
Selected Layer → generate/reuse mask → provider call → new Asset
  → new DesignVersion with that layer's sourceAssetId swapped
  → position/scale/rotation preserved from the previous version
```

Every AI edit becomes a new `DesignVersion` (never mutates a previous one),
which is also how it becomes an undo-able, and optionally named
(section 26), history entry for free.
