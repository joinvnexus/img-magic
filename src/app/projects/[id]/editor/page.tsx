import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUserId } from "@/server/auth/getCurrentUser";
import { ensureInitialDesign } from "@/server/design/ensureInitialDesign";
import { EditorShell } from "@/components/editor/EditorShell";
import type { LayerDTO } from "@/lib/editor/types";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    notFound();
  }

  const design = await ensureInitialDesign(id);

  // Resolve sourceAssetId -> URL server-side (same as the /design API route)
  // so the first paint doesn't need a client-side fetch round trip.
  const assetIds = design.layers.map((l: LayerDTO) => l.sourceAssetId).filter((v): v is string => !!v);
  const assets = assetIds.length
    ? await prisma.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, storageKey: true } })
    : [];
  const urlByAssetId = new Map<string, string>(
    assets.map((a: { id: string; storageKey: string }) => [a.id, `/api/assets/${encodeURIComponent(a.storageKey)}`])
  );

  const layers: LayerDTO[] = design.layers.map((l) => ({
    ...l,
    sourceUrl: l.sourceAssetId ? (urlByAssetId.get(l.sourceAssetId) ?? null) : null,
  }));

  return (
    <EditorShell
      project={{ id: project.id, name: project.name, status: project.status }}
      design={{ ...design, layers }}
    />
  );
}