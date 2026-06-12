export const POST_LOGIN_REDIRECT_KEY = "niat_cbc_post_login_redirect";

export const PERSONAL_VIDEO_PATH = "/profile/personal-video";

/** Same-origin relative paths only — blocks open redirects. */
export function isSafeRedirectPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return true;
}

export function setPostLoginRedirect(path: string): void {
  if (typeof window === "undefined" || !isSafeRedirectPath(path)) return;
  localStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
}

export function consumePostLoginRedirect(): string | null {
  if (typeof window === "undefined") return null;
  const path = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
  localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  if (!path || !isSafeRedirectPath(path)) return null;
  return path;
}
