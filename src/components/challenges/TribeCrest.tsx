import { useEffect, useMemo, useRef, useState } from "react";
import type { Challenge } from "@/types/app";
import type { Submission } from "@/types/database";
import { motion } from "framer-motion";
import { toBlob } from "html-to-image";
import { Crown, Download, Share2, Sparkles } from "lucide-react";

interface TribeCrestProps {
  challenges: Challenge[];
  submissions: Submission[];
  onStoneClick: (c: Challenge) => void;
  isStoneClickable: (c: Challenge) => boolean;
  studentName: string;
}

const STONE_META: Record<number, { label: string; color: string }> = {
  1: { label: "Space Stone", color: "var(--link)" },
  2: { label: "Mind Stone", color: "var(--yellow)" },
  3: { label: "Reality Stone", color: "var(--primary-hover)" },
  4: { label: "Power Stone", color: "var(--purple-dark)" },
  5: { label: "Soul Stone", color: "var(--orange)" },
  6: { label: "Time Stone", color: "var(--success)" },
};
const SHORT_NAMES: Record<number, string> = {
  1: "Common Ground",
  2: "Crossed Mind",
  3: "Connect Dots",
  4: "Caught Great",
  5: "Time Capsule",
  6: "Real Streak",
};

const CONSTELLATION_DOTS = [
  { cx: 80, cy: 120, r: 1.5, opacity: 0.4 },
  { cx: 150, cy: 60, r: 1, opacity: 0.3 },
  { cx: 220, cy: 90, r: 2, opacity: 0.6 },
  { cx: 350, cy: 50, r: 1.5, opacity: 0.5 },
  { cx: 480, cy: 110, r: 1, opacity: 0.3 },
  { cx: 520, cy: 220, r: 2, opacity: 0.5 },
  { cx: 450, cy: 180, r: 1.5, opacity: 0.4 },
  { cx: 100, cy: 240, r: 1, opacity: 0.3 },
  { cx: 50, cy: 350, r: 2, opacity: 0.6 },
  { cx: 130, cy: 450, r: 1.5, opacity: 0.5 },
  { cx: 180, cy: 380, r: 1, opacity: 0.3 },
  { cx: 260, cy: 490, r: 1.5, opacity: 0.4 },
  { cx: 380, cy: 510, r: 2, opacity: 0.5 },
  { cx: 460, cy: 410, r: 1.5, opacity: 0.6 },
  { cx: 530, cy: 340, r: 1, opacity: 0.3 },
  { cx: 420, cy: 280, r: 1.5, opacity: 0.4 },
  { cx: 160, cy: 280, r: 2, opacity: 0.5 },
  { cx: 240, cy: 190, r: 1, opacity: 0.3 },
  { cx: 330, cy: 150, r: 1.5, opacity: 0.4 },
  { cx: 370, cy: 220, r: 1, opacity: 0.5 },
  { cx: 120, cy: 180, r: 1.5, opacity: 0.3 },
  { cx: 80, cy: 480, r: 2, opacity: 0.4 },
  { cx: 510, cy: 480, r: 1.5, opacity: 0.5 },
  { cx: 290, cy: 60, r: 1, opacity: 0.3 },
  { cx: 290, cy: 520, r: 1.5, opacity: 0.6 },
  { cx: 60, cy: 290, r: 1, opacity: 0.4 },
  { cx: 520, cy: 290, r: 2, opacity: 0.5 },
];

