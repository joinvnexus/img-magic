"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only JPG, PNG, and WebP images are supported.");
        return;
      }

      setIsUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();

        if (!res.ok) {
          setError(json?.error?.message ?? "Upload failed. Please try again.");
          setIsUploading(false);
          return;
        }

        router.push(`/projects/${json.data.projectId}/editor`);
      } catch {
        setError("Upload failed. Check your connection and try again.");
        setIsUploading(false);
      }
    },
    [router]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload an image"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-16 text-center cursor-pointer transition-colors ${
          isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        {isUploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-text-muted">Uploading and preparing your image…</p>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-lg bg-accent/15 flex items-center justify-center text-accent text-xl">
              ↑
            </div>
            <p className="text-base font-medium">Drop an image, or click to browse</p>
            <p className="text-sm text-text-muted">JPG, PNG, or WebP — up to 20MB</p>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
