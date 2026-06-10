/**
 * Adapter for PersonalVideoSlideshow — delegates to template/static renderFrame pipeline.
 * Canvas text patching has been removed.
 */
import { FRAME_ORDER, type FrameId } from "./types";
import type { PersonalizationCopy, PersonalizationPhotos } from "./personalization";
import { photosToPartialSet, withDefaultClosingLine } from "./personalization";
import { renderAllFrames, renderFrameToBitmap, bitmapToCanvas } from "./renderFrame";
import { preloadPhotos } from "./photoUtils";

export { FRAME_WIDTH, FRAME_HEIGHT, FRAME_ORDER, FRAME_DURATION_MS, CROSSFADE_MS } from "./frameManifest";
export type { FrameId } from "./types";

export function clearComposeCache(): void {
  // No-op; photo cache cleared via photoUtils if needed
}

export async function composeFrame(
  frameId: FrameId,
  copy: PersonalizationCopy,
  photos: PersonalizationPhotos
): Promise<HTMLCanvasElement> {
  const preloaded = await preloadPhotos(photosToPartialSet(photos));
  const bitmap = await renderFrameToBitmap(frameId, {
    copy: withDefaultClosingLine(copy),
    photos: preloaded,
  });
  const canvas = bitmapToCanvas(bitmap);
  bitmap.close();
  return canvas;
}

export async function composeAllFrames(
  copy: PersonalizationCopy,
  photos: PersonalizationPhotos,
  frameIds: FrameId[] = FRAME_ORDER,
  onProgress?: (done: number, total: number) => void
): Promise<HTMLCanvasElement[]> {
  const preloaded = await preloadPhotos(photosToPartialSet(photos));
  const bitmaps = await renderAllFrames(
    { copy: withDefaultClosingLine(copy), photos: preloaded },
    frameIds,
    onProgress
  );
  return bitmaps.map((bitmap) => {
    const canvas = bitmapToCanvas(bitmap);
    bitmap.close();
    return canvas;
  });
}

export async function canvasToImageBitmap(canvas: HTMLCanvasElement): Promise<ImageBitmap> {
  return createImageBitmap(canvas);
}
