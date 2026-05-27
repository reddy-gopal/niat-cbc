import { TOKENS } from "@/lib/personal-video/designTokens";

export interface GradientHeadlineProps {
  text: string;
  fontSize?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function GradientHeadline({
  text,
  fontSize = TOKENS.font.sizes.headline,
  className = "",
  style,
}: GradientHeadlineProps) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const lastWord = words.pop()!;
  const prefix = words.join(" ");

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        gap: "0.25em",
        fontFamily: TOKENS.font.heading,
        fontWeight: TOKENS.font.weights.black,
        fontSize,
        lineHeight: 1.1,
        textAlign: "center",
        maxWidth: "100%",
        ...style,
      }}
      aria-hidden
    >
      {prefix ? (
        <span style={{ color: TOKENS.colors.textPrimary }}>{prefix} </span>
      ) : null}
      <span
        style={{
          backgroundImage: TOKENS.gradients.pinkFade,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {lastWord}
      </span>
    </div>
  );
}
