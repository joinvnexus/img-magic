import { create } from "zustand";
import type { LayerDTO } from "./types";

const MAX_HISTORY = 50;

interface EditorState {
  designVersionId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  layers: LayerDTO[];
  selectedLayerId: string | null;
  zoom: number;
  isDirty: boolean;

  history: LayerDTO[][];
  historyIndex: number;

  init: (params: { designVersionId: string; canvasWidth: number; canvasHeight: number; layers: LayerDTO[] }) => void;

  selectLayer: (id: string | null) => void;
  /**
   * Apply a patch to a layer. `commit=true` pushes a new history entry
   * (call this on mouse-up / blur, not on every drag frame) and marks the
   * editor dirty so autosave picks it up.
   */
  updateLayer: (id: string, patch: Partial<LayerDTO>, commit: boolean) => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  reorderLayer: (id: string, direction: "up" | "down") => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setZoom: (zoom: number) => void;
  markSaved: () => void;
}

function pushHistory(history: LayerDTO[][], historyIndex: number, layers: LayerDTO[]) {
  const truncated = history.slice(0, historyIndex + 1);
  const next = [...truncated, layers];
  const overflow = next.length - MAX_HISTORY;
  const trimmed = overflow > 0 ? next.slice(overflow) : next;
  return { history: trimmed, historyIndex: trimmed.length - 1 };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  designVersionId: null,
  canvasWidth: 1000,
  canvasHeight: 1000,
  layers: [],
  selectedLayerId: null,
  zoom: 1,
  isDirty: false,
  history: [],
  historyIndex: -1,

  init: ({ designVersionId, canvasWidth, canvasHeight, layers }) =>
    set({
      designVersionId,
      canvasWidth,
      canvasHeight,
      layers,
      selectedLayerId: null,
      isDirty: false,
      history: [layers],
      historyIndex: 0,
    }),

  selectLayer: (id) => set({ selectedLayerId: id }),

  updateLayer: (id, patch, commit) =>
    set((state) => {
      const layers = state.layers.map((l) => (l.id === id ? { ...l, ...patch } : l));
      if (!commit) return { layers };
      const { history, historyIndex } = pushHistory(state.history, state.historyIndex, layers);
      return { layers, history, historyIndex, isDirty: true };
    }),

  deleteLayer: (id) =>
    set((state) => {
      const target = state.layers.find((l) => l.id === id);
      if (!target || target.locked) return {};
      const layers = state.layers.filter((l) => l.id !== id);
      const { history, historyIndex } = pushHistory(state.history, state.historyIndex, layers);
      return {
        layers,
        history,
        historyIndex,
        isDirty: true,
        selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
      };
    }),

  duplicateLayer: (id) =>
    set((state) => {
      const target = state.layers.find((l) => l.id === id);
      if (!target) return {};
      const copy: LayerDTO = {
        ...target,
        id: `local_${Math.random().toString(36).slice(2, 10)}`,
        name: `${target.name} copy`,
        x: target.x + 16,
        y: target.y + 16,
        zIndex: Math.max(...state.layers.map((l) => l.zIndex)) + 1,
        locked: false,
      };
      const layers = [...state.layers, copy];
      const { history, historyIndex } = pushHistory(state.history, state.historyIndex, layers);
      return { layers, history, historyIndex, isDirty: true, selectedLayerId: copy.id };
    }),

  reorderLayer: (id, direction) =>
    set((state) => {
      const sorted = [...state.layers].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === id);
      const swapWith = direction === "up" ? idx + 1 : idx - 1;
      if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return {};
      const a = sorted[idx];
      const b = sorted[swapWith];
      const layers = state.layers.map((l) => {
        if (l.id === a.id) return { ...l, zIndex: b.zIndex };
        if (l.id === b.id) return { ...l, zIndex: a.zIndex };
        return l;
      });
      const { history, historyIndex } = pushHistory(state.history, state.historyIndex, layers);
      return { layers, history, historyIndex, isDirty: true };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return {};
      const historyIndex = state.historyIndex - 1;
      return { layers: state.history[historyIndex], historyIndex, isDirty: true };
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return {};
      const historyIndex = state.historyIndex + 1;
      return { layers: state.history[historyIndex], historyIndex, isDirty: true };
    }),

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.1, zoom)) }),
  markSaved: () => set({ isDirty: false }),
}));