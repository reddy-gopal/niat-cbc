import type { PersonalizationCopy } from "./types";

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

export interface PersonalizationContext {
  copy: PersonalizationCopy;
  isMock: boolean;
}

/**
 * Resolves copy for compositing. Uses mock data until Profile + Sheets are wired.
 * Pass profile overrides when available (fullName, tribeName).
 */
export function getPersonalizationForStudent(
  _studentId: string,
  profile?: { fullName?: string; tribeName?: string }
): PersonalizationContext {
  const copy: PersonalizationCopy = {
    ...MOCK_COPY,
    ...(profile?.fullName ? { fullName: profile.fullName } : {}),
    ...(profile?.tribeName ? { tribeName: profile.tribeName } : {}),
  };

  /** Creative fields still mock until Google Sheets feedback is integrated. */
  const isMock = true;

  return { copy, isMock };
}

export { MOCK_COPY };
