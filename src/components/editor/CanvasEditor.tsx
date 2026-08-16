"use client";

import { useEffect, useRef } from "react";
import { fabric } from "fabric";

interface CanvasEditorProps {
  projectId: string;
  previewUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  onRegisterEditorApi?: (api: { undo: () => void; redo: () => void; canUndo: () => boolean; canRedo: () => boolean }) => void;
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
            const scaleX = canvas.width! / (img.width ?? canvas.width!);
            const scaleY = canvas.height! / (img.height ?? canvas.height!);
            const scale = Math.min(scaleX, scaleY);
            img.scale(scale);
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
              originX: 'left',
              originY: 'top',
            });
          }, { crossOrigin: 'anonymous' });
        }

        // Render image layers (non-background)
        const imageLayers = layers.filter((l: any) => l.type === 'IMAGE');
        for (const l of imageLayers) {
          if (!l.assetUrl) continue;
          // add image object
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolveInner) => {
            fabric.Image.fromURL(l.assetUrl, (img) => {
              img.set({ left: l.x ?? 0, top: l.y ?? 0, angle: l.rotation ?? 0, opacity: l.opacity ?? 1 });
              if (l.width) img.scaleToWidth(l.width);
              canvas.add(img);
              // annotate with source asset id so autosave can preserve it
              // @ts-ignore
              img.__sourceAssetId = l.sourceAssetId ?? null;
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
          // @ts-ignore
          text.__layerId = t.id;
          canvas.add(text);
        }

        // If there were no editable layers, add a sample rect for demo
        if (layers.length === 0) {
          const rect = new fabric.Rect({ left: 50, top: 50, width: 200, height: 120, fill: 'rgba(255,255,255,0.5)', stroke: '#000', strokeWidth: 1 });
          canvas.add(rect);
          canvas.setActiveObject(rect);
        }

        // Set up undo/redo history
        const history: string[] = [];
        let historyIndex = -1;
        const pushHistory = () => {
          try {
            const json = JSON.stringify(canvas.toJSON(['__sourceAssetId', 'metadata', 'visible', 'locked']));
            // if not at the end, truncate future
            if (historyIndex < history.length - 1) {
              history.splice(historyIndex + 1);
            }
            history.push(json);
            historyIndex = history.length - 1;
            updateApi();
          } catch (e) {
            // ignore
          }
        };

        const loadHistoryIndex = (index: number) => {
          if (index < 0 || index >= history.length) return;
          const state = history[index];
          canvas.loadFromJSON(state, () => {
            canvas.renderAll();
          });
          historyIndex = index;
          updateApi();
        };

        const undo = () => {
          if (historyIndex > 0) {
            loadHistoryIndex(historyIndex - 1);
          }
        };

        const redo = () => {
          if (historyIndex < history.length - 1) {
            loadHistoryIndex(historyIndex + 1);
          }
        };

        const canUndo = () => historyIndex > 0;
        const canRedo = () => historyIndex < history.length - 1;

        const updateApi = () => {
          if (onRegisterEditorApi) {
            onRegisterEditorApi({ undo, redo, canUndo, canRedo });
          }
        };

        // push initial state
        pushHistory();

        // Attach change listeners for autosave (debounced) and history
        const autosaveDelay = 800;
        let saveTimer: ReturnType<typeof setTimeout> | null = null;

        const serializeAndSave = async () => {
          if (!projectId) return;
          const objects = canvas.getObjects();
          const layersToSave = objects.map((obj: any) => {
            const base = {
              type: 'IMAGE' as const,
              name: obj.name ?? 'Layer',
              x: obj.left ?? 0,
              y: obj.top ?? 0,
              width: obj.width ? (obj.width * (obj.scaleX ?? 1)) : (obj.getScaledWidth ? obj.getScaledWidth() : undefined),
              height: obj.height ? (obj.height * (obj.scaleY ?? 1)) : (obj.getScaledHeight ? obj.getScaledHeight() : undefined),
              rotation: obj.angle ?? 0,
              opacity: obj.opacity ?? 1,
              visible: obj.visible ?? true,
              locked: false,
              metadata: null,
              sourceAssetId: obj.__sourceAssetId ?? null,
              text: null,
            };

            if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
              return {
                ...base,
                type: 'TEXT',
                text: obj.text ?? '',
                fontFamily: obj.fontFamily ?? 'Arial',
                fontSize: obj.fontSize ?? 24,
                fontWeight: obj.fontWeight ?? 400,
                fill: obj.fill ?? '#000',
              };
            }

            if (obj.type === 'image') {
              return { ...base, type: 'IMAGE' };
            }

            // fallback shape
            return { ...base, type: 'SHAPE' };
          });

          try {
            await fetch(`/api/projects/${encodeURIComponent(projectId)}/design/version`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ layers: layersToSave }),
            });
          } catch (e) {
            // ignore save errors for now — show UI later
            // console.error('Autosave failed', e);
          }
        };

        const scheduleSave = () => {
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(async () => {
            pushHistory();
            await serializeAndSave();
          }, autosaveDelay);
        };

        canvas.on('object:modified', scheduleSave);
        canvas.on('object:added', scheduleSave);
        canvas.on('object:removed', scheduleSave);

        // keyboard shortcuts for undo/redo
        const onKeyDown = (e: KeyboardEvent) => {
          const isMac = navigator.platform.toLowerCase().includes('mac');
          const meta = isMac ? e.metaKey : e.ctrlKey;
          if (meta && e.key.toLowerCase() === 'z') {
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            e.preventDefault();
          }
        };

        window.addEventListener('keydown', onKeyDown);

        // cleanup listeners on unmount or reload
        return () => {
          canvas.off('object:modified', scheduleSave);
          canvas.off('object:added', scheduleSave);
          canvas.off('object:removed', scheduleSave);
          if (saveTimer) clearTimeout(saveTimer);
          window.removeEventListener('keydown', onKeyDown as any);
        };
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
