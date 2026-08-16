"use client";

import { useEffect, useRef } from "react";
import { fabric } from "fabric";

interface CanvasEditorProps {
  projectId: string;
  previewUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

export function CanvasEditor({ previewUrl, canvasWidth, canvasHeight }: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const canvasEl = document.createElement("canvas");
    canvasEl.width = Math.min(canvasWidth, 2000);
    canvasEl.height = Math.min(canvasHeight, 2000);
    canvasEl.style.maxWidth = "100%";
    canvasEl.style.maxHeight = "100%";

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(canvasEl);

    const canvas = new fabric.Canvas(canvasEl, {
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: "#ffffff",
    });

    canvasRef.current = canvas;

    // Clean up on unmount
    return () => {
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Load design & layers from server if projectId is provided
    if (!projectId) return;

    (async () => {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/design/latest`);
        if (!res.ok) return;
        const json = await res.json();
        const layers = json.layers ?? [];

        // set background if a BACKGROUND layer exists
        const bg = layers.find((l: any) => l.type === 'BACKGROUND');
        if (bg && bg.assetUrl) {
          fabric.Image.fromURL(bg.assetUrl, (img) => {
            img.selectable = false;
            img.evented = false;
            const scaleX = canvas.width! / img.width!;
            const scaleY = canvas.height! / img.height!;
            const scale = Math.min(scaleX, scaleY);
            img.scale(scale);
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
              originX: 'left',
              originY: 'top',
            });
          }, { crossOrigin: 'anonymous' });
        }

        // Render image layers (non-background)
        const imageLayers = layers.filter((l: any) => l.type === 'IMAGE' || l.type === 'BACKGROUND');
        for (const l of imageLayers) {
          if (!l.assetUrl) continue;
          // skip background since already set
          if (l.type === 'BACKGROUND') continue;
          // add image object
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolveInner) => {
            fabric.Image.fromURL(l.assetUrl, (img) => {
              img.set({ left: l.x ?? 0, top: l.y ?? 0, angle: l.rotation ?? 0, opacity: l.opacity ?? 1 });
              img.scaleToWidth(l.width ?? img.width ?? 100);
              canvas.add(img);
              resolveInner();
            }, { crossOrigin: 'anonymous' });
          });
        }

        // Render text layers
        const textLayers = layers.filter((l: any) => l.type === 'TEXT');
        for (const t of textLayers) {
          const text = new fabric.Textbox(t.text ?? '', {
            left: t.x ?? 0,
            top: t.y ?? 0,
            angle: t.rotation ?? 0,
            fontSize: t.fontSize ?? 24,
            fontFamily: t.fontFamily ?? 'Arial',
            fontWeight: t.fontWeight ?? 400,
            fill: t.fill ?? '#000',
          });
          canvas.add(text);
        }

        // If there were no editable layers, add a sample rect for demo
        if (layers.length === 0) {
          const rect = new fabric.Rect({ left: 50, top: 50, width: 200, height: 120, fill: 'rgba(255,255,255,0.5)', stroke: '#000', strokeWidth: 1 });
          canvas.add(rect);
          canvas.setActiveObject(rect);
        }
      } catch (err) {
        // fallback: add sample rect
        const rect = new fabric.Rect({ left: 50, top: 50, width: 200, height: 120, fill: 'rgba(255,255,255,0.5)', stroke: '#000', strokeWidth: 1 });
        canvas.add(rect);
        canvas.setActiveObject(rect);
      }
    })();
  }, [projectId]);

  return <div ref={containerRef} className="w-full h-full flex items-center justify-center" />;
}
