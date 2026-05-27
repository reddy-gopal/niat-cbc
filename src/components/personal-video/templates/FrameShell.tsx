import type { ReactNode } from "react";
import { TOKENS } from "@/lib/personal-video/designTokens";

export interface FrameShellProps {
  children: ReactNode;
  background?: string;
  className?: string;
}

function CornerStar({ style }: { style: React.CSSProperties }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      style={style}
      aria-hidden
    >
      <path
        d="M40 4 L48 32 L76 40 L48 48 L40 76 L32 48 L4 40 L32 32 Z"
        fill="white"
        fillOpacity="0.12"
      />
    </svg>
  );
}

export function FrameShell({ children, background, className = "" }: FrameShellProps) {
  const bg = background ?? TOKENS.gradients.heroCard;

  return (
    <div
      data-frame-export
      className={className}
      style={{
        width: TOKENS.frame.width,
        height: TOKENS.frame.height,
        position: "relative",
        overflow: "hidden",
        background: bg,
        boxSizing: "border-box",
      }}
      aria-hidden
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />
      <CornerStar style={{ position: "absolute", top: 24, left: 24, opacity: 0.5 }} />
      <CornerStar style={{ position: "absolute", top: 24, right: 24, opacity: 0.4 }} />
      <CornerStar style={{ position: "absolute", bottom: 24, left: 24, opacity: 0.35 }} />
      <CornerStar style={{ position: "absolute", bottom: 24, right: 24, opacity: 0.45 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}
