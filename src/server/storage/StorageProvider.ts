/**
 * StorageProvider — the one interface every part of the app uses to read
 * and write binary assets. Business logic (upload handlers, AI workers,
 * export) must never touch the filesystem or an S3 SDK directly; they
 * depend on this interface, so swapping "local disk" for "R2" or "S3" is a
 * one-file change (see index.ts).
 */
export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  /** Persist a buffer under `key`. Returns the key it was stored under. */
  putObject(input: PutObjectInput): Promise<string>;

  /** Read a stored object back into memory. */
  getObject(key: string): Promise<Buffer>;

  /** Delete a stored object. Safe to call on a missing key. */
  deleteObject(key: string): Promise<void>;

  /**
   * Produce a URL the browser can use to fetch the object directly.
   * For local dev this is an internal route; for S3/R2 this would be a
   * signed GET URL with an expiry.
   */
  getSignedReadUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Produce a URL/fields the browser can upload directly to (bypassing the
   * app server for the binary payload). Local provider returns an internal
   * route since there's no real pre-signed PUT without a real bucket.
   */
  getSignedUploadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
