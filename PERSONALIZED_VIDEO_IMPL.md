# Personalized Video Feature — Full Implementation Brief

Share this file with Claude in the new branch to implement the full feature from scratch.

---

## What this feature does

`/profile/personal-video` — a page where a student uploads 3 personal photos, then generates a downloadable personalized ~30-second cinematic reel (12 slides, 9:16 canvas) with their name, tribe name, and bootcamp story overlaid on branded frames.

---

## Routes to create

| Type | Path | File |
|---|---|---|
| Page | `/profile/personal-video` | `src/app/profile/personal-video/page.tsx` |
| API  | `POST /api/submissions/upload-personal` | `src/app/api/submissions/upload-personal/route.ts` |
| Dev tool | `/dev/frame-preview` | `src/app/dev/frame-preview/page.tsx` |

---

## Files to create (20 total)

### 1. `src/app/profile/personal-video/page.tsx`
Server component. Auth-gated (`getStudentSession` → redirect `/` if no session).
- Fetches `submissions` table: `student_id = session.studentId`, `task_id = 7`, selects `file_url, status`
- Fetches `students` table: selects `full_name, team_id, teams:team_id(name)`
- If submission status = `"accepted"` and `file_url` exists → `parsePhotoPathsFromSubmission(file_url)` → for each non-null path call `supabase.storage.from("images").createSignedUrl(path, 3600)` to get signed URLs
- Calls `resolvePersonalization({ fullName, tribeName })` to get `{ copy, isMock }`
- Renders `<PersonalVideoClient session={session} initialPhotos={photos} copy={copy} isMockData={isMock} />`

### 2. `src/app/api/submissions/upload-personal/route.ts`
`POST` handler. Auth via `getStudentFromRequest(request)`.
- Reads `FormData`: `file` (File, must be `image/*`) and `slot` (`"photo1" | "photo2" | "photo3"`, defaults to `"photo1"`)
- Storage path: `personalization/${studentId}/${slot}.${ext}` — use `adminClient.storage.from("images").upload(path, bytes, { upsert: true })`
- Upserts `submissions` table: `{ student_id, bootcamp_id, section_id, region_id, task_id: 7, status: "accepted", file_url: serializePhotoPaths(paths), points: 0, verified_at, updated_at }` with `onConflict: "student_id,task_id"`
- Returns `{ success: true, slot, fileUrl, paths }`

### 3. `src/app/dev/frame-preview/page.tsx`
```tsx
import { FramePreview } from "@/components/personal-video/dev/FramePreview";
export default function Page() { return <FramePreview />; }
```

---

## Lib files

### 4. `src/lib/personal-video/types.ts`
```ts
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
```

### 5. `src/lib/personal-video/personalization.ts`
Re-exports types from `./types`. Also defines:
- `PersonalizationPhotos` — `{ photo1: string|null, photo2: string|null, photo3: string|null }`
- `PhotoKey` — `"photo1" | "photo2" | "photo3"`
- `PersonalizationPhotoPaths` — same shape as PersonalizationPhotos
- `storagePathForPhoto(studentId, slot, ext)` → `personalization/${studentId}/${slot}.${ext}`
- `parsePhotoPathsFromSubmission(fileUrl)` — if starts with `{` try JSON.parse, else return `{ photo1: fileUrl, photo2: null, photo3: null }`
- `serializePhotoPaths(paths)` → `JSON.stringify(paths)`
- `photosToPartialSet(photos)` → replaces null with undefined
- `withDefaultClosingLine(copy)` → if `copy.closingLine` is empty sets `"Your story is just beginning."`

