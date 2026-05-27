"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Loader2, Play, Video, Download } from "lucide-react";
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
};

const SLIDES: [number, number][] = [
  [1,4],[2,0],[3,4],[4,4],[5,4],[6,4],
  [7,4],[8,4],[10,4],[11,4],[12,4]
];

const FPS = 30;

interface Props {
  copy: PersonalizationCopy;
  photos: PersonalizationPhotos;
}

interface ReelState {
  BASE_IMGS: Record<string, HTMLCanvasElement | null>;
  userImgs: (HTMLCanvasElement | null)[];
  userVideo: HTMLVideoElement | null;
  videoDur: number;
  recBlob: Blob | null;
  recExt: string;
  pvCtx: CanvasRenderingContext2D | null;
  recCtx: CanvasRenderingContext2D | null;
  activeCtx: CanvasRenderingContext2D | null;
  previewRunning: boolean;
  isRecording: boolean;
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

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => { console.warn('Could not load:', src); resolve(null); };
    img.src = src;
  });
}

function waitForVideo(vid: HTMLVideoElement): Promise<void> {
  return new Promise(resolve => {
    if (vid.readyState >= 3) { resolve(); return; }
    const done = () => { vid.removeEventListener('canplaythrough', done); resolve(); };
    vid.addEventListener('canplaythrough', done);
    setTimeout(resolve, 15000);
  });
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
      const sc = 1 + 0.04 * eo(t);
      ctx.save();
      ctx.translate(225, 400); ctx.scale(sc, sc); ctx.translate(-225, -400);
      if (BASE.s1) ctx.drawImage(BASE.s1, 0, 0, 450, 800);
      ctx.restore();
      break;
    }
    case 2:
      if (st.userVideo) ctx.drawImage(st.userVideo, 0, 0, 450, 800);
      break;
    case 3: {
      drawPhotoOnTemplate(BASE.s3 ?? null, uImgs[0] ?? null, 51, 110, 348, 466, 18);
      const na = sub(0.5, 0.85);
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
      const breathe = 1 + 0.018 * Math.sin(t * Math.PI);
      ctx.save();
      ctx.translate(225, 400); ctx.scale(breathe, breathe); ctx.translate(-225, -400);
      if (BASE.s4) ctx.drawImage(BASE.s4, 0, 0, 450, 800);
      ctx.restore();
      const a1 = sub(0.15, 0.5);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = 'bold 54px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, 385, 60); ctx.globalAlpha = a1;
      ctx.translate(0, (1 - a1) * 22); ctx.fillText('Where It', 225, 385); ctx.restore();
      const a2 = sub(0.38, 0.72);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = 'bold 54px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, 450, 60); ctx.globalAlpha = a2;
      ctx.translate(0, (1 - a2) * 22); ctx.fillText('All Began', 225, 450); ctx.restore();
      break;
    }
    case 5:
      if (BASE.s5) ctx.drawImage(BASE.s5, 0, 0, 450, 800);
      break;
    case 6: {
      if (BASE.s6) ctx.drawImage(BASE.s6, 0, 0, 450, 800);
      const cameWords = copy.cameFor.split(' ');
      const midIdx6   = Math.floor(cameWords.length / 2);
      const lineH6    = 54;
      let y6 = 370 - ((cameWords.length - 1) * lineH6) / 2;
      const wInterval = 0.55 / cameWords.length;
      ctx.font = 'bold 46px "Segoe UI",sans-serif';
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
      drawPhotoOnTemplate(BASE.s7 ?? null, uImgs[1] ?? null, 51, 110, 348, 466, 18);
      const na = sub(0.5, 0.85);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = 'bold 28px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, 660, 34); ctx.globalAlpha = na;
      ctx.translate(0, (1 - na) * 20);
      ctx.fillText(copy.tribeName, 225, 660); ctx.restore();
      break;
    }
    case 8: {
      const sc8 = 1 + 0.03 * eo(t);
      ctx.save(); ctx.translate(225, 400); ctx.scale(sc8, sc8); ctx.translate(-225, -400);
      if (BASE.s8) ctx.drawImage(BASE.s8, 0, 0, 450, 800);
      ctx.restore();
      break;
    }
    case 10:
      drawPhotoOnTemplate(BASE.s10 ?? null, uImgs[2] ?? null, 51, 110, 348, 580, 18);
      break;
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
      ctx.font = '22px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, 215, 26); ctx.globalAlpha = na12;
      ctx.translate(0, (1 - na12) * 16); ctx.fillText(copy.fullName, 225, 215); ctx.restore();
      const titleWords = copy.personaTitle.split(' ');
      const midIdxT    = Math.floor(titleWords.length / 2);
      const tStep      = 0.32 / titleWords.length;
      ctx.font = 'bold 52px "Segoe UI",sans-serif';
      let ty = 295;
      titleWords.forEach((w, i) => {
        const wa = sub(0.22 + i * tStep, 0.22 + i * tStep + 0.26);
        ctx.save(); ctx.textAlign = 'center';
        ctx.fillStyle = (i === midIdxT) ? '#A8030C' : tGrad(ctx, ty, 64);
        ctx.globalAlpha = wa; ctx.translate(0, (1 - wa) * 20);
        ctx.fillText(w, 225, ty); ctx.restore(); ty += 64;
      });
      const sa12 = sub(0.72, 0.95);
      const subWords = copy.personaTagline.split(' ');
      const half     = Math.ceil(subWords.length / 2);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = '17px "Segoe UI",sans-serif';
      ctx.fillStyle = tGrad(ctx, ty + 22, 44); ctx.globalAlpha = sa12 * 0.85;
      ctx.translate(0, (1 - sa12) * 12);
      ctx.fillText(subWords.slice(0, half).join(' '), 225, ty + 10);
      ctx.fillText(subWords.slice(half).join(' '), 225, ty + 34);
      ctx.restore();
      break;
    }
    default:
      ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, 450, 800);
  }

  // Global fade-in from black
  if (slide !== 2) {
    const fi = Math.max(0, Math.min(1, t / 0.18));
    if (fi < 1) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.globalAlpha = (1 - Math.pow(fi, 3));
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
  webmBlob: Blob,
  onMsg: (m: string) => void,
  onProgress: (p: number) => void,
): Promise<Blob> {
  const ff = await _getFFmpeg(onMsg);
  onMsg('Converting to MP4…');
  (ff as { on: Function }).on('progress', ({ progress }: { progress: number }) => {
    onProgress(Math.min(1, progress));
    onMsg(`Converting to MP4… ${Math.round(Math.min(1, progress) * 100)}%`);
  });
  await (ff as { writeFile: Function }).writeFile('in.webm', await _fetchFile(webmBlob));
  await (ff as { exec: Function }).exec([
    '-i', 'in.webm', '-c:v', 'libx264', '-preset', 'fast',
    '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', 'out.mp4'
  ]);
  const data = await (ff as { readFile: Function }).readFile('out.mp4') as { buffer: ArrayBuffer };
  await (ff as { deleteFile: Function }).deleteFile('in.webm');
  await (ff as { deleteFile: Function }).deleteFile('out.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BootcampReelGenerator({ copy, photos }: Props) {
  const pvCanvasRef  = useRef<HTMLCanvasElement>(null);
  const recCanvasRef = useRef<HTMLCanvasElement>(null);
  const stRef = useRef<ReelState>({
    BASE_IMGS: {}, userImgs: [null, null, null],
    userVideo: null, videoDur: 0,
    recBlob: null, recExt: 'mp4',
    pvCtx: null, recCtx: null, activeCtx: null,
    previewRunning: false, isRecording: false,
  });

  const [loaded, setLoaded]           = useState(false);
  const [loadMsg, setLoadMsg]         = useState("Loading assets…");
  const [progress, setProgress]       = useState(0);
  const [progLabel, setProgLabel]     = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Load user photo into a scaled canvas
  const loadUserPhoto = useCallback(async (url: string | null): Promise<HTMLCanvasElement | null> => {
    if (!url) return null;
    const img = await loadImg(url);
    if (!img) return null;
    return scalePhotoHQ(img, 2048);
  }, []);

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

      setLoadMsg('Loading highlight reel video…');
      const vid = document.createElement('video');
      vid.src     = `${ASSET_BASE}/Bootcamp_TemplateReel_UpdatedDraft.mp4`;
      vid.muted   = true;
      vid.preload = 'auto';
      vid.load();
      await waitForVideo(vid);
      stRef.current.userVideo = vid;
      stRef.current.videoDur  = vid.duration || 0;

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

      stRef.current.activeCtx = pvCtx;
      drawSlide(1, 1, stRef.current, copy);
      setLoaded(true);
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
    st.previewRunning = true;
    st.activeCtx = st.pvCtx;

    for (const [slide, dur] of SLIDES) {
      if (slide === 2 && st.userVideo) {
        st.userVideo.currentTime = 0;
        await new Promise<void>(r => { st.userVideo!.onseeked = () => r(); setTimeout(r, 1000); });
        st.userVideo.play().catch(() => {});
        const end = Date.now() + (st.videoDur > 0 ? st.videoDur * 1000 : 5000);
        while (Date.now() < end) {
          st.pvCtx!.clearRect(0, 0, 450, 800);
          st.pvCtx!.drawImage(st.userVideo, 0, 0, 450, 800);
          await new Promise<void>(r => requestAnimationFrame(() => r()));
        }
        st.userVideo.pause();
      } else {
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
      }
    }

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

    const totalDur = SLIDES.reduce((acc, [, d]) => acc + (d === 0 ? st.videoDur : d), 0);
    let elapsed = 0;

    const mimeType = [
      'video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4',
      'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
    ].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const nativeMP4 = mimeType.startsWith('video/mp4');

    const stream   = recCanvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 12_000_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start();

    const waitFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

    for (const [slide, dur] of SLIDES) {
      if (slide === 2 && st.userVideo) {
        st.userVideo.currentTime = 0;
        await new Promise<void>(r => { st.userVideo!.onseeked = () => r(); setTimeout(r, 1000); });
        st.userVideo.play().catch(() => {});
        const frames = Math.ceil(st.videoDur * FPS);
        for (let f = 0; f < frames; f++) {
          st.recCtx!.setTransform(1, 0, 0, 1, 0, 0);
          st.recCtx!.clearRect(0, 0, 900, 1600);
          st.recCtx!.drawImage(st.userVideo, 0, 0, 900, 1600);
          await waitFrame();
        }
        st.userVideo.pause();
        elapsed += st.videoDur;
      } else {
        const frames = Math.ceil(dur * FPS);
        for (let f = 0; f < frames; f++) {
          const t = frames > 1 ? f / (frames - 1) : 1;
          drawSlide(slide, t, st, copy);
          await waitFrame();
        }
        elapsed += dur;
      }
      setProgress(Math.min(1, elapsed / totalDur));
      setProgLabel(`Recording slide ${slide}/${SLIDES.length}…`);
    }

    recorder.stop();
    await new Promise<void>(r => { recorder.onstop = () => r(); });

    const rawBlob = new Blob(chunks, { type: mimeType || 'video/webm' });

    if (nativeMP4) {
      st.recBlob = rawBlob; st.recExt = 'mp4';
      setProgress(1); setProgLabel('Done! Click Download.');
    } else {
      try {
        st.recBlob = await convertToMP4(
          rawBlob,
          m => setProgLabel(m),
          p => setProgress(p),
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
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#c0586a] text-white font-semibold text-sm hover:opacity-85 transition disabled:opacity-40"
          >
            <Play className="w-4 h-4" /> Preview Reel
          </button>
          <button
            type="button"
            onClick={handleRecord}
            disabled={isRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:opacity-85 transition disabled:opacity-40"
          >
            {isRecording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            {isRecording ? 'Recording…' : 'Generate & Download'}
          </button>
          {showDownload && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:opacity-85 transition"
            >
              <Download className="w-4 h-4" /> Download Video
            </button>
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
