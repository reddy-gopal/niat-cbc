/** Instagram username max length per platform rules. */
export const INSTAGRAM_HANDLE_MAX_LENGTH = 30;

/** Example profile URL for placeholders and hints. */
export const INSTAGRAM_PROFILE_URL_EXAMPLE = "https://www.instagram.com/ab_bba_i/";

const USERNAME_PATTERN = /^[a-z0-9._]+$/;

/** First path segment of instagram.com URLs that is not a profile username. */
const RESERVED_PROFILE_PATH_SEGMENTS = new Set([
  "p",
  "reel",
  "reels",
  "stories",
  "explore",
  "tv",
  "accounts",
  "direct",
  "graphql",
  "legal",
  "about",
  "support",
]);

/**
 * Strip @, trim, lowercase. Does not validate length or characters.
 */
export function normalizeInstagramHandleInput(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("@")) {
    s = s.slice(1).trim();
  }
  return s.toLowerCase();
}

export function isValidInstagramUsername(normalized: string): boolean {
  if (!normalized || normalized.length > INSTAGRAM_HANDLE_MAX_LENGTH) return false;
  return USERNAME_PATTERN.test(normalized);
}

/** Canonical profile URL for display (trailing slash). */
export function buildInstagramProfileUrl(username: string): string {
  const u = normalizeInstagramHandleInput(username);
  return `https://www.instagram.com/${u}/`;
}

function normalizeUrlStringForParse(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (/instagram\.com/i.test(t)) {
    return `https://${t.replace(/^\/+/, "")}`;
  }
  return t;
}

export type ParseInstagramProfileResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

/**
 * Accepts a full Instagram profile URL or a plain username (with optional @).
 * Returns normalized username for storage, or a student-facing error.
 */
export function parseInstagramProfileInput(raw: string): ParseInstagramProfileResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter your Instagram profile link." };
  }

  const tryAsUrl = normalizeUrlStringForParse(trimmed);
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) || /instagram\.com/i.test(trimmed);

  if (looksLikeUrl) {
    let url: URL;
    try {
      url = new URL(tryAsUrl);
    } catch {
      return {
        ok: false,
        error: `Enter a valid link like ${INSTAGRAM_PROFILE_URL_EXAMPLE}`,
      };
    }

    const host = url.hostname.toLowerCase();
    if (!host.endsWith("instagram.com")) {
      return {
        ok: false,
        error: "Use an instagram.com profile link.",
      };
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return {
        ok: false,
        error: "The link must include your username after instagram.com/",
      };
    }

    const first = segments[0].toLowerCase();
    if (RESERVED_PROFILE_PATH_SEGMENTS.has(first)) {
      return {
        ok: false,
        error:
          "That looks like a post or Reel link. Paste your profile link instead (e.g. instagram.com/yourusername).",
      };
    }

    const candidate = normalizeInstagramHandleInput(segments[0]);
    if (!candidate) {
      return { ok: false, error: "Could not read a username from that link." };
    }
    if (!isValidInstagramUsername(candidate)) {
      return {
        ok: false,
        error: `Username in the link must use only letters, numbers, underscores, and periods (max ${INSTAGRAM_HANDLE_MAX_LENGTH} characters).`,
      };
    }
    return { ok: true, username: candidate };
  }

  const normalized = normalizeInstagramHandleInput(trimmed);
  if (!normalized) {
    return { ok: false, error: "Enter your Instagram profile link or username." };
  }
  if (!isValidInstagramUsername(normalized)) {
    return {
      ok: false,
      error: `Use a profile link like ${INSTAGRAM_PROFILE_URL_EXAMPLE} or type your username (letters, numbers, _, . — max ${INSTAGRAM_HANDLE_MAX_LENGTH}).`,
    };
  }
  return { ok: true, username: normalized };
}
