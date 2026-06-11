"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Loader2, Play, Clapperboard, Download, Share2 } from "lucide-react";
import type { PersonalizationCopy } from "@/lib/personal-video/types";
import type { PersonalizationPhotos } from "@/lib/personal-video/personalization";

const ASSET_BASE = "/bootcamp-reel";

const IMGS_MAP: Record<string, string> = {
  s1:  `${ASSET_BASE}/Screen_1.png`,
  s3:  `${ASSET_BASE}/Screen_3.png`,
  s4:  `${ASSET_BASE}/Screen_4.png`,
  s5:  `${ASSET_BASE}/Screen_5.png`,
  s6:  `${ASSET_BASE}/Screen_6.png`,
  s7:  `${ASSET_BASE}/Screen_7.png`,
  s8:  `${ASSET_BASE}/Screen_8.png`,
  s10: `${ASSET_BASE}/Screen_10.png`,
  s11: `${ASSET_BASE}/Screen_11.png`,
  s12: `${ASSET_BASE}/Screen_12.png`,
  s14: `${ASSET_BASE}/Screen-last.png`,
};

const SLIDES: [number, number][] = [
  [1,4],[3,4],[4,4],[6,4],[13,4],
  [7,4],[8,4],[10,4],[11,4],[12,5],[14,3]
];

const FPS = 30;

interface Props {
  copy: PersonalizationCopy;
  photos: PersonalizationPhotos;
}

interface ReelState {
  BASE_IMGS: Record<string, HTMLCanvasElement | null>;
  userImgs: (HTMLCanvasElement | null)[];
  recBlob: Blob | null;
  recExt: string;
  pvCtx: CanvasRenderingContext2D | null;
  recCtx: CanvasRenderingContext2D | null;
  activeCtx: CanvasRenderingContext2D | null;
  previewRunning: boolean;
  isRecording: boolean;
  audioBuf: ArrayBuffer | null;
  brollVideo0: HTMLVideoElement | null;
  brollVideo3: HTMLVideoElement | null;
  brollVideo6: HTMLVideoElement | null;
  brollVideo: HTMLVideoElement | null;
  brollVideo2: HTMLVideoElement | null;
}

// ── Pure canvas helpers (no React state) ─────────────────────────────────────

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x+r, y); c.lineTo(x+w-r, y); c.quadraticCurveTo(x+w, y, x+w, y+r);
  c.lineTo(x+w, y+h-r); c.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  c.lineTo(x+r, y+h); c.quadraticCurveTo(x, y+h, x, y+h-r);
  c.lineTo(x, y+r); c.quadraticCurveTo(x, y, x+r, y);
  c.closePath();
}

function coverFit(img: HTMLCanvasElement | HTMLImageElement, dw: number, dh: number) {
  const iw = (img as HTMLCanvasElement).width  || (img as HTMLImageElement).naturalWidth  || 1;
  const ih = (img as HTMLCanvasElement).height || (img as HTMLImageElement).naturalHeight || 1;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale, sh = dh / scale;
  const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  return { sx, sy, sw, sh };
}

function tGrad(ctx: CanvasRenderingContext2D, yCentre: number, blockH = 60) {
  const g = ctx.createLinearGradient(400, yCentre - blockH / 2, 50, yCentre + blockH / 2);
  g.addColorStop(0, '#A8030C');
  g.addColorStop(0.76, '#ffffff');
  g.addColorStop(1, '#ffffff');
  return g;
}

function scaleHQ(src: HTMLImageElement | HTMLCanvasElement, tw: number, th: number): HTMLCanvasElement | null {
  if (!src) return null;
  let cur: HTMLImageElement | HTMLCanvasElement = src;
  let cw = (src as HTMLCanvasElement).width  || (src as HTMLImageElement).naturalWidth  || 0;
  let ch = (src as HTMLCanvasElement).height || (src as HTMLImageElement).naturalHeight || 0;
  if (!cw || !ch) return src as HTMLCanvasElement;

  while (cw > tw * 2 || ch > th * 2) {
    const nw = Math.max(Math.floor(cw / 2), tw);
    const nh = Math.max(Math.floor(ch / 2), th);
    const tmp = Object.assign(document.createElement('canvas'), { width: nw, height: nh });
    const tc = tmp.getContext('2d')!;
    tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = 'high';
    tc.drawImage(cur, 0, 0, nw, nh);
    cur = tmp; cw = nw; ch = nh;
  }

  const out = Object.assign(document.createElement('canvas'), { width: tw, height: th });
  const oc = out.getContext('2d')!;
  oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = 'high';
  oc.drawImage(cur, 0, 0, tw, th);
  return out;
}

