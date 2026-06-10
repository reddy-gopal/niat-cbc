import { TOKENS } from "@/lib/personal-video/designTokens";
import type { PersonalizationCopy, PhotoSet } from "@/lib/personal-video/types";
import { FrameShell } from "./FrameShell";

export interface ScreenTemplateProps {
  copy: PersonalizationCopy;
  photos: PhotoSet;
}

const CARD_INSET = 40;
const CARD_RADIUS = 28;

export function Screen03({ copy, photos }: ScreenTemplateProps) {
  return (
    <FrameShell background={TOKENS.colors.outerFrame}>
      <div
        style={{
          position: "absolute",
          inset: CARD_INSET,
          borderRadius: CARD_RADIUS,
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos.photo1}
          alt=""
          crossOrigin="anonymous"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            display: "block",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "25%",
            background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.88))",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 0,
            right: 0,
            textAlign: "center",
            color: TOKENS.colors.textPrimary,
            fontSize: "52px",
            fontWeight: TOKENS.font.weights.bold,
            fontFamily: TOKENS.font.heading,
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
            padding: "0 24px",
            zIndex: 2,
          }}
        >
          {copy.fullName}
        </div>
      </div>
    </FrameShell>
  );
}
