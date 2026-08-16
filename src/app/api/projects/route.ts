import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUserId } from "@/server/auth/getCurrentUser";

export async function GET() {
  const userId = await getCurrentUserId();

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      assets: { where: { kind: "THUMBNAIL" }, take: 1 },
    },
  });

  return NextResponse.json({
    data: projects.map((p: (typeof projects)[number]) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      updatedAt: p.updatedAt,
      thumbnailKey: p.assets[0]?.storageKey ?? null,
    })),
  });
}
