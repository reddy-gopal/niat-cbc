import type { PersonalizationCopy } from "./types";

export type Workshop = "iot" | "smart_watch" | "neuroscience" | "entrepreneurship";

export const WORKSHOP_LABELS: Record<Workshop, string> = {
  iot:              "IoT",
  smart_watch:      "Smart Watch",
  neuroscience:     "Neuroscience",
  entrepreneurship: "Entrepreneurship Canvas",
};

type Variant = Pick<PersonalizationCopy, "cameFor" | "stayedFor" | "leftAs" | "personaTitle">;

const WORKSHOP_VARIANTS: Record<Workshop, Variant[]> = {
  iot: [
    { cameFor: "The IoT Workshop",   stayedFor: "The Curiosity",         leftAs: "an IoT Wizard",      personaTitle: "THE IOT WIZARD"       },
    { cameFor: "The IoT Workshop",   stayedFor: "Building Cool Stuff",   leftAs: "a Gadget Guru",      personaTitle: "THE GADGET GURU"      },
    { cameFor: "The IoT Workshop",   stayedFor: "The Invention Mindset", leftAs: "a Hardware Hustler", personaTitle: "THE HARDWARE HUSTLER" },
  ],
  smart_watch: [
    { cameFor: "Smart Watch Building", stayedFor: "The Smart Ideas",    leftAs: "a Time Samurai",  personaTitle: "THE TIME SAMURAI"  },
    { cameFor: "Smart Watch Building", stayedFor: "The Next-Gen Tech",  leftAs: "a Digital Ninja", personaTitle: "THE DIGITAL NINJA" },
  ],
  neuroscience: [
    { cameFor: "Neuroscience", stayedFor: "The Fascination",                leftAs: "a Neural Ninja",     personaTitle: "THE NEURAL NINJA"     },
    { cameFor: "Neuroscience", stayedFor: "The Deep Dives",                 leftAs: "a Cortex Commander", personaTitle: "THE CORTEX COMMANDER" },
    { cameFor: "Neuroscience", stayedFor: "The Mind-Bending Conversations", leftAs: "a Neural Navigator", personaTitle: "THE NEURAL NAVIGATOR" },
  ],
  entrepreneurship: [
    { cameFor: "Entrepreneurship Canvas", stayedFor: "The Brainstorming",      leftAs: "a Startup Strategist", personaTitle: "THE STARTUP STRATEGIST" },
    { cameFor: "Entrepreneurship Canvas", stayedFor: "The Energy",             leftAs: "a Future CEO",          personaTitle: "THE FUTURE CEO"         },
    { cameFor: "Entrepreneurship Canvas", stayedFor: "The Innovation Mindset", leftAs: "a Next-Gen Founder",    personaTitle: "THE NEXT-GEN FOUNDER"   },
  ],
};

const WORKSHOP_TAGLINE: Record<Workshop, string> = {
  iot:              "Connecting devices, ideas, and people together.",
  smart_watch:      "A bootcamp where smart ideas started ticking.",
  neuroscience:     "Where curiosity met the human mind.",
  entrepreneurship: "A workshop built for future founders.",
};

/** Deterministically picks a variant so the same student always sees the same copy */
function pickVariant<T>(items: T[], seed: string): T {
  const hash = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return items[hash % items.length];
}

export function getCopyForWorkshop(
  workshop: Workshop,
  profile: { fullName: string; tribeName?: string }
): PersonalizationCopy {
  const variant = pickVariant(WORKSHOP_VARIANTS[workshop], profile.fullName);
  return {
    fullName:          profile.fullName,
    tribeName:         profile.tribeName ?? "Your Tribe",
    lovedMostHeadline: WORKSHOP_TAGLINE[workshop],
    lovedMostSubline:  WORKSHOP_TAGLINE[workshop],
    personaTagline:    WORKSHOP_TAGLINE[workshop],
    closingLine:       WORKSHOP_TAGLINE[workshop],
    ...variant,
  };
}
