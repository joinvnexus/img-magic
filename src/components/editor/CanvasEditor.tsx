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
            selectable: true,
            editable: true,
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
            onRegisterEditorApi({
            undo,
            redo,
            canUndo,
            canRedo,
            listLayers: () => canvas.getObjects().map((o:any, idx:number) => ({
              id: o.__layerId ?? idx,
              type: o.type,
              name: o.name ?? (o.type === 'image' ? `Image ${idx}` : `Layer ${idx}`),
              visible: o.visible ?? true,
              locked: o.locked ?? false,
            })),
            bringForward: (index: number) => {
              const obj = canvas.item(index);
              if (obj) canvas.bringForward(obj);
              canvas.renderAll();
            },
            sendBackward: (index: number) => {
              const obj = canvas.item(index);
              if (obj) canvas.sendBackwards(obj);
              canvas.renderAll();
            },
            moveToIndex: (fromIdx:number, toIdx:number) => {
              const obj = canvas.item(fromIdx);
              if (!obj) return;
              canvas.remove(obj);
              canvas.insertAt(obj, toIdx);
              canvas.renderAll();
            },
            toggleVisibility: (index:number) => {
              const obj = canvas.item(index);
              if (!obj) return;
              obj.visible = !obj.visible;
              canvas.renderAll();
            },
            toggleLock: (index:number) => {
              const obj = canvas.item(index);
              if (!obj) return;
              obj.lockMovementX = obj.lockMovementX ? false : true;
              obj.lockMovementY = obj.lockMovementY ? false : true;
              obj.lockScalingX = obj.lockScalingX ? false : true;
              obj.lockScalingY = obj.lockScalingY ? false : true;
              obj.lockRotation = obj.lockRotation ? false : true;
              canvas.renderAll();
            },
            renameLayer: (index:number, name:string) => {
              const obj = canvas.item(index);
              if (!obj) return;
              obj.name = name;
              canvas.renderAll();
            },
            deleteLayer: (index:number) => {
              const obj = canvas.item(index);
              if (!obj) return;
              canvas.remove(obj);
              canvas.renderAll();
            },
            duplicateLayer: (index:number) => {
              const obj = canvas.item(index);
              if (!obj) return;
              obj.clone((cloned:any) => {
                cloned.set({ left: (cloned.left ?? 0) + 10, top: (cloned.top ?? 0) + 10 });
                canvas.add(cloned);
                canvas.renderAll();
              });
            }
          });
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

        // Double-click text to enter inline edit mode
        // fabric mouse:dblclick event provides target in e.target
        // @ts-ignore
        canvas.on('mouse:dblclick', (opt: any) => {
          const target = opt && opt.target;
          if (target && (target.type === 'textbox' || target.type === 'i-text' || target.type === 'text')) {
            canvas.setActiveObject(target);
            // @ts-ignore
            if (typeof target.enterEditing === 'function') {
              // @ts-ignore
              target.enterEditing();
            }
          }
        });

        // When text editing exits, schedule a save and push history
        // @ts-ignore
        canvas.on('text:editing:exited', (opt: any) => {
          scheduleSave();
          pushHistory();
          updateApi();
        });

        // keyboard shortcuts for undo/redo, copy/paste/duplicate, delete
        let clipboard: any = null;
        const onKeyDown = (e: KeyboardEvent) => {
          const isMac = navigator.platform.toLowerCase().includes('mac');
          const meta = isMac ? e.metaKey : e.ctrlKey;

          // Undo / Redo
          if (meta && e.key.toLowerCase() === 'z') {
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            e.preventDefault();
            return;
          }

          // Copy
          if (meta && e.key.toLowerCase() === 'c') {
            const active = canvas.getActiveObject();
            const activeSelection = (canvas as any).getActiveObjects ? (canvas as any).getActiveObjects() : (active ? [active] : []);
            if (activeSelection && activeSelection.length > 0) {
              // for simplicity store the JSON of the first active object or the group
              clipboard = activeSelection.map((o: any) => o.toJSON(['__sourceAssetId', 'metadata', 'visible', 'locked']));
            }
            e.preventDefault();
            return;
          }

          // Paste
          if (meta && e.key.toLowerCase() === 'v') {
            if (clipboard) {
              // Paste each item from clipboard
              for (const itemJson of clipboard) {
                // fabric.util.enlivenObjects expects array, but we can load via canvas.loadFromJSON snippet
                fabric.util.enlivenObjects([itemJson], (enlivened: any[]) => {
                  for (const obj of enlivened) {
                    // offset pasted object a bit
                    obj.set({ left: (obj.left ?? 0) + 10, top: (obj.top ?? 0) + 10 });
                    canvas.add(obj);
                  }
                  canvas.requestRenderAll();
                  pushHistory();
                  scheduleSave();
                });
              }
            }
            e.preventDefault();
            return;
          }

          // Duplicate (Cmd/Ctrl + D)
          if (meta && e.key.toLowerCase() === 'd') {
            const active = canvas.getActiveObject();
            const activeSelection = (canvas as any).getActiveObjects ? (canvas as any).getActiveObjects() : (active ? [active] : []);
            if (activeSelection && activeSelection.length > 0) {
              for (const obj of activeSelection) {
                obj.clone((cloned: any) => {
                  cloned.set({ left: (cloned.left ?? 0) + 10, top: (cloned.top ?? 0) + 10 });
                  canvas.add(cloned);
                  canvas.requestRenderAll();
                });
              }
              pushHistory();
              scheduleSave();
            }
            e.preventDefault();
            return;
          }

          // Delete / Backspace
          if (e.key === 'Delete' || e.key === 'Backspace') {
            const active = canvas.getActiveObjects ? canvas.getActiveObjects() : (canvas.getActiveObject() ? [canvas.getActiveObject()] : []);
            if (active && active.length > 0) {
              active.forEach((obj: any) => canvas.remove(obj));
              canvas.discardActiveObject();
              canvas.requestRenderAll();
              pushHistory();
              scheduleSave();
            }
            e.preventDefault();
            return;
          }
        };

        window.addEventListener('keydown', onKeyDown);

        // cleanup listeners on unmount or reload
        return () => {
          canvas.off('object:modified', scheduleSave);
          canvas.off('object:added', scheduleSave);
          canvas.off('object:removed', scheduleSave);
          // @ts-ignore
          canvas.off('mouse:dblclick');
          // @ts-ignore
          canvas.off('text:editing:exited');
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