export default function TribeCrest({
  challenges,
  submissions,
  onStoneClick,
  isStoneClickable,
  studentName,
}: TribeCrestProps) {
  const activeChallenges = useMemo(() => {
    // 6 stones on the orbit
    return [1, 2, 3, 4, 5, 6]
      .map((id) => challenges.find((c) => c.id === id))
      .filter((c): c is Challenge => Boolean(c));
  }, [challenges]);

  const getStoneColor = (id: number) => STONE_META[id]?.color ?? "white";
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const crestRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width > 0) {
        setScale(Math.min(1, rect.width / 580));
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Use base sizes from original layout
  const baseSize = 580;
  const centerPos = 290;
  const radius = 200;
  const centerOuterSize = 160;
  const centerInnerSize = 130;
  const stoneSize = 72;
  const gemSize = 44;
  const badgeSize = 18;

  const buildCrestBlob = async () => {
    if (!crestRef.current) return null;
    return toBlob(crestRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#050816",
    });
  };

  const handleDownload = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      const blob = await buildCrestBlob();
      if (!blob) throw new Error("Unable to prepare crest image.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${studentName.replace(/\s+/g, "-").toLowerCase()}-tribe-crest.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Crest download failed:", error);
      setExportError("Download failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      const blob = await buildCrestBlob();
      if (!blob) throw new Error("Unable to prepare crest image.");

      const file = new File([blob], "tribe-crest.png", { type: "image/png" });
      if (
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        "canShare" in navigator &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "My NIAT Tribe Crest",
          text: `${studentName} - Tribe Champion`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${studentName.replace(/\s+/g, "-").toLowerCase()}-tribe-crest.png`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Crest share failed:", error);
      setExportError("Share is not available on this device. Download the crest instead.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full flex-col items-center">
      <div ref={crestRef} className="w-full flex flex-col items-center">
        {/* Desktop Animated Crest - Fully Responsive base 580x580 */}
        <div ref={wrapperRef} className="relative w-full max-w-[580px] aspect-square mx-auto">
          <div
            className="absolute top-0 left-0"
            style={{
              width: `${baseSize}px`,
              height: `${baseSize}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {/* Background Layers */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, #0a0a1a 0%, transparent 70%)",
                zIndex: 0,
              }}
            />

            <svg className="absolute inset-0 z-0 pointer-events-none" width={baseSize} height={baseSize}>
              {/* Constellation dots */}
              {CONSTELLATION_DOTS.map((dot, i) => (
                <circle
                  key={`dot-${i}`}
                  cx={dot.cx}
                  cy={dot.cy}
                  r={Math.max(0.8, dot.r)}
                  fill="white"
                  opacity={dot.opacity}
                />
              ))}
              
              {/* Orbit path ring */}
              <circle
                cx={centerPos}
                cy={centerPos}
                r={radius}
                stroke="white"
                strokeOpacity="0.12"
                strokeWidth="1"
                fill="none"
                strokeDasharray="3 6"
              />
              
              {/* Energy shield pulse */}
              <circle
                className="crest-shield-pulse"
                cx={centerPos}
                cy={centerPos}
                r={radius}
                stroke="var(--yellow)"
                fill="none"
                strokeWidth="2"
              />
              
              {/* Connecting energy lines */}
              {activeChallenges.map((challenge, i) => {
                const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
                const x = centerPos + radius * Math.cos(angle);
                const y = centerPos + radius * Math.sin(angle);
                return (
                  <line
                    key={`line-${challenge.id}`}
                    x1={centerPos}
                    y1={centerPos}
                    x2={x}
                    y2={y}
                    stroke={getStoneColor(challenge.id)}
                    strokeOpacity="0.2"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                  />
                );
              })}
            </svg>

            {/* Center Emblem */}
            <motion.div
              className="absolute z-10 flex items-center justify-center pointer-events-auto"
              style={{
                left: `${centerPos - centerOuterSize / 2}px`,
                top: `${centerPos - centerOuterSize / 2}px`,
                width: `${centerOuterSize}px`,
                height: `${centerOuterSize}px`,
              }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              {/* Outer decorative ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: "1.5px solid color-mix(in srgb, var(--yellow) 50%, transparent)",
                }}
              />
              
              {/* Inner shield circle */}
              <div
                className="flex flex-col items-center justify-center rounded-full"
                style={{
                  width: `${centerInnerSize}px`,
                  height: `${centerInnerSize}px`,
                  background: "var(--text-dark)",
                  border: "1px solid color-mix(in srgb, var(--yellow) 30%, transparent)",
                }}
              >
                <span
                  style={{
                    color: "var(--yellow)",
                    fontSize: "32px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textShadow: "0 0 12px color-mix(in srgb, var(--yellow) 40%, transparent)",
                  }}
                >
                  NIAT
                </span>
                <span
                  style={{
                    color: "color-mix(in srgb, var(--yellow) 60%, transparent)",
                    fontSize: "8px",
                    letterSpacing: "0.3em",
                    marginTop: "4px",
                  }}
                >
                  THE TRIBE CREST
                </span>
              </div>
            </motion.div>

            {/* Orbiting Stones */}
            <div className="absolute inset-0 pointer-events-none crest-orbit-ring z-20">
              {activeChallenges.map((challenge, i) => {
                const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
                const x = centerPos + radius * Math.cos(angle);
                const y = centerPos + radius * Math.sin(angle);
                const stoneColor = getStoneColor(challenge.id);
                const clickable = isStoneClickable(challenge);

                return (
                  <motion.button
                    key={`stone-${challenge.id}`}
                    type="button"
                    disabled={!clickable}
                    onClick={() => onStoneClick(challenge)}
                    className="absolute flex items-center justify-center rounded-full crest-counter-rotate pointer-events-auto"
                    style={{
                      left: `${x - stoneSize / 2}px`,
                      top: `${y - stoneSize / 2}px`,
                      width: `${stoneSize}px`,
                      height: `${stoneSize}px`,
                      border: `1px solid color-mix(in srgb, ${stoneColor} 40%, transparent)`,
                      background: "var(--text-dark)",
                      cursor: clickable ? "pointer" : "not-allowed",
                      opacity: clickable ? 1 : 0.45,
                      boxShadow: `0 0 12px color-mix(in srgb, ${stoneColor} 30%, transparent)`,
                    }}
                    initial={{ opacity: 0, x: centerPos - x, y: centerPos - y }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.12, ease: "easeOut" }}
                    whileHover={clickable ? { scale: 1.1 } : { scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div
                      className="rounded-full relative"
                      style={{
                        width: `${gemSize}px`,
                        height: `${gemSize}px`,
                        border: `1px solid color-mix(in srgb, ${stoneColor} 60%, transparent)`,
                        background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${stoneColor} 90%, white 10%), color-mix(in srgb, ${stoneColor} 80%, black 20%))`,
                        boxShadow: `0 0 12px color-mix(in srgb, ${stoneColor} 50%, transparent)`,
                      }}
                    >
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: "30%",
                          height: "20%",
                          top: "18%",
                          left: "22%",
                          background: "rgba(255,255,255,0.35)",
                        }}
                      />
                    </div>
                    
                    {/* Approved checkmark badge */}
                    <div
                      className="absolute z-10 flex items-center justify-center rounded-full bg-green-500"
                      style={{
                        width: `${badgeSize}px`,
                        height: `${badgeSize}px`,
                        bottom: "2px",
                        right: "2px",
                        border: "2px solid var(--text-dark)",
                      }}
                    >
                      <span className="text-white leading-none" style={{ fontSize: "10px" }}>✓</span>
                    </div>
                    <div
                      className="absolute pointer-events-none text-center whitespace-nowrap"
                      style={{
                        top: "calc(100% + 6px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 600,
                          color: "color-mix(in srgb, white 85%, transparent)",
                          textShadow: "0 0 6px rgba(0,0,0,0.45)",
                        }}
                      >
                        {SHORT_NAMES[challenge.id] ?? challenge.title}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Text - Desktop */}
        <motion.div
          className="mt-8 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{
              background: "color-mix(in srgb, var(--text-dark) 85%, black)",
              border: "1px solid color-mix(in srgb, var(--yellow) 35%, transparent)",
              boxShadow: "0 0 14px color-mix(in srgb, var(--yellow) 22%, transparent)",
            }}
          >
            <Sparkles size={14} style={{ color: "var(--yellow)" }} />
            <div className="text-sm font-semibold tracking-wider text-gray-100">
              {studentName}
            </div>
          </div>
          <div
            className="mt-2 flex items-center gap-1.5 font-bold uppercase"
            style={{
              fontSize: "12px",
              letterSpacing: "0.25em",
              color: "color-mix(in srgb, var(--yellow) 70%, transparent)",
              textShadow: "0 0 10px color-mix(in srgb, var(--yellow) 30%, transparent)",
            }}
          >
            <Crown size={14} />
            TRIBE CHAMPION
          </div>
        </motion.div>

      </div>
      <div className="mt-5 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={() => void handleShare()}
            disabled={isExporting}
            whileHover={isExporting ? undefined : { y: -2, scale: 1.02 }}
            whileTap={isExporting ? undefined : { scale: 0.98 }}
            className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
            style={{
              borderColor: "color-mix(in srgb, var(--yellow) 45%, transparent)",
              color: "var(--text-dark)",
              background: "linear-gradient(135deg, var(--yellow), color-mix(in srgb, var(--yellow) 75%, white 25%))",
              opacity: isExporting ? 0.6 : 1,
              boxShadow: "0 6px 18px color-mix(in srgb, var(--yellow) 32%, transparent)",
            }}
          >
            <Share2 size={14} />
            Share Crest
          </motion.button>
          <motion.button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isExporting}
            whileHover={isExporting ? undefined : { y: -2, scale: 1.02 }}
            whileTap={isExporting ? undefined : { scale: 0.98 }}
            className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
            style={{
              borderColor: "color-mix(in srgb, var(--link) 45%, transparent)",
              color: "var(--bg-base)",
              background: "linear-gradient(135deg, var(--link), color-mix(in srgb, var(--link) 70%, black 30%))",
              opacity: isExporting ? 0.6 : 1,
              boxShadow: "0 6px 18px color-mix(in srgb, var(--link) 32%, transparent)",
            }}
          >
            <Download size={14} />
            Download Image
          </motion.button>
        </div>
        {exportError ? (
          <p className="text-[11px] font-medium" style={{ color: "var(--primary)" }}>
            {exportError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
