export interface PersonalizationCopy {
  fullName: string;
  tribeName: string;
  lovedMostHeadline: string;
  lovedMostSubline: string;
  personaTitle: string;
  personaTagline: string;
  cameFor: string;
  stayedFor: string;
  leftAs: string;
  closingLine: string;
}

export interface PhotoSet {
  photo1: string;
  photo2: string;
  photo3: string;
}

export type FrameId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type FrameManifestEntry =
  | { id: FrameId; type: "static"; assetPath: string }
  | { id: FrameId; type: "template" };

export interface RenderFrameOptions {
  copy: PersonalizationCopy;
  photos: PhotoSet;
  pixelRatio?: number;
}

export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1920;
export const FRAME_DURATION_MS = 2500;
export const CROSSFADE_MS = 300;

export const FRAME_ORDER: FrameId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
