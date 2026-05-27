import type { FrameId, FrameManifestEntry } from "./types";

export {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  FRAME_DURATION_MS,
  CROSSFADE_MS,
  FRAME_ORDER,
} from "./types";

const MANIFEST: FrameManifestEntry[] = [
  { id: 1, type: "static", assetPath: "/frames/Screen_1.png" },
  { id: 2, type: "static", assetPath: "/frames/Screen_2.png" },
  { id: 3, type: "template" },
  { id: 4, type: "static", assetPath: "/frames/Screen_4.png" },
  { id: 5, type: "static", assetPath: "/frames/Screen_5.png" },
  { id: 6, type: "template" },
  { id: 7, type: "template" },
  { id: 8, type: "static", assetPath: "/frames/Screen_8.png" },
  { id: 9, type: "template" },
  { id: 10, type: "template" },
  { id: 11, type: "template" },
  { id: 12, type: "template" },
];

const manifestById = new Map<FrameId, FrameManifestEntry>(
  MANIFEST.map((entry) => [entry.id, entry])
);

export function getManifestEntry(id: FrameId): FrameManifestEntry {
  const entry = manifestById.get(id);
  if (!entry) {
    throw new Error(`Unknown frame id: ${id}`);
  }
  return entry;
}

export function isStaticFrame(id: FrameId): boolean {
  return getManifestEntry(id).type === "static";
}

export function isTemplateFrame(id: FrameId): boolean {
  return getManifestEntry(id).type === "template";
}

/** Templates implemented in Phase 1 — others fall back to static PNG until built. */
export const IMPLEMENTED_TEMPLATES: ReadonlySet<FrameId> = new Set([3]);

export function isImplementedTemplate(id: FrameId): boolean {
  return IMPLEMENTED_TEMPLATES.has(id);
}

/**
 * Static PNG path. Template frames that are implemented (e.g. 3) have no asset.
 * Unimplemented templates fall back to reference PNG until their React template ships.
 */
export function getStaticAssetPath(id: FrameId): string {
  const entry = getManifestEntry(id);
  if (entry.type === "static") {
    return entry.assetPath;
  }
  if (isTemplateFrame(id) && !isImplementedTemplate(id)) {
    return `/frames/Screen_${id}.png`;
  }
  throw new Error(`Frame ${id} has no static asset — render via template only`);
}

export { MANIFEST };
