"use client";

import Link from "next/link";
import { useEditorStore } from "@/lib/editor/store";
import { Button } from "@/components/ui/Button";

export function EditorToolbar({ projectName, saveStatus }: { projectName: string; saveStatus: "idle" | "saving" | "saved" }) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo());
  const canRedo = useEditorStore((s) => s.canRedo());
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);

  return (
    <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/" className="text-text-muted hover:text-text text-sm">
          ← Projects
        </Link>
        <span className="text-border">/</span>
        <span className="text-sm font-medium truncate max-w-[240px]">{projectName}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted w-14 text-center" aria-live="polite">
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
        </span>

        <Button variant="ghost" size="sm" disabled={!canUndo} onClick={undo} title="Undo (Ctrl/Cmd+Z)">
          Undo
        </Button>
        <Button variant="ghost" size="sm" disabled={!canRedo} onClick={redo} title="Redo (Ctrl/Cmd+Shift+Z)">
          Redo
        </Button>

        <div className="flex items-center gap-1 ml-2">
          <Button variant="ghost" size="sm" onClick={() => setZoom(zoom - 0.1)} title="Zoom out">
            −
          </Button>
          <span className="text-xs text-text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(zoom + 0.1)} title="Zoom in">
            +
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setZoom(1)} title="Reset zoom to 100%">
            Fit
          </Button>
        </div>

        <Button variant="secondary" size="sm" disabled title="Phase 6">
          Export
        </Button>
      </div>
    </div>
  );
}