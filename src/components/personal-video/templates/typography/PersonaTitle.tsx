import { TOKENS } from "@/lib/personal-video/designTokens";
import { GradientHeadline } from "./GradientHeadline";

export interface PersonaTitleProps {
  title: string;
  tagline?: string;
}

/** Glowing persona style — used on screens 9 and 12. */
export function PersonaTitle({ title, tagline }: PersonaTitleProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: TOKENS.spacing.sectionGap,
        textAlign: "center",
        width: "100%",
      }}
      aria-hidden
    >
      <GradientHeadline text={title} fontSize={TOKENS.font.sizes.display} />
      {tagline ? (
        <p
          style={{
            fontFamily: TOKENS.font.body,
            fontSize: TOKENS.font.sizes.body,
            fontWeight: TOKENS.font.weights.regular,
            color: TOKENS.colors.textMuted,
            margin: 0,
            maxWidth: "85%",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {tagline}
        </p>
      ) : null}
    </div>
  );
}
