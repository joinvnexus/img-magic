import { prisma } from "@/server/db";
import type { DesignDTO, LayerDTO } from "@/lib/editor/types";

/**
 * Phase 1 stored the uploaded image only as an Asset — no Design/Layer rows
 * existed yet, and the editor route rendered a static <img>. Phase 2 needs
 * a real (even if trivial) scene graph to drive the canvas engine, so this
 * lazily creates one the first time a project's editor is opened:
 *
 *   Design (1) → DesignVersion (1) → Layer (BACKGROUND, locked, sourceAsset=preview)
 *
 * This is exactly the fallback mode described in the product spec
 * (section 12/33): until Phase 3's analysis pipeline exists, every project
 * is one locked background layer — now a *real* layer instead of a static
 * image, so Phase 2's canvas engine has something legitimate to render.
 */
export async function ensureInitialDesign(projectId: string): Promise<DesignDTO> {
  const existing = await prisma.design.findFirst({
    where: { projectId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { layers: { orderBy: { zIndex: "asc" } } },
      },
    },
  });

  if (existing && existing.versions[0]) {
    return toDTO(existing, existing.versions[0]);
  }

  const preview = await prisma.asset.findFirst({
    where: { projectId, kind: "PREVIEW" },
  });
  const original = await prisma.asset.findFirst({
    where: { projectId, kind: "ORIGINAL" },
  });

  if (!preview || !original) {
    throw new Error("Project has no preview/original asset — cannot create initial design.");
  }

  const design = await prisma.design.create({
    data: {
      projectId,
      name: "Untitled design",
      canvasWidth: original.width ?? preview.width ?? 1000,
      canvasHeight: original.height ?? preview.height ?? 1000,
      versions: {
        create: {
          versionNumber: 1,
          label: "Original upload",
          layers: {
            create: {
              type: "BACKGROUND",
              name: "Background",
              zIndex: 0,
              x: 0,
              y: 0,
              width: original.width ?? preview.width ?? 1000,
              height: original.height ?? preview.height ?? 1000,
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: true,
              sourceAssetId: preview.id,
            },
          },
        },
      },
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { layers: { orderBy: { zIndex: "asc" } } },
      },
    },
  });

  return toDTO(design, design.versions[0]);
}

type DesignWithVersion = {
  id: string;
  canvasWidth: number;
  canvasHeight: number;
};
type VersionWithLayers = {
  id: string;
  versionNumber: number;
  layers: Array<{
    id: string;
    type: string;
    name: string;
    zIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    visible: boolean;
    locked: boolean;
    sourceAssetId: string | null;
    text: string | null;
    fontFamily: string | null;
    fontSize: number | null;
    fontWeight: number | null;
    fill: string | null;
    confidence: number | null;
  }>;
};

function toDTO(design: DesignWithVersion, version: VersionWithLayers): DesignDTO {
  const layers: LayerDTO[] = version.layers.map((l) => ({
    id: l.id,
    type: l.type as LayerDTO["type"],
    name: l.name,
    zIndex: l.zIndex,
    x: l.x,
    y: l.y,
    width: l.width,
    height: l.height,
    rotation: l.rotation,
    opacity: l.opacity,
    visible: l.visible,
    locked: l.locked,
    sourceAssetId: l.sourceAssetId,
    sourceUrl: null, // resolved by the API route, which has access to the asset's storageKey
    text: l.text,
    fontFamily: l.fontFamily,
    fontSize: l.fontSize,
    fontWeight: l.fontWeight,
    fill: l.fill,
    confidence: l.confidence,
  }));

  return {
    designId: design.id,
    designVersionId: version.id,
    versionNumber: version.versionNumber,
    canvasWidth: design.canvasWidth,
    canvasHeight: design.canvasHeight,
    layers,
  };
}