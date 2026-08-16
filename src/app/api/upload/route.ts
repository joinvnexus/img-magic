import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/getCurrentUser";
import { ingestUpload } from "@/server/assets/ingestUpload";
import { ImageValidationError, MAX_UPLOAD_BYTES } from "@/server/validation/image";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength && contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "Upload exceeds size limit." } },
      { status: 413 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "MISSING_FILE", message: "No file provided under field 'file'." } },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await ingestUpload({
      userId,
      displayName: file.name ?? "Untitled",
      buffer,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof ImageValidationError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: 422 });
    }
    console.error("Upload failed", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Upload failed. Please try again." } },
      { status: 500 }
    );
  }
}
