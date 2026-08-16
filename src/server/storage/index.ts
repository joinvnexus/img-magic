import { LocalStorageProvider } from "./LocalStorageProvider";
import { S3StorageProvider } from "./S3StorageProvider";
import type { StorageProvider } from "./StorageProvider";

export type { StorageProvider, PutObjectInput } from "./StorageProvider";

let cached: StorageProvider | null = null;

/**
 * Single entry point the rest of the app uses to get a storage provider.
 * This is the only place that reads storage-related env vars — everything
 * else depends on the StorageProvider interface.
 */
export function getStorageProvider(): StorageProvider {
  if (cached) return cached;

  const kind = process.env.STORAGE_PROVIDER ?? "local";

  if (kind === "local") {
    cached = new LocalStorageProvider(process.env.STORAGE_LOCAL_ROOT ?? "./.local-storage");
    return cached;
  }

  if (kind === "s3") {
    const endpoint = process.env.STORAGE_ENDPOINT;
    const bucket = process.env.STORAGE_BUCKET;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "STORAGE_PROVIDER=s3 requires STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY"
      );
    }
    cached = new S3StorageProvider({ endpoint, bucket, accessKeyId, secretAccessKey });
    return cached;
  }

  throw new Error(`Unknown STORAGE_PROVIDER: ${kind}`);
}
