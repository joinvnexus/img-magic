import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUserId } from "@/server/auth/getCurrentUser";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findUnique({
    where: { id },
    include: { assets: true },
  });

  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: project.id,
      name: project.name,
      status: project.status,
      updatedAt: project.updatedAt,
      assets: project.assets.map((a: (typeof project.assets)[number]) => ({
        id: a.id,
        kind: a.kind,
        storageKey: a.storageKey,
        width: a.width,
        height: a.height,
      })),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const project = await prisma.project.findUnique({ where: { id }, select: { userId: true } });
  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ data: { deleted: true } });
}
