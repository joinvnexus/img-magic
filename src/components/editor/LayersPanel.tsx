"use client";

import { useEditorStore } from "@/lib/editor/store";

const TYPE_ICON: Record<string, string> = {
  BACKGROUND: "🖼",
  IMAGE: "🖼",
  TEXT: "T",
  SHAPE: "◆",
  VECTOR: "✎",
  GROUP: "▤",
  MASK: "◐",
  ADJUSTMENT: "⚙",
};

export function LayersPanel() {
  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const deleteLayer = useEditorStore((s) => s.deleteLayer);
  const reorderLayer = useEditorStore((s) => s.reorderLayer);

  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex); // top layer first

  return (
    <div className="h-40 shrink-0 border-t border-border p-3 overflow-y-auto">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
        Layers ({layers.length})
      </h3>
      <div className="flex flex-col gap-1">
        {sorted.map((layer) => (
          <div
            key={layer.id}
            onClick={() => selectLayer(layer.id)}
            role="button"
            tabIndex={0}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm cursor-pointer ${
              selectedLayerId === layer.id ? "bg-accent/20 border border-accent/50" : "bg-bg-panel hover:bg-bg-panel-raised"
            }`}
          >
            <button
              aria-label={layer.visible ? "Hide layer" : "Show layer"}
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { visible: !layer.visible }, true);
              }}
              className="text-text-muted hover:text-text w-5"
            >
              {layer.visible ? "👁" : "—"}
            </button>
            <button
              aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { locked: !layer.locked }, true);
              }}
              className="text-text-muted hover:text-text w-5"
            >
              {layer.locked ? "🔒" : "🔓"}
            </button>
            <span className="w-4 text-center text-xs text-text-muted">{TYPE_ICON[layer.type] ?? "?"}</span>
            <span className="flex-1 truncate">{layer.name}</span>
            {layer.confidence != null && layer.confidence < 0.6 && (
              <span title="Possible element — low detection confidence" className="text-xs text-amber-400">
                ⚠
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                aria-label="Move layer up"
                onClick={(e) => {
                  e.stopPropagation();
                  reorderLayer(layer.id, "up");
                }}
                className="text-text-muted hover:text-text px-1"
              >
                ↑
              </button>
              <button
                aria-label="Move layer down"
                onClick={(e) => {
                  e.stopPropagation();
                  reorderLayer(layer.id, "down");
                }}
                className="text-text-muted hover:text-text px-1"
              >
                ↓
              </button>
              <button
                aria-label="Delete layer"
                disabled={layer.locked}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(layer.id);
                }}
                className="text-text-muted hover:text-danger px-1 disabled:opacity-30 disabled:hover:text-text-muted"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}