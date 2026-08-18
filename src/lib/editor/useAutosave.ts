"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "./store";

const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Watches the store for unsaved changes and PATCHes them to
 * /api/projects/[id]/design after a debounce, so we don't fire a request
 * per drag frame (section 25 of the spec). Only sends transform fields —
 * Phase 2 scope is move/resize/rotate/visibility/lock/order, not content.
 */
export function useAutosave(projectId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<"idle" | "saving" | "saved">("idle");

  const layers = useEditorStore((s) => s.layers);
  const isDirty = useEditorStore((s) => s.isDirty);
  const designVersionId = useEditorStore((s) => s.designVersionId);
  const markSaved = useEditorStore((s) => s.markSaved);

  useEffect(() => {
    if (!isDirty || !designVersionId) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      statusRef.current = "saving";
      try {
        await fetch(`/api/projects/${projectId}/design`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            designVersionId,
            patches: layers
              .filter((l) => !l.id.startsWith("local_")) // don't try to save not-yet-persisted duplicates
              .map((l) => ({
                id: l.id,
                x: l.x,
                y: l.y,
                width: l.width,
                height: l.height,
                rotation: l.rotation,
                opacity: l.opacity,
                visible: l.visible,
                locked: l.locked,
                zIndex: l.zIndex,
              })),
          }),
        });
        markSaved();
        statusRef.current = "saved";
      } catch {
        statusRef.current = "idle"; // retry on next change
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, layers, designVersionId, projectId]);

  return { getStatus: () => statusRef.current };
}