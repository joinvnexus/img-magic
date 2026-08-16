"use client";

import { useEffect, useRef } from "react";
import { fabric } from "fabric";

interface CanvasEditorProps {
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
    if (!previewUrl) return;

    // Load preview image as background (non-selectable)
    fabric.Image.fromURL(previewUrl, (img) => {
      img.selectable = false;
      img.evented = false;
      const scaleX = canvas.width! / img.width!;
      const scaleY = canvas.height! / img.height!;
      const scale = Math.min(scaleX, scaleY);
      img.scale(scale);
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        originX: "left",
        originY: "top",
      });

      // Add a sample object to demonstrate selection/transform capabilities
      const rect = new fabric.Rect({
        left: 50,
        top: 50,
        width: 200,
        height: 120,
        fill: "rgba(255,255,255,0.5)",
        stroke: "#000",
        strokeWidth: 1,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    }, { crossOrigin: 'anonymous' });
  }, [previewUrl]);

  return <div ref={containerRef} className="w-full h-full flex items-center justify-center" />;
}
