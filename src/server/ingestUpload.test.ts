import { vi, describe, it, expect } from 'vitest';

// Mock Prisma and Storage provider modules which ingestUpload imports
vi.mock('./db', async () => {
  return {
    prisma: {
      project: { create: vi.fn(async ({ data }) => ({ id: 'proj_mock', ...data })) },
      asset: { create: vi.fn(async ({ data }) => ({ id: 'asset_mock', ...data })) }
    }
  };
});

vi.mock('./storage', async () => {
  return {
    getStorageProvider: () => ({
      putObject: vi.fn(async ({ key }) => key),
      getSignedReadUrl: vi.fn(async (key: string) => `/api/assets/${encodeURIComponent(key)}`),
    }),
  };
});

// Import after mocks are defined
import { ingestUpload } from './assets/ingestUpload';

describe('ingestUpload (mocked)', () => {
  it('creates project and assets using mocked prisma and storage', async () => {
    const sharp = (await import('sharp')).default;
    const buffer = await sharp({ create: { width: 128, height: 128, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();

    const result = await ingestUpload({ userId: 'user_mock', displayName: 'Test.png', buffer });

    expect(result).toHaveProperty('projectId');
    expect(result).toHaveProperty('originalAssetId');
    expect(result).toHaveProperty('previewAssetId');
    expect(result).toHaveProperty('thumbnailAssetId');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});