### 6. `src/lib/personal-video/mockPersonalization.ts`
```ts
const MOCK_COPY: PersonalizationCopy = {
  fullName: "Arjun Mehta",
  tribeName: "Neural Navigators",
  lovedMostHeadline: "The 3AM debugging sessions",
  lovedMostSubline: "with people who got it",
  personaTitle: "THE BIONIC ENGINEER",
  personaTagline: "Builds Machines That Read The Human Body",
  cameFor: "Hack The Human Signal",
  stayedFor: "Tribe Song",
  leftAs: "The Bionic Engineer",
  closingLine: "Your story is just beginning.",
};

export interface PersonalizationContext { copy: PersonalizationCopy; isMock: boolean; }

export function getPersonalizationForStudent(
  _studentId: string,
  profile?: { fullName?: string; tribeName?: string }
): PersonalizationContext {
  const copy = { ...MOCK_COPY, ...(profile?.fullName ? { fullName: profile.fullName } : {}), ...(profile?.tribeName ? { tribeName: profile.tribeName } : {}) };
  return { copy, isMock: true };
}

export { MOCK_COPY };
```

### 7. `src/lib/personal-video/getPersonalization.ts`
```ts
import { getPersonalizationForStudent } from "./mockPersonalization";
export function resolvePersonalization(profile?: { fullName?: string; tribeName?: string }) {
  return getPersonalizationForStudent("local", profile);
}
// mergeSheetFeedback stub — future Google Sheets integration
export function mergeSheetFeedback(copy, _sheetRow) { if (!_sheetRow) return copy; return copy; }
```

### 8. `src/lib/personal-video/designTokens.ts`
Design tokens object `TOKENS` with:
- `colors`: background `#0D0D0D`, outerFrame `#0D0005`, primary `#E91E8C`, accent `#FFD700`, maroon `#6B0F1A`, etc.
- `gradients`: pinkFade, pinkFadeVertical, heroCard, redCard, etc.
- `radii`, `spacing`, `font` (heading/body families, sizes display→caption, weights)
- `frame`: `{ width: 1080, height: 1920 }`

### 9. `src/lib/personal-video/frameManifest.ts`
MANIFEST array mapping FrameId → `type: "static"` (with assetPath `/frames/Screen_N.png`) or `type: "template"`:
- Static: 1, 2, 4, 5, 8
- Template: 3, 6, 7, 9, 10, 11, 12
- `IMPLEMENTED_TEMPLATES = new Set([3])` — only Screen03 is a React template; others fall back to static PNG
- Exports: `getManifestEntry`, `isStaticFrame`, `isTemplateFrame`, `isImplementedTemplate`, `getStaticAssetPath`
- Re-exports `FRAME_WIDTH, FRAME_HEIGHT, FRAME_DURATION_MS, CROSSFADE_MS, FRAME_ORDER` from types

### 10. `src/lib/personal-video/photoUtils.ts`
- `PLACEHOLDER_PHOTO_DATA_URL` — base64 SVG placeholder
- `urlToDataUrl(url)` — fetches remote URL (including Supabase signed URLs) and converts to data URL, with in-memory cache
- `preloadPhotos(photos)` — resolves all 3 photo slots to data URLs (placeholder if null/error)
- `clearPhotoCache()`

### 11. `src/lib/personal-video/renderFrame.ts`
`"use client"` — browser only (uses DOM, `html-to-image`).
- `renderFrameToBitmap(frameId, options)` — if implemented template: renders React component to off-screen div → `html-to-image` `toBlob` → `createImageBitmap`; if unimplemented template or static: `fetch(assetPath)` → `createImageBitmap`; falls back to placeholder canvas on error
- `renderFrameToDataUrl(frameId, options)` — calls renderFrameToBitmap, draws to canvas, returns data URL
- `renderAllFrames(options, frameIds, onProgress)` — runs renderFrameToBitmap for all frames with concurrency limit 3
- `bitmapToCanvas(bitmap)` — draws bitmap onto new 1080×1920 canvas

### 12. `src/lib/personal-video/composeFrame.ts`
Thin adapter:
- `composeFrame(frameId, copy, photos)` → preloadPhotos → renderFrameToBitmap → bitmapToCanvas
- `composeAllFrames(copy, photos, frameIds, onProgress)` → preloadPhotos → renderAllFrames → map to canvases
- Re-exports frameManifest constants

---

## Component files

