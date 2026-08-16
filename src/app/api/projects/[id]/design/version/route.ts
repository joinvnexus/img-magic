import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/server/auth/getCurrentUser';
import { prisma } from '@/server/db';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  const projectId = params.id;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const layers: any[] = body.layers ?? [];

  // Ensure a design exists
  let design = await prisma.design.findFirst({ where: { projectId } });
  if (!design) {
    design = await prisma.design.create({
      data: {
        projectId,
        name: project.name ?? 'Untitled design',
        canvasWidth: project.id ? 1000 : 1000,
        canvasHeight: project.id ? 1000 : 1000,
      },
    });
  }

  // Determine next version number
  const latest = await prisma.designVersion.findFirst({ where: { designId: design.id }, orderBy: { versionNumber: 'desc' } });
  const nextVersion = (latest?.versionNumber ?? 0) + 1;

  // Prepare layers create data
  const createLayers = layers.map((l) => ({
    type: l.type ?? 'IMAGE',
    name: l.name ?? 'Layer',
    zIndex: l.zIndex ?? 0,
    x: l.x ?? 0,
    y: l.y ?? 0,
    width: l.width ?? 0,
    height: l.height ?? 0,
    rotation: l.rotation ?? 0,
    opacity: l.opacity ?? 1,
    visible: l.visible ?? true,
    locked: l.locked ?? false,
    sourceAssetId: l.sourceAssetId ?? null,
    text: l.text ?? null,
    fontFamily: l.fontFamily ?? null,
    fontSize: l.fontSize ?? null,
    fontWeight: l.fontWeight ?? null,
    fill: l.fill ?? null,
    confidence: l.confidence ?? null,
    metadata: l.metadata ?? null,
  }));

  const dv = await prisma.designVersion.create({
    data: {
      designId: design.id,
      versionNumber: nextVersion,
      label: 'Autosave',
      isAutosave: true,
      layers: {
        create: createLayers,
      },
    },
    include: { layers: true },
  });

  return NextResponse.json({ designVersion: dv });
}
