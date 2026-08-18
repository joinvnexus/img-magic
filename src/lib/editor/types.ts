/**
 * Plain-object shape of a Layer as it travels over the wire between the
 * server and the editor. Deliberately not the Prisma `Layer` type directly
 * — the client never imports `@prisma/client` — this is the one place that
 * shape is defined for the frontend.
 */
export type LayerType =
  | "BACKGROUND"
  | "IMAGE"
  | "TEXT"
  | "SHAPE"
  | "VECTOR"
  | "GROUP"
  | "MASK"
  | "ADJUSTMENT";

export interface LayerDTO {
  id: string;
  type: LayerType;
  name: string;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;

  // image/shape layers
  sourceAssetId: string | null;
  sourceUrl: string | null; // resolved /api/assets/... URL, added server-side for convenience

  // text layers
  text: string | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  fill: string | null;

  confidence: number | null;
}

export interface DesignDTO {
  designId: string;
  designVersionId: string;
  versionNumber: number;
  canvasWidth: number;
  canvasHeight: number;
  layers: LayerDTO[];
}

/** Fields the client is allowed to change via autosave (transform only, Phase 2 scope). */
export interface LayerTransformPatch {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  zIndex?: number;
}