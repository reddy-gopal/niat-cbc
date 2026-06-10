export const TOKENS = {
  colors: {
    background: "#0D0D0D",
    outerFrame: "#0D0005",
    surface: "#1A1A2E",
    primary: "#E91E8C",
    primaryLight: "#FF6EC7",
    accent: "#FFD700",
    maroon: "#6B0F1A",
    maroonDeep: "#3D0810",
    textPrimary: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.6)",
    cardBorder: "rgba(233, 30, 140, 0.35)",
    gold: "#D4AF37",
  },
  gradients: {
    pinkFade: "linear-gradient(90deg, #FFFFFF 0%, #E91E8C 100%)",
    pinkFadeVertical: "linear-gradient(180deg, #FFFFFF 0%, #FF6EC7 100%)",
    cardSurface: "linear-gradient(145deg, #1A1A2E 0%, #0D0D0D 100%)",
    glowRing: "conic-gradient(from 0deg, #E91E8C, #FFD700, #E91E8C)",
    heroCard: "linear-gradient(180deg, #1a0508 0%, #0D0D0D 55%, #000000 100%)",
    redCard: "linear-gradient(180deg, #4a0a14 0%, #1a0508 50%, #0D0D0D 100%)",
  },
  radii: {
    card: "24px",
    photo: "16px",
    pill: "999px",
    circle: "50%",
  },
  spacing: {
    framePad: "48px",
    sectionGap: "32px",
  },
  font: {
    heading: "var(--font-heading), 'Syne', 'Inter', sans-serif",
    body: "var(--font-body), 'DM Sans', 'Inter', sans-serif",
    sizes: {
      display: "72px",
      headline: "56px",
      subline: "36px",
      body: "28px",
      caption: "22px",
    },
    weights: {
      black: 900,
      bold: 700,
      regular: 400,
    },
  },
  frame: {
    width: 1080,
    height: 1920,
  },
} as const;
