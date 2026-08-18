"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useEditorStore } from "@/lib/editor/store";
import type { LayerDTO } from "@/lib/editor/types";

interface CanvasEngineProps {
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Owns the Fabric.js `Canvas` instance and keeps it in sync with the
 * Zustand editor store in both directions:
 *
 *  store → canvas: whenever `layers` changes for a reason other than the
 *    user actively dragging on this canvas (undo/redo, keyboard nudge,
 *    properties-panel edit, a duplicate/delete), reconcile Fabric objects
 *    to match.
 *
 *  canvas → store: on `object:modified` (fires once per drag/resize/rotate
 *    gesture, not per frame) write the final transform back with
 *    commit=true, which both updates history and marks autosave dirty.
 *
 * A ref-based id→object map avoids tearing down and rebuilding the whole
 * canvas on every store change.
 */
export function CanvasEngine({ canvasWidth, canvasHeight }: CanvasEngineProps) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const objectMapRef = useRef<Map<string, fabric.Object>>(new Map());
  const isInteractingRef = useRef(false);
  const suppressNextSelectionRef = useRef(false);

  const layers = useEditorStore((s) => s.layers);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const zoom = useEditorStore((s) => s.zoom);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const updateLayer = useEditorStore((s) => s.updateLayer);

  // --- init canvas once -----------------------------------------------
  useEffect(() => {
    if (!canvasElRef.current) return;
    const objectMap = objectMapRef.current;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: "transparent",
    });
    fabricRef.current = canvas;

    canvas.on("selection:created", (e) => {
      if (suppressNextSelectionRef.current) return;
      const obj = e.selected?.[0];
      const id = obj ? findLayerId(objectMapRef.current, obj) : null;
      selectLayer(id);
    });
    canvas.on("selection:updated", (e) => {
      const obj = e.selected?.[0];
      const id = obj ? findLayerId(objectMapRef.current, obj) : null;
      selectLayer(id);
    });
    canvas.on("selection:cleared", () => selectLayer(null));

    canvas.on("object:moving", () => {
      isInteractingRef.current = true;
    });
    canvas.on("object:scaling", () => {
      isInteractingRef.current = true;
    });
    canvas.on("object:rotating", () => {
      isInteractingRef.current = true;
    });

    canvas.on("object:modified", (e) => {
      isInteractingRef.current = false;
      const obj = e.target;
      if (!obj) return;
      const id = findLayerId(objectMapRef.current, obj);
      if (!id) return;

      updateLayer(
        id,
        {
          x: Math.round(obj.left ?? 0),
          y: Math.round(obj.top ?? 0),
          width: Math.round(obj.getScaledWidth()),
          height: Math.round(obj.getScaledHeight()),
          rotation: Math.round(obj.angle ?? 0),
          opacity: obj.opacity ?? 1,
        },
        true
      );
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      objectMap.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight]);

  // --- zoom -------------------------------------------------------------
  useEffect(() => {
    fabricRef.current?.setZoom(zoom);
    fabricRef.current?.setDimensions({ width: canvasWidth * zoom, height: canvasHeight * zoom });
  }, [zoom, canvasWidth, canvasHeight]);

  // --- store -> canvas reconciliation -----------------------------------
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || isInteractingRef.current) return;

    let cancelled = false;

    void (async () => {
      const map = objectMapRef.current;
      const currentIds = new Set(layers.map((l) => l.id));

      // remove objects for deleted layers
      for (const [id, obj] of map.entries()) {
        if (!currentIds.has(id)) {
          canvas.remove(obj);
          map.delete(id);
        }
      }

      // add or update
      for (const layer of [...layers].sort((a, b) => a.zIndex - b.zIndex)) {
        let obj = map.get(layer.id);

        if (!obj) {
          const created = await createFabricObject(layer);
          if (cancelled || !created) continue;
          obj = created;
          map.set(layer.id, obj);
          canvas.add(obj);
        }

        applyLayerToObject(obj, layer);
      }

      // z-order
      const ordered = [...layers]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((l) => map.get(l.id))
        .filter((o): o is fabric.Object => !!o);
      ordered.forEach((obj, idx) => canvas.moveObjectTo(obj, idx));

      canvas.requestRenderAll();
    })();

    return () => {
      cancelled = true;
    };
  }, [layers]);

  // --- external selection (e.g. from the layers panel) -> canvas --------
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = selectedLayerId ? objectMapRef.current.get(selectedLayerId) : null;

    suppressNextSelectionRef.current = true;
    if (obj && obj.selectable) {
      canvas.setActiveObject(obj);
    } else {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    suppressNextSelectionRef.current = false;
  }, [selectedLayerId]);

  return (
    <canvas
      ref={canvasElRef}
      role="img"
      aria-label="Design canvas"
      className="shadow-2xl"
    />
  );
}

function findLayerId(map: Map<string, fabric.Object>, obj: fabric.Object): string | null {
  for (const [id, o] of map.entries()) {
    if (o === obj) return id;
  }
  return null;
}

async function createFabricObject(layer: LayerDTO): Promise<fabric.Object | null> {
  if (layer.type === "TEXT") {
    return new fabric.FabricText(layer.text ?? "", {
      fontFamily: layer.fontFamily ?? "Arial",
      fontWeight: layer.fontWeight ?? 400,
      fill: layer.fill ?? "#000000",
    });
  }

  if (layer.sourceUrl) {
    try {
      const img = await fabric.FabricImage.fromURL(layer.sourceUrl, { crossOrigin: "anonymous" });
      return img;
    } catch {
      return null;
    }
  }

  // Fallback placeholder for shape/vector layers not yet backed by an asset.
  return new fabric.Rect({ fill: "#3a3a46", stroke: "#555", strokeWidth: 1 });
}

function applyLayerToObject(obj: fabric.Object, layer: LayerDTO) {
  const scaleX = obj.width ? layer.width / obj.width : 1;
  const scaleY = obj.height ? layer.height / obj.height : 1;

  obj.set({
    left: layer.x,
    top: layer.y,
    scaleX,
    scaleY,
    angle: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: !layer.locked,
    evented: !layer.locked,
    hasControls: !layer.locked,
    lockMovementX: layer.locked,
    lockMovementY: layer.locked,
    lockRotation: layer.locked,
    lockScalingX: layer.locked,
    lockScalingY: layer.locked,
  });

  if (obj instanceof fabric.FabricText && obj.text !== layer.text) {
    obj.set({ text: layer.text ?? "" });
  }

  obj.setCoords();
}