function scalePhotoHQ(src: HTMLImageElement, maxPx: number): HTMLCanvasElement | null {
  if (!src) return null;
  const iw = src.naturalWidth || src.width || 0;
  const ih = src.naturalHeight || src.height || 0;
  if (!iw || !ih) return src as unknown as HTMLCanvasElement;
  const scale = Math.min(1, maxPx / Math.max(iw, ih));
  return scaleHQ(src, Math.round(iw * scale), Math.round(ih * scale));
}

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  // Use fetch → blob URL to bypass COEP/CORP restrictions on HTML elements
  try {
    const res = await fetch(src);
    if (!res.ok) { console.warn('Could not fetch:', src, res.status); return null; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    return await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  } catch (e) {
    console.warn('Could not load:', src, e);
    return null;
  }
}

// ── Draw slide ────────────────────────────────────────────────────────────────

function drawSlide(
  slide: number, t: number,
  st: ReelState,
  copy: PersonalizationCopy,
) {
  const ctx = st.activeCtx;
  if (!ctx) return;
  t = Math.max(0, Math.min(1, t));

  if (ctx === st.recCtx) ctx.setTransform(2, 0, 0, 2, 0, 0);
  else                    ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, 450, 800);

  const eo  = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
  const sub = (s: number, e: number) => eo(Math.max(0, Math.min(1, (t - s) / (e - s))));

  const BASE = st.BASE_IMGS;
  const uImgs = st.userImgs;

  function drawPhotoOnTemplate(
    templateImg: HTMLCanvasElement | null,
    userImg: HTMLCanvasElement | null,
    cx: number, cy: number, cw: number, ch: number, r: number
  ) {
    if (!templateImg) return;
    const PW = ctx!.canvas.width;
    const PH = ctx!.canvas.height;
    const S  = PW / 450;

    if (!userImg) {
      ctx!.drawImage(templateImg, 0, 0, 450, 800);
      ctx!.save();
      roundRect(ctx!, cx, cy, cw, ch, r); ctx!.clip();
      ctx!.fillStyle = '#111'; ctx!.fillRect(cx, cy, cw, ch);
      ctx!.fillStyle = '#555'; ctx!.font = '14px sans-serif';
      ctx!.textAlign = 'center';
      ctx!.fillText('Upload photo', cx + cw/2, cy + ch/2);
      ctx!.restore();
      return;
    }

    const tmp = Object.assign(document.createElement('canvas'), { width: PW, height: PH });
    const tc  = tmp.getContext('2d')!;
    tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = 'high';
    tc.drawImage(templateImg, 0, 0, PW, PH);
    tc.globalCompositeOperation = 'destination-out';
    roundRect(tc, cx*S, cy*S, cw*S, ch*S, r*S); tc.fill();

    ctx!.save();
    roundRect(ctx!, cx, cy, cw, ch, r); ctx!.clip();
    const { sx, sy, sw, sh } = coverFit(userImg, cw, ch);
    ctx!.drawImage(userImg, sx, sy, sw, sh, cx, cy, cw, ch);
    ctx!.restore();

    ctx!.drawImage(tmp, 0, 0, 450, 800);
  }

  switch (slide) {
    case 1: {
      if (st.brollVideo0 && st.brollVideo0.readyState >= 2) {
        ctx.drawImage(st.brollVideo0, 0, 0, 450, 800);
      } else if (BASE.s1) {
        const sc = 1 + 0.04 * eo(t);
        ctx.save();
        ctx.translate(225, 400); ctx.scale(sc, sc); ctx.translate(-225, -400);
        ctx.drawImage(BASE.s1, 0, 0, 450, 800);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, 450, 800);
      }
      break;
    }
    case 3: {
      // Video background (fall back to static Screen_3.png if video not ready)
      if (st.brollVideo3 && st.brollVideo3.readyState >= 2) {
        ctx.drawImage(st.brollVideo3, 0, 0, 450, 800);
      } else if (BASE.s3) {
        ctx.drawImage(BASE.s3, 0, 0, 450, 800);
      } else {
        ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, 450, 800);
      }
      // Photo clipped into frame area
      ctx.save();
      roundRect(ctx, 51, 110, 348, 466, 18); ctx.clip();
      if (uImgs[0]) {
        const { sx, sy, sw, sh } = coverFit(uImgs[0], 348, 466);
        ctx.drawImage(uImgs[0], sx, sy, sw, sh, 51, 110, 348, 466);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(51, 110, 348, 466);
      }
      ctx.restore();
      // Name text fade-in
      const na = sub(0.2, 0.55);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, 660, 34);
      ctx.globalAlpha = na;
      ctx.translate(0, (1 - na) * 20);
      ctx.fillText(copy.fullName, 225, 660);
      ctx.restore();
      break;
    }
    case 4: {
      if (st.brollVideo && st.brollVideo.readyState >= 2) {
        ctx.drawImage(st.brollVideo, 0, 0, 450, 800);
      } else if (BASE.s4) {
        ctx.drawImage(BASE.s4, 0, 0, 450, 800);
      } else {
        ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, 450, 800);
      }
      break;
    }
    case 13: {
      if (st.brollVideo2 && st.brollVideo2.readyState >= 2) {
        ctx.drawImage(st.brollVideo2, 0, 0, 450, 800);
      } else if (BASE.s12) {
        ctx.drawImage(BASE.s12, 0, 0, 450, 800);
      } else {
        ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, 450, 800);
      }
      break;
    }
    case 5:
      if (BASE.s5) ctx.drawImage(BASE.s5, 0, 0, 450, 800);
      break;
    case 6: {
      if (st.brollVideo6 && st.brollVideo6.readyState >= 2) {
        ctx.drawImage(st.brollVideo6, 0, 0, 450, 800);
      } else if (BASE.s6) {
        ctx.drawImage(BASE.s6, 0, 0, 450, 800);
      }
      // "Your Most Loved Workshop" heading (replaces slide 5)
      const ha = sub(0, 0.25);
      ctx.save();
      ctx.font = '600 35px Sora, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      const hLineH = 42;
      const hg = ctx.createLinearGradient(400, 70, 50, 125);
      hg.addColorStop(0, '#A8030C');
      hg.addColorStop(0.76, '#ffffff');
      hg.addColorStop(1, '#ffffff');
      ctx.fillStyle = hg;
      ctx.globalAlpha = ha;
      ctx.fillText('Your Most', 225, 78);
      ctx.fillText('Loved Workshop', 225, 78 + hLineH);
      ctx.restore();
      const cameWords = copy.cameFor.split(' ');
      const midIdx6   = Math.floor(cameWords.length / 2);
      const lineH6    = 54;
      let y6 = 370 - ((cameWords.length - 1) * lineH6) / 2;
      const wInterval = 0.55 / cameWords.length;
      const maxLen = Math.max(...cameWords.map(w => w.length));
      const fs6 = maxLen > 13 ? 32 : maxLen > 10 ? 38 : maxLen > 7 ? 42 : 46;
      ctx.font = `bold ${fs6}px "Segoe UI",sans-serif`;
      cameWords.forEach((w, i) => {
        const wa = sub(0.08 + i * wInterval, 0.08 + i * wInterval + 0.28);
        ctx.save(); ctx.textAlign = 'center';
        ctx.fillStyle = (i === midIdx6) ? '#A8030C' : tGrad(ctx, y6, lineH6);
        ctx.globalAlpha = wa; ctx.translate(0, (1 - wa) * 18);
        ctx.fillText(w, 225, y6); ctx.restore(); y6 += lineH6;
      });
      const sa6 = sub(0.65, 0.9);
      const subWords6 = copy.lovedMostSubline.split(' ');
      const half6 = Math.ceil(subWords6.length / 2);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = '18px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, y6 + 20, 44); ctx.globalAlpha = sa6;
      ctx.translate(0, (1 - sa6) * 12);
      ctx.fillText(subWords6.slice(0, half6).join(' '), 225, y6 + 8);
      ctx.fillText(subWords6.slice(half6).join(' '), 225, y6 + 32);
      ctx.restore();
      break;
    }
    case 7: {
      if (st.brollVideo3 && st.brollVideo3.readyState >= 2) {
        ctx.drawImage(st.brollVideo3, 0, 0, 450, 800);
      } else if (BASE.s7) {
        ctx.drawImage(BASE.s7, 0, 0, 450, 800);
      }
      ctx.save();
      roundRect(ctx, 51, 110, 348, 466, 18); ctx.clip();
      if (uImgs[1]) {
        const { sx, sy, sw, sh } = coverFit(uImgs[1], 348, 466);
        ctx.drawImage(uImgs[1], sx, sy, sw, sh, 51, 110, 348, 466);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(51, 110, 348, 466);
      }
      ctx.restore();
      // Tribe name just below the photo
      const na = sub(0.5, 0.82);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = 'bold 28px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, 612, 34); ctx.globalAlpha = na;
      ctx.translate(0, (1 - na) * 20);
      ctx.fillText(copy.tribeName, 225, 638); ctx.restore();
      // Dark scrim behind friendship line at bottom
      const scrimA = sub(0.6, 0.8);
      ctx.save();
      ctx.globalAlpha = scrimA * 0.5;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 680, 450, 120);
      ctx.restore();
      // Friendship line — two lines at the bottom
      const qa = sub(0.65, 0.92);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = '600 italic 26px Sora, "Segoe UI", sans-serif';
      const fqg = ctx.createLinearGradient(400, 716, 50, 750);
      fqg.addColorStop(0, '#A8030C');
      fqg.addColorStop(0.76, '#ffffff');
      fqg.addColorStop(1, '#ffffff');
      ctx.fillStyle = fqg; ctx.globalAlpha = qa;
      ctx.translate(0, (1 - qa) * 14);
      ctx.fillText('Made friendships that', 225, 716);
      ctx.fillText('stayed beyond the workshop.', 225, 750);
      ctx.restore();
      break;
    }
    case 8: {
      const sc8 = 1 + 0.03 * eo(t);
      ctx.save(); ctx.translate(225, 400); ctx.scale(sc8, sc8); ctx.translate(-225, -400);
      if (BASE.s8) ctx.drawImage(BASE.s8, 0, 0, 450, 800);
      ctx.restore();
      break;
    }
    case 10: {
      if (st.brollVideo3 && st.brollVideo3.readyState >= 2) {
        ctx.drawImage(st.brollVideo3, 0, 0, 450, 800);
      } else if (BASE.s10) {
        ctx.drawImage(BASE.s10, 0, 0, 450, 800);
      }
      ctx.save();
      roundRect(ctx, 51, 110, 348, 580, 18); ctx.clip();
      if (uImgs[2]) {
        const { sx, sy, sw, sh } = coverFit(uImgs[2], 348, 580);
        ctx.drawImage(uImgs[2], sx, sy, sw, sh, 51, 110, 348, 580);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(51, 110, 348, 580);
      }
      ctx.restore();
      // Gentle photo reveal
      const pr10 = sub(0, 0.4);
      if (pr10 < 0.99) {
        ctx.save();
        ctx.globalAlpha = (1 - pr10) * 0.85;
        ctx.fillStyle = '#000';
        ctx.fillRect(51, 110, 348, 580);
        ctx.restore();
      }
      break;
    }
    case 11: {
      if (BASE.s11) ctx.drawImage(BASE.s11, 0, 0, 450, 800);
      const sections = [
        { label: 'You Came For', value: copy.cameFor,   labelY: 152, valueY: 186, s: 0.05 },
        { label: 'Stayed For',   value: copy.stayedFor,  labelY: 382, valueY: 416, s: 0.36 },
        { label: 'Left As',      value: copy.leftAs,     labelY: 608, valueY: 642, s: 0.65 },
      ];
      sections.forEach(sec => {
        const sa = sub(sec.s, sec.s + 0.27);
        ctx.save(); ctx.textAlign = 'center'; ctx.translate(0, (1 - sa) * 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = '17px "Segoe UI",sans-serif'; ctx.globalAlpha = sa * 0.75;
        ctx.fillText(sec.label, 225, sec.labelY);
        ctx.font = 'bold 22px "Segoe UI",sans-serif'; ctx.globalAlpha = sa;
        ctx.fillText(sec.value, 225, sec.valueY); ctx.restore();
      });
      break;
    }
    case 12: {
      if (BASE.s12) ctx.drawImage(BASE.s12, 0, 0, 450, 800);
      const na12 = sub(0.05, 0.3);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = 'bold 38px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, 220, 44); ctx.globalAlpha = na12;
      ctx.translate(0, (1 - na12) * 16); ctx.fillText(copy.fullName, 225, 220); ctx.restore();
      const titleWords = copy.personaTitle.split(' ');
      const midIdxT    = Math.floor(titleWords.length / 2);
      const tStep      = 0.32 / titleWords.length;
      ctx.font = 'bold 52px "Segoe UI",sans-serif';
      let ty = 320;
      titleWords.forEach((w, i) => {
        const wa = sub(0.22 + i * tStep, 0.22 + i * tStep + 0.26);
        ctx.save(); ctx.textAlign = 'center';
        ctx.fillStyle = (i === midIdxT) ? '#A8030C' : tGrad(ctx, ty, 64);
        ctx.globalAlpha = wa; ctx.translate(0, (1 - wa) * 20);
        ctx.fillText(w, 225, ty); ctx.restore(); ty += 64;
      });
      break;
    }
    case 14: {
      if (BASE.s14) ctx.drawImage(BASE.s14, 0, 0, 450, 800);
      break;
    }
    default:
      ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, 450, 800);
  }

  // Subtle fade-in only — no fade-out to avoid black screens between slides
  {
    const fi = 1 - Math.pow(Math.min(1, t / 0.06), 3);
    if (fi > 0.005) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.globalAlpha = fi;
      ctx.fillRect(0, 0, 450, 800);
      ctx.restore();
    }
  }
}

