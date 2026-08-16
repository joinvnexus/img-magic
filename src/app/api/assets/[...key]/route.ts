import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUserId } from "@/server/auth/getCurrentUser";
import { getStorageProvider } from "@/server/storage";

export const runtime = "nodejs";

/**
 * Serves a stored asset by its storage key, after verifying the requesting
 * user owns the project it belongs to. This route exists only for the
 * local storage provider — in production (STORAGE_PROVIDER=s3), the app
 * should hand the browser a signed URL and skip proxying bytes through
 * this server entirely.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: keyParts } = await params;
  const key = decodeURIComponent(keyParts.join("/"));

  const userId = await getCurrentUserId();
  const asset = await prisma.asset.findFirst({
    where: { storageKey: key },
    include: { project: { select: { userId: true } } },
  });

  if (!asset || asset.project.userId !== userId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Asset not found." } }, { status: 404 });
  }

  const storage = getStorageProvider();
  try {
    const buffer = await storage.getObject(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Asset data missing." } }, { status: 404 });
  }
}
