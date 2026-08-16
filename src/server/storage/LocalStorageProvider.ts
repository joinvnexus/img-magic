import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { dirname, join, normalize, resolve } from "path";
import type { PutObjectInput, StorageProvider } from "./StorageProvider";

/**
 * Stores objects on the local filesystem under STORAGE_LOCAL_ROOT.
 * Used when STORAGE_PROVIDER=local (the default for development and for
 * AI_MODE=mock). Never used in production — swap to S3StorageProvider via
 * the STORAGE_PROVIDER env var.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private resolveKeyPath(key: string): string {
    // Prevent path traversal — a malicious/garbled key must never escape root.
    const target = normalize(join(this.root, key));
    if (!target.startsWith(this.root)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return target;
  }

  async putObject({ key, body }: PutObjectInput): Promise<string> {
    const path = this.resolveKeyPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return key;
  }

  async getObject(key: string): Promise<Buffer> {
    const path = this.resolveKeyPath(key);
    return readFile(path);
  }

  async deleteObject(key: string): Promise<void> {
    const path = this.resolveKeyPath(key);
    await unlink(path).catch(() => undefined);
  }

  async getSignedReadUrl(key: string): Promise<string> {
    // No real signing locally — serve through the internal asset route.
    return `/api/assets/${encodeURIComponent(key)}`;
  }

  async getSignedUploadUrl(): Promise<string> {
    // Local dev uploads go through /api/upload (multipart), not a direct PUT.
    return `/api/upload`;
  }
}