### 13. `src/components/personal-video/templates/index.ts`
Maps `FrameId → ComponentType`. Currently only `3 → Screen03`.
```ts
const TEMPLATE_MAP = { 3: Screen03 };
export function getTemplateComponent(frameId) { return TEMPLATE_MAP[frameId] ?? null; }
```

### 14. `src/components/personal-video/templates/FrameShell.tsx`
Wrapper div `data-frame-export` at 1080×1920 with:
- Background gradient
- Dot-grid overlay (radial-gradient, 24px repeat, 35% opacity)
- 4 corner SVG stars (8-pointed, white 10-12% opacity)
- Children in absolute inset container z-10

### 15. `src/components/personal-video/templates/Screen03.tsx`
Photo frame slide:
- `<FrameShell background={TOKENS.colors.outerFrame}>`
- Inset 40px rounded-28 div with user `photos.photo1` covering full area (`object-fit: cover, object-position: center top`)
- Bottom gradient overlay (transparent → rgba(0,0,0,0.88))
- `copy.fullName` text at bottom-center (52px bold, white)

### 16. `src/components/personal-video/templates/typography/GradientHeadline.tsx`
Splits text, last word gets pink→white gradient (`backgroundImage: TOKENS.gradients.pinkFade`, `-webkit-background-clip: text`). Rest is white.

### 17. `src/components/personal-video/templates/typography/PersonaTitle.tsx`
Stacks `<GradientHeadline>` (display size) + optional tagline paragraph (muted, clamped to 2 lines).

### 18. `src/components/personal-video/dev/FramePreview.tsx`
Dev-only UI at `/dev/frame-preview`. Lets you pick a FrameId, paste a photo URL, edit `PersonalizationCopy` JSON, then generate and compare reference PNG vs rendered template with overlay opacity slider.

### 19. `src/components/student/PersonalVideoClient.tsx`
`"use client"`. Main page UI. Props: `session, initialPhotos, copy, isMockData`.

**States:**
- `photos` — `PersonalizationPhotos` (starts from `initialPhotos`)
- `uploadingSlot` — which slot is currently uploading
- `isProcessing` — shows fake compositor log animation
- `showReel` — shows `<BootcampReelGenerator>` after all 3 photos uploaded

**Upload slots:**
- `photo1` — "Portrait" (Screen 3 — hero shot)
- `photo2` — "Tribe" (Screen 7 — tribe moment)
- `photo3` — "Moment" (Screen 10 — bootcamp highlight)

**Flow:**
1. Show 3 upload cards while photos not all uploaded
2. When 3rd photo uploaded → `runProcessingSimulation()` (fake log steps, 2.5s total) → `setShowReel(true)`
3. Show `<BootcampReelGenerator copy={copy} photos={photos} />` + replace buttons

**Upload handler:** `POST /api/submissions/upload-personal` with `FormData { file, slot }`. On success: reads file as dataURL to update local `photos` state immediately (no page reload needed for preview).

**Header:** Dark bg `#050810`, "Cinematic Personalization" badge, "See Yourself in Action" heading, subtext about 12 frames ~30 seconds.

### 20. `src/components/student/BootcampReelGenerator.tsx`
`"use client"`. The actual canvas-based reel generator.

**Asset base:** `/bootcamp-reel/`

**Static assets needed in `public/bootcamp-reel/`:**
- `Screen_1.png`, `Screen_3.png`, `Screen_4.png`, `Screen_5.png`, `Screen_6.png`, `Screen_7.png`, `Screen_8.png`, `Screen_10.png`, `Screen_11.png`, `Screen_12.png`
- `Bootcamp_TemplateReel_UpdatedDraft.mp4` — highlight reel video (used as slide 2)

**Slides:** `[[1,4],[2,0],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[10,4],[11,4],[12,4]]` — `[slideNumber, durationSeconds]` (0 = video duration)

**Canvas:** Preview canvas 450×800 displayed at 270×480. Off-screen recording canvas 900×1600 (2× for HD). FPS = 30.

