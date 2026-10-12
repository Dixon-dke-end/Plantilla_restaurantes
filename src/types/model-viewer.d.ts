import type { DetailedHTMLProps, HTMLAttributes } from "react";

export type Vector3D = { x: number; y: number; z: number };

export type ModelViewerHotspot = {
  name: string;
  facingCamera: boolean;
  canvasPosition: { x: number; y: number };
};

/** The parts of <model-viewer>'s element API this app uses. */
export interface ModelViewerElement extends HTMLElement {
  src: string | null;
  loaded: boolean;
  canActivateAR: boolean;
  getDimensions(): Vector3D;
  getBoundingBoxCenter(): Vector3D;
  activateAR(): Promise<void>;
  updateHotspot(config: { name: string; position?: string; normal?: string }): void;
  queryHotspot(name: string): ModelViewerHotspot | null;
}

type ModelViewerAttributes = {
  src?: string;
  "ios-src"?: string;
  alt?: string;
  poster?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "ar-scale"?: "auto" | "fixed";
  "ar-placement"?: "floor" | "wall";
  "camera-controls"?: boolean;
  "touch-action"?: string;
  "shadow-intensity"?: string;
  exposure?: string;
  "environment-image"?: string;
  scale?: string;
  reveal?: "auto" | "manual";
  loading?: "auto" | "lazy" | "eager";
  "interaction-prompt"?: "auto" | "none";
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & ModelViewerAttributes;
    }
  }
}