// ── FFmpeg helpers ────────────────────────────────────────────────────────────

let _ffmpegInstance: unknown = null;

function _loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function _fetchFile(src: Blob): Promise<Uint8Array> {
  return new Uint8Array(await src.arrayBuffer());
}

async function _getFFmpeg(onMsg: (m: string) => void) {
  if (_ffmpegInstance) return _ffmpegInstance as { writeFile: Function; exec: Function; readFile: Function; deleteFile: Function; on: Function; load: Function };
  onMsg('Loading MP4 converter (one-time download)…');
  await _loadScript('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js');
  const { FFmpeg } = (window as unknown as { FFmpegWASM: { FFmpeg: new () => unknown } }).FFmpegWASM;
  const ff = new FFmpeg() as { writeFile: Function; exec: Function; readFile: Function; deleteFile: Function; on: Function; load: Function };
  await ff.load({
    coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  });
  _ffmpegInstance = ff;
  return ff;
}

async function convertToMP4(
  inputBlob: Blob,
  isNativeMP4: boolean,
  onMsg: (m: string) => void,
  onProgress: (p: number) => void,
  audioBuf?: ArrayBuffer,
): Promise<Blob> {
  const ff = await _getFFmpeg(onMsg);
  onMsg('Processing video…');
  (ff as { on: Function }).on('progress', ({ progress }: { progress: number }) => {
    onProgress(Math.min(0.95, progress));
    onMsg(`Processing… ${Math.round(Math.min(0.95, progress) * 100)}%`);
  });

  const inExt = isNativeMP4 ? 'mp4' : 'webm';
  await (ff as { writeFile: Function }).writeFile(`in.${inExt}`, await _fetchFile(inputBlob));

  // video codec: copy stream if already MP4 (fast), re-encode if WebM
  const vArgs = isNativeMP4
    ? ['-c:v', 'copy']
    : ['-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p'];

  if (audioBuf) {
    await (ff as { writeFile: Function }).writeFile('bgm.wav', new Uint8Array(audioBuf));
    await (ff as { exec: Function }).exec([
      '-i', `in.${inExt}`, '-i', 'bgm.wav',
      ...vArgs,
      '-c:a', 'aac', '-b:a', '128k', '-shortest',
      '-movflags', '+faststart', 'out.mp4',
    ]);
    await (ff as { deleteFile: Function }).deleteFile('bgm.wav');
  } else {
    await (ff as { exec: Function }).exec([
      '-i', `in.${inExt}`, ...vArgs,
      '-movflags', '+faststart', '-an', 'out.mp4',
    ]);
  }

  const data = await (ff as { readFile: Function }).readFile('out.mp4') as { buffer: ArrayBuffer };
  await (ff as { deleteFile: Function }).deleteFile(`in.${inExt}`);
  await (ff as { deleteFile: Function }).deleteFile('out.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BootcampReelGenerator({ copy, photos }: Props) {
  const pvCanvasRef  = useRef<HTMLCanvasElement>(null);
  const recCanvasRef = useRef<HTMLCanvasElement>(null);
  const stRef = useRef<ReelState>({
    BASE_IMGS: {}, userImgs: [null, null, null],
    recBlob: null, recExt: 'mp4',
    pvCtx: null, recCtx: null, activeCtx: null,
    previewRunning: false, isRecording: false,
    audioBuf: null, brollVideo0: null, brollVideo3: null, brollVideo6: null, brollVideo: null, brollVideo2: null,
  });

  const [loaded, setLoaded]           = useState(false);
  const [loadMsg, setLoadMsg]         = useState("Loading screen assets…");
  const [progress, setProgress]       = useState(0);
  const [progLabel, setProgLabel]     = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Initial asset load
  useEffect(() => {
    const pv  = pvCanvasRef.current;
    const rec = recCanvasRef.current;
    if (!pv || !rec) return;

    const pvCtx  = pv.getContext('2d');
    const recCtx = rec.getContext('2d');
    if (!pvCtx || !recCtx) return;

    stRef.current.pvCtx  = pvCtx;
    stRef.current.recCtx = recCtx;
    stRef.current.activeCtx = pvCtx;

    [pvCtx, recCtx].forEach(c => {
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
    });

    async function init() {
      setLoadMsg('Loading screen assets…');
      const keys = Object.keys(IMGS_MAP);
      const imgs = await Promise.all(keys.map(k => loadImg(IMGS_MAP[k])));
      setLoadMsg('Optimising images…');
      keys.forEach((k, i) => {
        stRef.current.BASE_IMGS[k] = imgs[i] ? scaleHQ(imgs[i]!, 900, 1600) : null;
      });

      // Load initial photos
      const [p1, p2, p3] = await Promise.all([
        loadImg(photos.photo1 ?? '').catch(() => null),
        loadImg(photos.photo2 ?? '').catch(() => null),
        loadImg(photos.photo3 ?? '').catch(() => null),
      ]);
      stRef.current.userImgs = [
        p1 ? scalePhotoHQ(p1, 2048) : null,
        p2 ? scalePhotoHQ(p2, 2048) : null,
        p3 ? scalePhotoHQ(p3, 2048) : null,
      ];

      // Load BGM
      try {
        const audioRes = await fetch('/bootcamp-reel/Bootcamp-Audio.wav');
        stRef.current.audioBuf = await audioRes.arrayBuffer();
      } catch { /* audio optional */ }

      // Show UI immediately — videos load in background and swap in when ready
      stRef.current.activeCtx = pvCtx;
      drawSlide(11, 0.5, stRef.current, copy);
      setLoaded(true);

      // Load B-roll videos in background (non-blocking)
      // crossOrigin='anonymous' puts the request in CORS mode which COEP always allows
      function loadVideoBg(src: string, onReady: (v: HTMLVideoElement) => void) {
        const v = document.createElement('video');
        v.crossOrigin = 'anonymous';
        v.src = src; v.preload = 'auto'; v.muted = true; v.playsInline = true; v.loop = true;
        let resolved = false;
        const resolve = () => {
          if (resolved) return;
          resolved = true;
          if (v.readyState >= 2) {
            v.currentTime = 0;
            v.onseeked = () => { v.onseeked = null; onReady(v); };
            setTimeout(() => { if (v.onseeked) { v.onseeked = null; onReady(v); } }, 2000);
          } else {
            onReady(v);
          }
        };
        v.onloadeddata     = resolve;
        v.oncanplaythrough = resolve;
        v.onerror = () => {
          console.warn('[broll] video element failed, retrying via fetch blob URL:', src);
          // Nuclear fallback: fetch as blob URL (bypasses all COEP/CORP)
          fetch(src).then(r => r.blob()).then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const v2 = document.createElement('video');
            v2.src = blobUrl; v2.preload = 'auto'; v2.muted = true; v2.playsInline = true; v2.loop = true;
            let r2 = false;
            const res2 = () => {
              if (r2) return; r2 = true;
              v2.currentTime = 0;
              v2.onseeked = () => { v2.onseeked = null; onReady(v2); };
              setTimeout(() => { if (v2.onseeked) { v2.onseeked = null; onReady(v2); } }, 2000);
            };
            v2.onloadeddata = res2; v2.oncanplaythrough = res2;
            v2.onerror = () => console.warn('[broll] blob fallback also failed:', src);
            v2.load();
          }).catch(() => console.warn('[broll] fetch fallback failed:', src));
        };
        v.load();
      }

      loadVideoBg('/bootcamp-reel/screen-1-animated-vid.mp4',       v => { stRef.current.brollVideo0 = v; });
      loadVideoBg('/bootcamp-reel/Screen_3-animated-vid.mp4',       v => { stRef.current.brollVideo3 = v; });
      loadVideoBg('/bootcamp-reel/Screen-animated-6-updated.mp4',   v => { stRef.current.brollVideo6 = v; });
      loadVideoBg('/bootcamp-reel/b-1.mp4',                         v => { stRef.current.brollVideo  = v; });
      loadVideoBg('/bootcamp-reel/b-2.mp4',                         v => { stRef.current.brollVideo2 = v; });
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload user photos when props change
  useEffect(() => {
    if (!loaded) return;
    async function reload() {
      const [p1, p2, p3] = await Promise.all([
        photos.photo1 ? loadImg(photos.photo1) : Promise.resolve(null),
        photos.photo2 ? loadImg(photos.photo2) : Promise.resolve(null),
        photos.photo3 ? loadImg(photos.photo3) : Promise.resolve(null),
      ]);
      stRef.current.userImgs = [
        p1 ? scalePhotoHQ(p1, 2048) : null,
        p2 ? scalePhotoHQ(p2, 2048) : null,
        p3 ? scalePhotoHQ(p3, 2048) : null,
      ];
      stRef.current.activeCtx = stRef.current.pvCtx;
      // Show whichever photo-slide was just updated
      const firstFilled = photos.photo1 ? 3 : photos.photo2 ? 7 : 10;
      drawSlide(firstFilled, 1, stRef.current, copy);
    }
    reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.photo1, photos.photo2, photos.photo3, loaded]);

  const handlePreview = useCallback(async () => {
    const st = stRef.current;
    if (st.previewRunning || !st.pvCtx) return;
    fetch("/api/video-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "preview" }) }).catch(() => {});
    st.previewRunning = true;
    st.activeCtx = st.pvCtx;

    // Play BGM during preview
    let previewAudio: HTMLAudioElement | null = null;
    let previewAudioUrl: string | null = null;
    if (st.audioBuf) {
      const blob = new Blob([st.audioBuf], { type: 'audio/wav' });
      previewAudioUrl = URL.createObjectURL(blob);
      previewAudio = new Audio(previewAudioUrl);
      previewAudio.loop = true;
      previewAudio.play().catch(() => {});
    }

    for (const [slide, dur] of SLIDES) {
      if (slide === 1  && st.brollVideo0) { st.brollVideo0.currentTime = 0; st.brollVideo0.play().catch(() => {}); }
      if ((slide === 3 || slide === 7 || slide === 10) && st.brollVideo3) { st.brollVideo3.currentTime = 0; st.brollVideo3.play().catch(() => {}); }
      if (slide === 6  && st.brollVideo6) { st.brollVideo6.currentTime = 0; st.brollVideo6.play().catch(() => {}); }
      if (slide === 4  && st.brollVideo)  { st.brollVideo.currentTime  = 0; st.brollVideo.play().catch(() => {}); }
      if (slide === 13 && st.brollVideo2) { st.brollVideo2.currentTime = 0; st.brollVideo2.play().catch(() => {}); }
      const durMs = dur * 1000;
      await new Promise<void>(resolve => {
        const startMs = performance.now();
        function frame() {
          const t = Math.min(1, (performance.now() - startMs) / durMs);
          drawSlide(slide, t, st, copy);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      if (slide === 1  && st.brollVideo0) st.brollVideo0.pause();
      if ((slide === 3 || slide === 7 || slide === 10) && st.brollVideo3) st.brollVideo3.pause();
      if (slide === 6  && st.brollVideo6) st.brollVideo6.pause();
      if (slide === 4  && st.brollVideo)  st.brollVideo.pause();
      if (slide === 13 && st.brollVideo2) st.brollVideo2.pause();
    }

    if (previewAudio) { previewAudio.pause(); previewAudio.src = ''; }
    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    st.previewRunning = false;
  }, [copy]);

  const handleRecord = useCallback(async () => {
    const st = stRef.current;
    if (st.isRecording || !st.pvCtx || !st.recCtx) return;
    st.isRecording = true;
    setIsRecording(true);
    setShowDownload(false);
    setShowProgress(true);
    setProgress(0);

    const recCanvas = recCanvasRef.current!;
    recCanvas.width = 900; recCanvas.height = 1600;
    st.activeCtx = st.recCtx;

    const totalDur = SLIDES.reduce((acc, [, d]) => acc + d, 0);
    let elapsed = 0;

    const mimeType = [
      'video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4',
      'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
    ].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const nativeMP4 = mimeType.startsWith('video/mp4');

    const stream = recCanvas.captureStream(FPS);

    // Always mix BGM into stream via WebAudio — audio baked in even if FFmpeg fails
    let audioCtx: AudioContext | null = null;
    let audioSource: AudioBufferSourceNode | null = null;
    if (st.audioBuf) {
      try {
        audioCtx = new AudioContext();
        const decoded = await audioCtx.decodeAudioData(st.audioBuf.slice(0));
        const dest = audioCtx.createMediaStreamDestination();
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = decoded;
        audioSource.loop = true;
        audioSource.connect(dest);
        audioSource.start();
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      } catch { /* audio optional */ }
    }

    // Prefer MIME types that carry audio; fall back to video-only
    const mimeWithAudio = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
    ].find(m => MediaRecorder.isTypeSupported(m));
    const effectiveMime = (audioCtx && mimeWithAudio) ? mimeWithAudio : (mimeType || '');

    const recorder = new MediaRecorder(stream, {
      ...(effectiveMime ? { mimeType: effectiveMime } : {}),
      videoBitsPerSecond: 12_000_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start();

    for (const [slide, dur] of SLIDES) {
      if (slide === 1  && st.brollVideo0) { st.brollVideo0.currentTime = 0; st.brollVideo0.play().catch(() => {}); }
      if ((slide === 3 || slide === 7 || slide === 10) && st.brollVideo3) { st.brollVideo3.currentTime = 0; st.brollVideo3.play().catch(() => {}); }
      if (slide === 6  && st.brollVideo6) { st.brollVideo6.currentTime = 0; st.brollVideo6.play().catch(() => {}); }
      if (slide === 4  && st.brollVideo)  { st.brollVideo.currentTime  = 0; st.brollVideo.play().catch(() => {}); }
      if (slide === 13 && st.brollVideo2) { st.brollVideo2.currentTime = 0; st.brollVideo2.play().catch(() => {}); }
      const durMs = dur * 1000;
      await new Promise<void>(resolve => {
        const startMs = performance.now();
        function frame() {
          const t = Math.min(1, (performance.now() - startMs) / durMs);
          drawSlide(slide, t, st, copy);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      if (slide === 1  && st.brollVideo0) st.brollVideo0.pause();
      if ((slide === 3 || slide === 7 || slide === 10) && st.brollVideo3) st.brollVideo3.pause();
      if (slide === 6  && st.brollVideo6) st.brollVideo6.pause();
      if (slide === 4  && st.brollVideo)  st.brollVideo.pause();
      if (slide === 13 && st.brollVideo2) st.brollVideo2.pause();
      elapsed += dur;
      setProgress(Math.min(1, elapsed / totalDur));
      setProgLabel(`Recording slide ${slide}/${SLIDES.length}…`);
    }

    recorder.stop();
    await new Promise<void>(r => { recorder.onstop = () => r(); });

    if (audioSource) { try { audioSource.stop(); } catch { /* ignore */ } }
    if (audioCtx)    { audioCtx.close().catch(() => {}); }

    const rawBlob = new Blob(chunks, { type: effectiveMime || mimeType || 'video/webm' });

    // Always run FFmpeg to get AAC audio in MP4; fallback blob already has WebAudio-mixed audio
    {
      try {
        st.recBlob = await convertToMP4(
          rawBlob,
          nativeMP4,
          m => setProgLabel(m),
          p => setProgress(p),
          st.audioBuf ?? undefined,
        );
        st.recExt = 'mp4';
        setProgress(1); setProgLabel('Done! Click Download (MP4).');
      } catch (err) {
        console.error('MP4 conversion failed:', err);
        st.recBlob = rawBlob; st.recExt = 'webm';
        setProgress(1); setProgLabel('Done (WebM — MP4 conversion failed).');
      }
    }

    recCanvas.width = 450; recCanvas.height = 800;
    st.activeCtx = st.pvCtx;
    st.isRecording = false;
    setIsRecording(false);
    setShowDownload(true);
  }, [copy]);

  const handleDownload = useCallback(() => {
    const st = stRef.current;
    if (!st.recBlob) return;
    fetch("/api/video-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "download" }) }).catch(() => {});
    const url = URL.createObjectURL(st.recBlob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `NIAT_Bootcamp_2026_${copy.fullName.replace(/\s+/g, '_')}.${st.recExt}`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [copy.fullName]);

  const handleShareNative = useCallback(async () => {
    const st = stRef.current;
    fetch("/api/video-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "share" }) }).catch(() => {});
    const shareText = `🎬 I just created my personalized NIAT Bootcamp 2026 reel! #NIATBootcamp2026`;
    if (st.recBlob) {
      const file = new File([st.recBlob], `NIAT_Bootcamp_2026_${copy.fullName.replace(/\s+/g, '_')}.mp4`, { type: 'video/mp4' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: 'My NIAT Bootcamp 2026 Reel', text: shareText, files: [file] });
          return;
        } catch (err) {
          if ((err as DOMException).name !== 'AbortError') {
            // share failed, fall through
          } else {
            return; // user cancelled
          }
        }
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent('🎬 I just created my personalized NIAT Bootcamp 2026 reel! #NIATBootcamp2026')}`, '_blank');
  }, [copy.fullName]);

  const handleShareWhatsApp = useCallback(async () => {
    const st = stRef.current;
    if (!st.recBlob) return;
    fetch("/api/video-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "share" }) }).catch(() => {});

    const safeName = copy.fullName.trim().replace(/\s+/g, '_');
    const fileName = `${safeName}_NIAT_Bootcamp_2026.mp4`;
    const mobileBlob = new Blob([st.recBlob], { type: 'video/mp4' });
    const file = new File([mobileBlob], fileName, { type: 'video/mp4' });
    const shareText = '🎬 I just created my personalized NIAT Bootcamp 2026 reel! #NIATBootcamp2026';

    // Mobile: use native share sheet with the video file
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My NIAT Bootcamp 2026 Reel', text: shareText });
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
    }

    // Desktop: download the video + open WhatsApp Web simultaneously
    const url = URL.createObjectURL(mobileBlob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    const waText = encodeURIComponent(shareText);
    try { window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener'); } catch (_) {}

    setTimeout(() => {
      alert('Video downloaded! WhatsApp Web has opened — attach the downloaded video from your Downloads folder.');
    }, 400);
  }, [copy.fullName]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Canvas preview */}
      <div className="relative rounded-[18px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
           style={{ width: 270, height: 480 }}>
        {!loaded && (
          <div className="absolute inset-0 bg-[#0d0d0d] flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="w-8 h-8 text-[#c0586a] animate-spin" />
            <p className="text-[#aaa] text-sm">{loadMsg}</p>
          </div>
        )}
        <canvas ref={pvCanvasRef} width={450} height={800}
                style={{ width: 270, height: 480, display: 'block' }} />
      </div>

      {/* Off-screen recording canvas */}
      <canvas ref={recCanvasRef} width={450} height={800}
              style={{ position: 'fixed', top: -9999, left: -9999 }} />

      {/* Buttons */}
      {loaded && (
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          {/* Primary actions */}
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isRecording}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#c0586a] text-white font-semibold text-sm hover:opacity-85 transition disabled:opacity-40"
            >
              <Play className="w-4 h-4" /> Preview
            </button>
            <button
              type="button"
              onClick={handleRecord}
              disabled={isRecording}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:opacity-85 transition disabled:opacity-40"
            >
              {isRecording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
              {isRecording ? 'Creating…' : 'Create My Reel'}
            </button>
          </div>

          {/* Post-generation actions */}
          {showDownload && (
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:opacity-85 transition"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                type="button"
                onClick={handleShareNative}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:opacity-85 transition"
              >
                <Share2 className="w-4 h-4" /> Share My Reel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {showProgress && (
        <div className="w-[270px]">
          <div className="bg-[#222] rounded-md h-2 overflow-hidden">
            <div
              className="h-full bg-[#c0586a] transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-[#aaa] text-xs text-center mt-1.5">{progLabel}</p>
        </div>
      )}
    </div>
  );
}