**Per-slide draw logic (drawSlide function):**
- **Slide 1:** Scale-up animation on `Screen_1.png`
- **Slide 2:** Draw `userVideo` frames (muted video from asset)
- **Slide 3:** `drawPhotoOnTemplate(Screen_3, photos[0], rect: {51,110,348,466,r:18})` + fade-in `copy.fullName`
- **Slide 4:** Breathe animation on `Screen_4.png` + "Where It" / "All Began" text fade
- **Slide 5:** Static `Screen_5.png`
- **Slide 6:** `Screen_6.png` + animated `copy.cameFor` words word-by-word (middle word in `#A8030C`) + `copy.lovedMostSubline` subtext
- **Slide 7:** `drawPhotoOnTemplate(Screen_7, photos[1], same rect)` + fade-in `copy.tribeName`
- **Slide 8:** Scale animation on `Screen_8.png`
- **Slide 10:** `drawPhotoOnTemplate(Screen_10, photos[2], {51,110,348,580,r:18})`
- **Slide 11:** `Screen_11.png` + three sections (You Came For / Stayed For / Left As) with staggered fade-in
- **Slide 12:** `Screen_12.png` + `copy.fullName` + animated `copy.personaTitle` word-by-word (middle word `#A8030C`) + `copy.personaTagline`

**Photo rendering (`drawPhotoOnTemplate`):** Cuts hole in template using `destination-out` composite on temp canvas, clips user photo with `coverFit` into the hole, draws template on top.

**Text gradient (`tGrad`):** `createLinearGradient` from `#A8030C` → `#ffffff` → `#ffffff`.

**Preview button:** Plays all slides in sequence using `requestAnimationFrame` loops.

**Record button:** `canvas.captureStream(30)` → `MediaRecorder` → collect chunks. Tries native MP4 first, falls back to WebM → FFmpeg WASM conversion (loaded from CDN on demand). Downloads as `NIAT_Bootcamp_2026_{fullName}.mp4`.

**Loading states:** Shows spinner + message during asset load ("Loading screen assets…" → "Optimising images…" → "Loading highlight reel video…").

---

## `PersonalVideoSlideshow.tsx` (legacy / alternative renderer)

`src/components/student/PersonalVideoSlideshow.tsx` — an older React-template-based slideshow (uses `composeAllFrames` from lib). Currently NOT used in the main page (replaced by `BootcampReelGenerator`). Keep it but don't wire it up unless needed.

---

## Static assets required

Place in `public/bootcamp-reel/`:
```
Screen_1.png
Screen_3.png
Screen_4.png
Screen_5.png
Screen_6.png
Screen_7.png
Screen_8.png
Screen_10.png
Screen_11.png
Screen_12.png
Bootcamp_TemplateReel_UpdatedDraft.mp4
```

Place in `public/frames/` (for the old PersonalVideoSlideshow / FramePreview dev tool):
```
Screen_1.png through Screen_12.png
```

---

## Dependencies required
- `html-to-image` — for rendering React templates to canvas (used in renderFrame.ts)
- `framer-motion` — used in PersonalVideoClient.tsx
- `lucide-react` — icons
- `next/font/google` — Outfit font (used in PersonalVideoSlideshow)

---

## Supabase tables used
- `submissions` — `student_id, bootcamp_id, section_id, region_id, task_id (=7), status, file_url (JSON string of photo paths), points, verified_at, updated_at`
- `students` — `full_name, team_id, teams:team_id(name)`
- Storage bucket `images` — photos stored at `personalization/{studentId}/{slot}.{ext}`

---

## Implementation order
1. Create all lib files (types → personalization → mockPersonalization → getPersonalization → designTokens → frameManifest → photoUtils → renderFrame → composeFrame)
2. Create component files (FrameShell → Screen03 → typography → templates/index → FramePreview → PersonalVideoSlideshow → BootcampReelGenerator → PersonalVideoClient)
3. Create page and API route
4. Add static assets to `public/bootcamp-reel/`
