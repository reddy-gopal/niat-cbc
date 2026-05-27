import type { PersonalizationCopy, PhotoSet } from "./types";

export type {
  PersonalizationCopy,
  PhotoSet,
  FrameId,
  RenderFrameOptions,
} from "./types";

export { FRAME_ORDER, FRAME_WIDTH, FRAME_HEIGHT } from "./types";

export interface PersonalizationPhotos {
  photo1: string | null;
  photo2: string | null;
  photo3: string | null;
}

export type PhotoKey = "photo1" | "photo2" | "photo3";

export interface PersonalizationPhotoPaths {
  photo1: string | null;
  photo2: string | null;
  photo3: string | null;
}

export const PHOTO_STORAGE_KEYS: PhotoKey[] = ["photo1", "photo2", "photo3"];

export function storagePathForPhoto(studentId: string, slot: PhotoKey, ext: "jpg" | "png"): string {
  return `personalization/${studentId}/${slot}.${ext}`;
}

export function parsePhotoPathsFromSubmission(fileUrl: string | null | undefined): PersonalizationPhotoPaths {
  if (!fileUrl) {
    return { photo1: null, photo2: null, photo3: null };
  }
  if (fileUrl.startsWith("{")) {
    try {
      const parsed = JSON.parse(fileUrl) as Partial<PersonalizationPhotoPaths>;
      return {
        photo1: parsed.photo1 ?? null,
        photo2: parsed.photo2 ?? null,
        photo3: parsed.photo3 ?? null,
      };
    } catch {
      return { photo1: fileUrl, photo2: null, photo3: null };
    }
  }
  return { photo1: fileUrl, photo2: null, photo3: null };
}

export function serializePhotoPaths(paths: PersonalizationPhotoPaths): string {
  return JSON.stringify(paths);
}

export function photosToPartialSet(photos: PersonalizationPhotos): Partial<PhotoSet> {
  return {
    photo1: photos.photo1 ?? undefined,
    photo2: photos.photo2 ?? undefined,
    photo3: photos.photo3 ?? undefined,
  };
}

export function withDefaultClosingLine(copy: PersonalizationCopy): PersonalizationCopy {
  if (copy.closingLine) return copy;
  return { ...copy, closingLine: "Your story is just beginning." };
}
