import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB
export const MIN_DIMENSION = 64;
export const MAX_DIMENSION = 8000;

export class ImageValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export interface ValidatedImage {
  mimeType: AllowedMimeType;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Validates an uploaded image by sniffing real file bytes — never trusts
 * the filename extension or the browser-supplied Content-Type header,
 * both of which are trivially spoofable.
 */
export async function validateImageBuffer(buffer: Buffer): Promise<ValidatedImage> {
  if (buffer.byteLength === 0) {
    throw new ImageValidationError("EMPTY_FILE", "Uploaded file is empty.");
  }

  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError(
      "FILE_TOO_LARGE",
      `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.`
    );
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime as AllowedMimeType)) {
    throw new ImageValidationError(
      "UNSUPPORTED_TYPE",
      "Only JPG, PNG, and WebP images are supported."
    );
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new ImageValidationError("CORRUPT_IMAGE", "The image file appears to be corrupt.");
  }

  const { width, height } = metadata;
  if (!width || !height) {
    throw new ImageValidationError("CORRUPT_IMAGE", "Could not read image dimensions.");
  }

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    throw new ImageValidationError(
      "IMAGE_TOO_SMALL",
      `Image must be at least ${MIN_DIMENSION}x${MIN_DIMENSION}px.`
    );
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new ImageValidationError(
      "IMAGE_TOO_LARGE",
      `Image must be at most ${MAX_DIMENSION}x${MAX_DIMENSION}px.`
    );
  }

  return {
    mimeType: detected.mime as AllowedMimeType,
    width,
    height,
    sizeBytes: buffer.byteLength,
  };
}
