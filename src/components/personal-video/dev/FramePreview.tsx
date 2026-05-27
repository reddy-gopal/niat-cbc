"use client";

import { useCallback, useMemo, useState } from "react";
import { MOCK_COPY } from "@/lib/personal-video/mockPersonalization";
import { renderFrameToDataUrl } from "@/lib/personal-video/renderFrame";
import { preloadPhotos, PLACEHOLDER_PHOTO_DATA_URL } from "@/lib/personal-video/photoUtils";
import type { FrameId, PersonalizationCopy } from "@/lib/personal-video/types";
import { IMPLEMENTED_TEMPLATES } from "@/lib/personal-video/frameManifest";

const TEMPLATE_FRAME_IDS = Array.from(IMPLEMENTED_TEMPLATES) as FrameId[];

export function FramePreview() {
  const [frameId, setFrameId] = useState<FrameId>(3);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(MOCK_COPY, null, 2));
  const [photoUrl, setPhotoUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [isRendering, setIsRendering] = useState(false);

  const copy = useMemo((): PersonalizationCopy | null => {
    try {
      return JSON.parse(jsonText) as PersonalizationCopy;
    } catch {
      return null;
    }
  }, [jsonText]);

  const referencePath = `/frames/Screen_${frameId}.png`;

  const handleGenerate = useCallback(async () => {
    if (!copy) {
      setError("Invalid JSON for PersonalizationCopy");
      return;
    }
    setError(null);
    setIsRendering(true);
    const start = performance.now();
    try {
      const photos = await preloadPhotos({
        photo1: photoUrl || PLACEHOLDER_PHOTO_DATA_URL,
        photo2: PLACEHOLDER_PHOTO_DATA_URL,
        photo3: PLACEHOLDER_PHOTO_DATA_URL,
      });
      const dataUrl = await renderFrameToDataUrl(frameId, { copy, photos });
      setGeneratedUrl(dataUrl);
      setRenderMs(Math.round(performance.now() - start));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed");
    } finally {
      setIsRendering(false);
    }
  }, [copy, frameId, photoUrl]);

  const handleDownload = () => {
    if (!generatedUrl) return;
    const a = document.createElement("a");
    a.href = generatedUrl;
    a.download = `Screen_${frameId}_generated.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-2">Frame preview (dev)</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Compare reference PNG vs html-to-image generated template.
      </p>

      <div className="flex flex-wrap gap-6 mb-8">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-zinc-500">Frame</span>
          <select
            value={frameId}
            onChange={(e) => setFrameId(Number(e.target.value) as FrameId)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2"
          >
            {TEMPLATE_FRAME_IDS.map((id) => (
              <option key={id} value={id}>
                Screen {id}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 flex-1 min-w-[200px]">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Photo URL (photo1)
          </span>
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Supabase signed URL or leave empty for placeholder"
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-2 w-48">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Overlay opacity
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
          />
        </label>
      </div>

      <label className="block mb-4">
        <span className="text-xs uppercase tracking-widest text-zinc-500">PersonalizationCopy JSON</span>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={14}
          className="mt-2 w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg p-4"
        />
      </label>

      {copy === null && (
        <p className="text-red-400 text-sm mb-4">JSON parse error — fix copy above.</p>
      )}

      <div className="flex gap-4 mb-8">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isRendering || !copy}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg font-semibold disabled:opacity-50"
        >
          {isRendering ? "Generating…" : "Generate"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!generatedUrl}
          className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold disabled:opacity-50"
        >
          Download PNG
        </button>
        {renderMs !== null && (
          <span className="self-center text-zinc-400 text-sm">Rendered in {renderMs}ms</span>
        )}
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">
            Reference
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={referencePath}
            alt={`Reference Screen ${frameId}`}
            className="w-full max-w-[360px] rounded-xl border border-zinc-800"
          />
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">
            Generated
          </h2>
          {generatedUrl ? (
            <div className="relative w-full max-w-[360px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedUrl}
                alt="Generated frame"
                className="w-full rounded-xl border border-zinc-800"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referencePath}
                alt=""
                className="absolute inset-0 w-full h-full object-contain rounded-xl pointer-events-none"
                style={{ opacity: overlayOpacity, mixBlendMode: "normal" }}
              />
            </div>
          ) : (
            <div className="w-full max-w-[360px] aspect-[9/16] bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-600">
              Click Generate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
