import { nanoid } from "nanoid";
import sharp from "sharp";
import { prisma } from "@/server/db";
import { getStorageProvider } from "@/server/storage";
import { validateImageBuffer } from "@/server/validation/image";

const PREVIEW_MAX_DIMENSION = 2000; // used by the canvas editor — never load full-res into React
const THUMBNAIL_MAX_DIMENSION = 400; // used by the project dashboard

export interface IngestResult {
  projectId: string;
  originalAssetId: string;
  previewAssetId: string;
  thumbnailAssetId: string;
  width: number;
  height: number;
}

/**
 * Upload → Create Project pipeline (section 5 / Phase 1).
 *
 * The original file is written once and never modified again — every
 * later stage (analysis, editing, export) derives new assets, it never
 * overwrites this one. Internal asset ids/keys are generated server-side;
 * the client-supplied filename is used only as a display label.
 */
export async function ingestUpload(params: {
  userId: string;
  displayName: string;
  buffer: Buffer;
}): Promise<IngestResult> {
  const { userId, displayName, buffer } = params;

  const validated = await validateImageBuffer(buffer);
  const storage = getStorageProvider();

  const project = await prisma.project.create({
    data: {
      userId,
      name: displayName.replace(/\.[^/.]+$/, "") || "Untitled project",
      status: "DRAFT",
    },
  });

  const assetGroupId = nanoid(12);
  const basePath = `projects/${project.id}/${assetGroupId}`;

  // 1. Original — immutable, full resolution, exact bytes as uploaded.
  const originalKey = `${basePath}/original.${extensionFor(validated.mimeType)}`;
  await storage.putObject({ key: originalKey, body: buffer, contentType: validated.mimeType });

  const originalAsset = await prisma.asset.create({
    data: {
      projectId: project.id,
      kind: "ORIGINAL",
      storageKey: originalKey,
      mimeType: validated.mimeType,
      width: validated.width,
      height: validated.height,
      sizeBytes: validated.sizeBytes,
    },
  });

  // 2. Preview — capped resolution, what the canvas editor actually loads.
  const previewBuffer = await sharp(buffer)
    .resize({ width: PREVIEW_MAX_DIMENSION, height: PREVIEW_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const previewKey = `${basePath}/preview.png`;
  await storage.putObject({ key: previewKey, body: previewBuffer, contentType: "image/png" });
  const previewMeta = await sharp(previewBuffer).metadata();

  const previewAsset = await prisma.asset.create({
    data: {
      projectId: project.id,
      kind: "PREVIEW",
      storageKey: previewKey,
      mimeType: "image/png",
      width: previewMeta.width ?? validated.width,
      height: previewMeta.height ?? validated.height,
      sizeBytes: previewBuffer.byteLength,
    },
  });

  // 3. Thumbnail — dashboard cards.
  const thumbBuffer = await sharp(buffer)
    .resize({ width: THUMBNAIL_MAX_DIMENSION, height: THUMBNAIL_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const thumbKey = `${basePath}/thumbnail.png`;
  await storage.putObject({ key: thumbKey, body: thumbBuffer, contentType: "image/png" });
  const thumbMeta = await sharp(thumbBuffer).metadata();

  const thumbnailAsset = await prisma.asset.create({
    data: {
      projectId: project.id,
      kind: "THUMBNAIL",
      storageKey: thumbKey,
      mimeType: "image/png",
      width: thumbMeta.width ?? validated.width,
      height: thumbMeta.height ?? validated.height,
      sizeBytes: thumbBuffer.byteLength,
    },
  });

  return {
    projectId: project.id,
    originalAssetId: originalAsset.id,
    previewAssetId: previewAsset.id,
    thumbnailAssetId: thumbnailAsset.id,
    width: validated.width,
    height: validated.height,
  };
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}
