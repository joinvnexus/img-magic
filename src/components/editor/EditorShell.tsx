"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface EditorShellProps {
  project: { id: string; name: string; status: string };
  previewUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Phase 1 scope: the editor route exists, loads the project's preview
 * asset, and renders it as a single locked "Background" layer — this is
 * the fallback mode described in section 12/33 of the spec, used
 * whenever (as here, pre-Phase-3) no AI reconstruction has run yet.
 *
 * Selection, transforms, the Fabric.js canvas engine, and the AI panels
 * are Phase 2 and Phase 5 respectively — their UI chrome is stubbed here
 * so the layout is real, but their behavior is not implemented yet.
 */
export function EditorShell({ project, previewUrl, canvasWidth, canvasHeight }: EditorShellProps) {
  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Top toolbar */}
      <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-text-muted hover:text-text text-sm">
            ← Projects
          </Link>
          <span className="text-border">/</span>
          <span className="text-sm font-medium truncate max-w-[240px]">{project.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled title="Phase 3">
            Undo
          </Button>
          <Button variant="ghost" size="sm" disabled title="Phase 3">
            Redo
          </Button>
          <Button variant="secondary" size="sm" disabled title="Phase 6">
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left tools panel */}
        <aside className="w-14 shrink-0 border-r border-border flex flex-col items-center gap-1 py-3">
          {["Select", "Text", "Image", "Shape", "AI"].map((tool) => (
            <button
              key={tool}
              disabled
              title={`${tool} — coming in Phase 2/5`}
              className="h-10 w-10 rounded-md flex items-center justify-center text-xs text-text-muted opacity-40 cursor-not-allowed"
            >
              {tool[0]}
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0 checker-bg flex items-center justify-center overflow-auto p-8">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={project.name}
              className="max-h-full max-w-full shadow-2xl"
              style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
            />
          ) : (
            <p className="text-text-muted text-sm">No preview available for this project.</p>
          )}
        </main>

        {/* Right properties panel */}
        <aside className="w-64 shrink-0 border-l border-border p-4 overflow-y-auto">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-3">Properties</h3>
          <p className="text-sm text-text-muted">
            No layer selected. Element selection ships in Phase 2 once the canvas engine is wired in.
          </p>
        </aside>
      </div>

      {/* Bottom layers panel */}
      <div className="h-40 shrink-0 border-t border-border p-3 overflow-y-auto">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Layers</h3>
        <div className="flex items-center gap-2 rounded-md bg-bg-panel px-3 py-2 text-sm">
          <span title="Locked">🔒</span>
          <span title="Visible">👁</span>
          <span className="flex-1">Background</span>
          <span className="text-xs text-text-muted">
            {canvasWidth}×{canvasHeight}
          </span>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          This project hasn&apos;t been analyzed yet, so it&apos;s shown as a single locked background
          image rather than editable layers — the honest fallback described in the product spec, not a bug.
          Analysis (OCR, object detection, segmentation) is Phase 3.
        </p>
      </div>
    </div>
  );
}
