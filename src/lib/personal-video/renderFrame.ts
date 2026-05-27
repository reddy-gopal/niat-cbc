"use client";

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toBlob } from "html-to-image";
import { getTemplateComponent } from "@/components/personal-video/templates";
import {
  getStaticAssetPath,
  isImplementedTemplate,
  isStaticFrame,
  isTemplateFrame,
} from "./frameManifest";
import { preloadPhotos } from "./photoUtils";
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  type FrameId,
  type PersonalizationCopy,
  type PhotoSet,
  type RenderFrameOptions,
} from "./types";

const RENDER_CONCURRENCY = 3;

async function loadStaticBitmap(frameId: FrameId): Promise<ImageBitmap> {
  const path = getStaticAssetPath(frameId);
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load static frame: ${path}`);
  }
  const blob = await response.blob();
  return createImageBitmap(blob);
}

async function createFallbackBitmap(frameId: FrameId, message: string): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0D0D0D";
    ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    ctx.fillStyle = "#E91E8C";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Frame ${frameId}`, FRAME_WIDTH / 2, FRAME_HEIGHT / 2 - 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px sans-serif";
    ctx.fillText(message.slice(0, 60), FRAME_WIDTH / 2, FRAME_HEIGHT / 2 + 30);
  }
  return createImageBitmap(canvas);
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

async function renderTemplateToBlob(
  frameId: FrameId,
  copy: PersonalizationCopy,
  photos: PhotoSet,
  pixelRatio: number
): Promise<Blob> {
  const Template = getTemplateComponent(frameId);
  if (!Template) {
    throw new Error(`No template component for frame ${frameId}`);
  }

  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.left = "-9999px";
  host.style.top = "0";
  host.style.width = `${FRAME_WIDTH}px`;
  host.style.height = `${FRAME_HEIGHT}px`;
  host.style.overflow = "hidden";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  let root: Root | null = null;

  try {
    root = createRoot(host);
    root.render(createElement(Template, { copy, photos }));

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await document.fonts.ready;
    await waitForImages(host);

    const captureEl =
      (host.querySelector("[data-frame-export]") as HTMLElement | null) ?? host;
    const blob = await toBlob(captureEl, {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      pixelRatio,
      cacheBust: true,
      skipAutoScale: true,
    });

    if (!blob) {
      throw new Error("toBlob returned null");
    }
    return blob;
  } finally {
    if (root) {
      root.unmount();
    }
    host.remove();
  }
}

export async function renderFrameToBitmap(
  frameId: FrameId,
  options: RenderFrameOptions
): Promise<ImageBitmap> {
  const { copy, photos, pixelRatio = 1 } = options;

  try {
    const useTemplate = isTemplateFrame(frameId) && isImplementedTemplate(frameId);

    if (useTemplate) {
      // Template IS the full frame — no static PNG base layer
      const blob = await renderTemplateToBlob(frameId, copy, photos, pixelRatio);
      return createImageBitmap(blob);
    }

    if (!isStaticFrame(frameId) && isTemplateFrame(frameId)) {
      // Unimplemented template: fallback to reference PNG only
      return await loadStaticBitmap(frameId);
    }

    if (isStaticFrame(frameId)) {
      return await loadStaticBitmap(frameId);
    }

    throw new Error(`Frame ${frameId}: no renderer configured`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    console.error(`[renderFrame] frame ${frameId}:`, err);
    return await createFallbackBitmap(frameId, message);
  }
}

export async function renderFrameToDataUrl(
  frameId: FrameId,
  options: RenderFrameOptions
): Promise<string> {
  const bitmap = await renderFrameToBitmap(frameId, options);
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas unavailable");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onProgress?: (done: number, total: number) => void
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
      completed++;
      onProgress?.(completed, tasks.length);
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function renderAllFrames(
  options: RenderFrameOptions,
  frameIds: FrameId[],
  onProgress?: (done: number, total: number) => void
): Promise<ImageBitmap[]> {
  const photos = await preloadPhotos(options.photos);

  const tasks = frameIds.map(
    (id) => () => renderFrameToBitmap(id, { ...options, photos })
  );

  return runWithConcurrency(tasks, RENDER_CONCURRENCY, onProgress);
}

export function bitmapToCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D not available");
  }
  ctx.drawImage(bitmap, 0, 0);
  return canvas;
}
