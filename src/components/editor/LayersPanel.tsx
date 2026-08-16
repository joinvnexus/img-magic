"use client";

import { useEffect, useState } from 'react';

interface LayersPanelProps {
  editorApi: any | null;
}

export function LayersPanel({ editorApi }: LayersPanelProps) {
  const [layers, setLayers] = useState<any[]>([]);

  const refresh = () => {
    if (!editorApi) return setLayers([]);
    const list = editorApi.listLayers();
    setLayers(list.reverse()); // show topmost first
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 800);
    return () => clearInterval(id);
  }, [editorApi]);

  if (!editorApi) {
    return <div className="text-sm text-text-muted">Layers will appear here when the editor is ready.</div>;
  }

  return (
    <div>
      {layers.map((l, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-bg-panel rounded">
          <button
            aria-label="visibility"
            onClick={() => {
              const realIdx = layers.length - 1 - idx;
              editorApi.toggleVisibility(realIdx);
              refresh();
            }}
            className="text-sm"
          >
            {l.visible ? '👁' : '🚫'}
          </button>

          <button
            aria-label="lock"
            onClick={() => {
              const realIdx = layers.length - 1 - idx;
              editorApi.toggleLock(realIdx);
              refresh();
            }}
            className="text-sm"
          >
            {l.locked ? '🔒' : '🔓'}
          </button>

          <div className="flex-1 text-sm truncate">{l.name}</div>

          <button
            title="Rename"
            onClick={() => {
              const newName = prompt('Rename layer', l.name);
              if (newName) {
                const realIdx = layers.length - 1 - idx;
                editorApi.renameLayer(realIdx, newName);
                refresh();
              }
            }}
            className="text-xs px-2 py-1 bg-white/5 rounded"
          >
            Rename
          </button>

          <button
            title="Duplicate"
            onClick={() => {
              const realIdx = layers.length - 1 - idx;
              editorApi.duplicateLayer(realIdx);
              refresh();
            }}
            className="text-xs px-2 py-1 bg-white/5 rounded"
          >
            Duplicate
          </button>

          <button
            title="Delete"
            onClick={() => {
              if (!confirm('Delete this layer?')) return;
              const realIdx = layers.length - 1 - idx;
              editorApi.deleteLayer(realIdx);
              refresh();
            }}
            className="text-xs px-2 py-1 bg-red-600 text-white rounded"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
