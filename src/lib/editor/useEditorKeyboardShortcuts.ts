"use client";

import { useEffect } from "react";
import { useEditorStore } from "./store";

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

function isModifierPressed(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey;
}

/**
 * Global keyboard shortcuts for the editor (spec section 13):
 * Delete/Backspace, Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Cmd/Ctrl+C/V, Cmd/Ctrl+D,
 * Arrow keys (1px nudge), Shift+Arrow (10px nudge).
 *
 * Skips everything while focus is inside an input/textarea (e.g. the
 * properties panel) so typing "5" into a width field doesn't get eaten.
 */
export function useEditorKeyboardShortcuts() {
  const store = useEditorStore;

  useEffect(() => {
    let clipboardLayerId: string | null = null;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const { selectedLayerId, layers, updateLayer, deleteLayer, duplicateLayer, undo, redo } = store.getState();
      const selected = layers.find((l) => l.id === selectedLayerId);

      if ((e.key === "Delete" || e.key === "Backspace") && selectedLayerId) {
        e.preventDefault();
        deleteLayer(selectedLayerId);
        return;
      }

      if (isModifierPressed(e) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (isModifierPressed(e) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedLayerId) duplicateLayer(selectedLayerId);
        return;
      }

      if (isModifierPressed(e) && e.key.toLowerCase() === "c") {
        if (selectedLayerId) clipboardLayerId = selectedLayerId;
        return;
      }

      if (isModifierPressed(e) && e.key.toLowerCase() === "v") {
        if (clipboardLayerId && layers.some((l) => l.id === clipboardLayerId)) {
          e.preventDefault();
          duplicateLayer(clipboardLayerId);
        }
        return;
      }

      const arrowDeltas: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      if (selected && !selected.locked && arrowDeltas[e.key]) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const [dx, dy] = arrowDeltas[e.key];
        updateLayer(selected.id, { x: selected.x + dx * step, y: selected.y + dy * step }, true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);
}