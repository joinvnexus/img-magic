"use client";

import { useEditorStore } from "@/lib/editor/store";

function NumberField({
  label,
  value,
  onCommit,
  disabled,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <input
        type="number"
        defaultValue={Math.round(value)}
        key={value} // resync when external changes (undo/redo, canvas drag) land
        disabled={disabled}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onCommit(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-20 rounded-md border border-border bg-bg-panel-raised px-2 py-1 text-right text-text disabled:opacity-40"
      />
    </label>
  );
}

export function PropertiesPanel() {
  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const updateLayer = useEditorStore((s) => s.updateLayer);

  const layer = layers.find((l) => l.id === selectedLayerId);

  if (!layer) {
    return (
      <aside className="w-64 shrink-0 border-l border-border p-4 overflow-y-auto">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-3">Properties</h3>
        <p className="text-sm text-text-muted">Select an element on the canvas or in the layers panel.</p>
      </aside>
    );
  }

  const disabled = layer.locked;

  return (
    <aside className="w-64 shrink-0 border-l border-border p-4 overflow-y-auto">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Properties</h3>
      <p className="text-sm font-medium mb-3 truncate">{layer.name}</p>

      {disabled && <p className="text-xs text-amber-400 mb-3">This layer is locked. Unlock it in the layers panel to edit.</p>}

      <div className="flex flex-col gap-2">
        <NumberField label="X" value={layer.x} disabled={disabled} onCommit={(v) => updateLayer(layer.id, { x: v }, true)} />
        <NumberField label="Y" value={layer.y} disabled={disabled} onCommit={(v) => updateLayer(layer.id, { y: v }, true)} />
        <NumberField
          label="Width"
          value={layer.width}
          disabled={disabled}
          onCommit={(v) => updateLayer(layer.id, { width: Math.max(1, v) }, true)}
        />
        <NumberField
          label="Height"
          value={layer.height}
          disabled={disabled}
          onCommit={(v) => updateLayer(layer.id, { height: Math.max(1, v) }, true)}
        />
        <NumberField
          label="Rotation"
          value={layer.rotation}
          disabled={disabled}
          onCommit={(v) => updateLayer(layer.id, { rotation: v }, true)}
        />

        <label className="flex items-center justify-between gap-2 text-sm mt-2">
          <span className="text-text-muted">Opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={layer.opacity}
            disabled={disabled}
            onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) }, false)}
            onMouseUp={(e) => updateLayer(layer.id, { opacity: Number((e.target as HTMLInputElement).value) }, true)}
            className="flex-1"
          />
        </label>
      </div>

      {layer.type === "TEXT" && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Text</h4>
          <textarea
            defaultValue={layer.text ?? ""}
            disabled={disabled}
            onBlur={(e) => updateLayer(layer.id, { text: e.target.value }, true)}
            rows={3}
            className="w-full rounded-md border border-border bg-bg-panel-raised px-2 py-1 text-sm text-text disabled:opacity-40"
          />
        </div>
      )}

      {layer.confidence != null && (
        <p className="mt-4 text-xs text-text-muted">AI detection confidence: {Math.round(layer.confidence * 100)}%</p>
      )}
    </aside>
  );
}