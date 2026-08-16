import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUserId } from "@/server/auth/getCurrentUser";
import { EditorShell } from "@/components/editor/EditorShell";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findUnique({
    where: { id },
    include: { assets: true },
  });

  if (!project || project.userId !== userId) {
    notFound();
  }

  type ProjectAsset = (typeof project.assets)[number];
  const preview = project.assets.find((a: ProjectAsset) => a.kind === "PREVIEW");
  const original = project.assets.find((a: ProjectAsset) => a.kind === "ORIGINAL");

  return (
    <EditorShell
      project={{ id: project.id, name: project.name, status: project.status }}
      previewUrl={preview ? `/api/assets/${encodeURIComponent(preview.storageKey)}` : null}
      canvasWidth={original?.width ?? preview?.width ?? 1000}
      canvasHeight={original?.height ?? preview?.height ?? 1000}
    />
  );
}
