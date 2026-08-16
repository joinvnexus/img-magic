import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/server/auth/getCurrentUser';
import { prisma } from '@/server/db';
import { getStorageProvider } from '@/server/storage';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  const projectId = params.id;

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { assets: true } });
  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Find an existing design for the project
  let design = await prisma.design.findFirst({ where: { projectId } });

  if (!design) {
    // Create a simple design using canvas size from the original or preview asset
    const original = project.assets.find((a) => a.kind === 'ORIGINAL');
    const preview = project.assets.find((a) => a.kind === 'PREVIEW');
    const width = original?.width ?? preview?.width ?? 1000;
    const height = original?.height ?? preview?.height ?? 1000;

    design = await prisma.design.create({
      data: {
        projectId,
        name: project.name ?? 'Untitled design',
        canvasWidth: width,
        canvasHeight: height,
      },
    });

    // create initial design version and background layer
    const previewAsset = preview;
    const designVersion = await prisma.designVersion.create({
      data: {
        designId: design.id,
        versionNumber: 1,
        label: 'Original (fallback)',
        isAutosave: false,
        layers: {
          create: [
            {
              type: 'BACKGROUND',
              name: 'Background',
              zIndex: 0,
              x: 0,
              y: 0,
              width: width,
              height: height,
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: true,
              sourceAssetId: previewAsset?.id ?? null,
            },
          ],
        },
      },
      include: { layers: true },
    });

    // return designVersion
    const storage = getStorageProvider();
    const layersWithUrls = await Promise.all(
      designVersion.layers.map(async (l) => {
        let assetUrl: string | null = null;
        if (l.sourceAssetId) {
          const asset = await prisma.asset.findUnique({ where: { id: l.sourceAssetId } });
          if (asset) assetUrl = await storage.getSignedReadUrl(asset.storageKey);
        }
        return { ...l, assetUrl };
      })
    );

    return NextResponse.json({ design: design, designVersion: designVersion, layers: layersWithUrls });
  }

  // If design exists, fetch latest version
  const latestVersion = await prisma.designVersion.findFirst({ where: { designId: design.id }, orderBy: { createdAt: 'desc' }, include: { layers: true } });
  if (!latestVersion) {
    return NextResponse.json({ design, designVersion: null, layers: [] });
  }

  const storage = getStorageProvider();
  const layersWithUrls = await Promise.all(
    latestVersion.layers.map(async (l) => {
      let assetUrl: string | null = null;
      if (l.sourceAssetId) {
        const asset = await prisma.asset.findUnique({ where: { id: l.sourceAssetId } });
        if (asset) assetUrl = await storage.getSignedReadUrl(asset.storageKey);
      }
      return { ...l, assetUrl };
    })
  );

  return NextResponse.json({ design, designVersion: latestVersion, layers: layersWithUrls });
}
