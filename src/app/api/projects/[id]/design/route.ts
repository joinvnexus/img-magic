import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUserId } from "@/server/auth/getCurrentUser";
import { ensureInitialDesign } from "@/server/design/ensureInitialDesign";
import type { LayerTransformPatch, LayerDTO } from "@/lib/editor/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
  }

  const design = await ensureInitialDesign(projectId);

  // Resolve sourceAssetId -> a fetchable URL for every image/background layer.
  const assetIds = design.layers.map((l: LayerDTO) => l.sourceAssetId).filter((v): v is string => !!v);
  const assets = assetIds.length
    ? await prisma.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, storageKey: true } })
    : [];
  const urlByAssetId = new Map<string, string>(
    assets.map((a: { id: string; storageKey: string }) => [a.id, `/api/assets/${encodeURIComponent(a.storageKey)}`])
  );

  const layers = design.layers.map((l: LayerDTO) => ({
    ...l,
    sourceUrl: l.sourceAssetId ? (urlByAssetId.get(l.sourceAssetId) ?? null) : null,
  }));

  return NextResponse.json({ data: { ...design, layers } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
  }

  const body = (await req.json()) as { designVersionId: string; patches: LayerTransformPatch[] };
  if (!body?.designVersionId || !Array.isArray(body.patches)) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Expected { designVersionId, patches }." } }, { status: 400 });
  }

  // Verify every patched layer actually belongs to this project's version
  // before writing anything — never trust layer ids from the client blindly.
  const version = await prisma.designVersion.findFirst({
    where: { id: body.designVersionId, design: { projectId } },
    include: { layers: { select: { id: true } } },
  });
  if (!version) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Design version not found." } }, { status: 404 });
  }
  const ownedLayerIds = new Set(version.layers.map((l: { id: string }) => l.id));
  const validPatches = body.patches.filter((p) => ownedLayerIds.has(p.id));

  await prisma.$transaction(
    validPatches.map((p) => {
      const { id, ...fields } = p;
      return prisma.layer.update({ where: { id }, data: fields });
    })
  );

  return NextResponse.json({ data: { saved: validPatches.length } });
}