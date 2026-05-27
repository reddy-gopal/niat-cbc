import type { PhotoSet } from "./types";

const dataUrlCache = new Map<string, string>();

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <rect fill="#1A1A2E" width="400" height="500"/>
  <circle cx="200" cy="180" r="60" fill="#2a2a4e"/>
  <rect x="120" y="280" width="160" height="12" rx="6" fill="#2a2a4e"/>
</svg>`;

export const PLACEHOLDER_PHOTO_DATA_URL = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_SVG)}`;

/**
 * Converts a remote URL (including Supabase signed URLs) to a data URL.
 */
export async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) {
    return url;
  }

  const cached = dataUrlCache.get(url);
  if (cached) return cached;

  const response = await fetch(url, { mode: "cors", credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return a data URL"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });

  dataUrlCache.set(url, dataUrl);
  return dataUrl;
}

export async function preloadPhotos(
  photos: Partial<PhotoSet> & { photo1?: string; photo2?: string; photo3?: string }
): Promise<PhotoSet> {
  const keys = ["photo1", "photo2", "photo3"] as const;

  const entries = await Promise.all(
    keys.map(async (key) => {
      const url = photos[key];
      if (!url) {
        return [key, PLACEHOLDER_PHOTO_DATA_URL] as const;
      }
      try {
        const dataUrl = await urlToDataUrl(url);
        return [key, dataUrl] as const;
      } catch {
        return [key, PLACEHOLDER_PHOTO_DATA_URL] as const;
      }
    })
  );

  return {
    photo1: entries[0][1],
    photo2: entries[1][1],
    photo3: entries[2][1],
  };
}

export function clearPhotoCache(): void {
  dataUrlCache.clear();
}
