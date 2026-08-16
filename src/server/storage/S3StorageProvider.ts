import type { PutObjectInput, StorageProvider } from "./StorageProvider";

/**
 * S3-compatible provider (works for AWS S3, Cloudflare R2, Supabase
 * Storage, MinIO — anything speaking the S3 API). Selected via
 * STORAGE_PROVIDER=s3.
 *
 * Deliberately dependency-light for Phase 1: this file defines the shape
 * and env contract so the rest of the app can be written against
 * StorageProvider today. Wiring in `@aws-sdk/client-s3` +
 * `@aws-sdk/s3-request-presigner` is a Phase 1 follow-up that touches only
 * this file — nothing else in the app needs to change.
 */
export class S3StorageProvider implements StorageProvider {
  constructor(
    private readonly config: {
      endpoint: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      region?: string;
    }
  ) {}

  async putObject(_input: PutObjectInput): Promise<string> {
    throw new Error(
      "S3StorageProvider.putObject not yet wired — install @aws-sdk/client-s3 and implement. " +
        "See STORAGE_PROVIDER in .env.example."
    );
  }

  async getObject(_key: string): Promise<Buffer> {
    throw new Error("S3StorageProvider.getObject not yet wired.");
  }

  async deleteObject(_key: string): Promise<void> {
    throw new Error("S3StorageProvider.deleteObject not yet wired.");
  }

  async getSignedReadUrl(_key: string, _expiresInSeconds = 3600): Promise<string> {
    throw new Error("S3StorageProvider.getSignedReadUrl not yet wired.");
  }

  async getSignedUploadUrl(_key: string, _expiresInSeconds = 900): Promise<string> {
    throw new Error("S3StorageProvider.getSignedUploadUrl not yet wired.");
  }
}
