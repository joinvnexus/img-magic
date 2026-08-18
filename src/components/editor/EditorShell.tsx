"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { useAutosave } from "@/lib/editor/useAutosave";
import { useEditorKeyboardShortcuts } from "@/lib/editor/useEditorKeyboardShortcuts";
import { CanvasEngine } from "@/components/editor/canvas/CanvasEngine";
import { EditorToolbar } from "@/components/editor/Toolbar";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import type { DesignDTO } from "@/lib/editor/types";

interface EditorShellProps {
  project: { id: string; name: string; status: string };
  design: DesignDTO;
}

export function EditorShell({ project, design }: EditorShellProps) {
  const init = useEditorStore((s) => s.init);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);

  useEffect(() => {
    init({
      designVersionId: design.designVersionId,
      canvasWidth: design.canvasWidth,
      canvasHeight: design.canvasHeight,
      layers: design.layers,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.designVersionId]);

  const { getStatus } = useAutosave(project.id);
  useEditorKeyboardShortcuts();

  return (
    <div className="flex-1 flex flex-col h-screen">
      <EditorToolbar projectName={project.name} saveStatus={getStatus()} />

      <div className="flex-1 flex min-h-0">
        {/* Left tools panel — Add Text/Image/Shape (section 41) and AI tools (Phase 5) */}
        <aside className="w-14 shrink-0 border-r border-border flex flex-col items-center gap-1 py-3">
          {[
            { label: "Select", ready: true },
            { label: "Text", ready: false },
            { label: "Image", ready: false },
            { label: "Shape", ready: false },
            { label: "AI", ready: false },
          ].map((tool) => (
            <button
              key={tool.label}
              disabled={!tool.ready}
              title={tool.ready ? tool.label : `${tool.label} — coming in a later phase`}
              className="h-10 w-10 rounded-md flex items-center justify-center text-xs text-text-muted enabled:hover:bg-bg-panel-raised enabled:hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {tool.label[0]}
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0 checker-bg flex items-center justify-center overflow-auto p-8">
          <CanvasEngine canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
        </main>

        <PropertiesPanel />
      </div>

      <LayersPanel />
    </div>
  );
}