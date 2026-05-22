/** Shared parsing for JSON API routes — surfaces status-specific errors instead of generic "Network error". */

export type ApiErrorPayload = {
  success?: boolean;
  error?: string;
  message?: string;
  detail?: string;
  code?: string;
};

function httpStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request was invalid. Check your submission and try again.";
    case 401:
      return "Your session expired. Sign in again and retry.";
    case 403:
      return "You do not have permission to perform this action.";
    case 413:
      return "The file is too large to upload (server limit is 4.5 MB). Use a smaller image or a new screenshot.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
    case 500:
      return "The server encountered an error. Try again in a few minutes.";
    case 502:
      return "The server is temporarily unavailable. Try again shortly.";
    case 503:
      return "The service is temporarily unavailable. Try again shortly.";
    case 504:
      return "The request timed out while processing. Try a smaller image or submit again.";
    default:
      if (status >= 500) {
        return `Server error (${status}). Try again later.`;
      }
      if (status >= 400) {
        return `Request failed (${status}). Try again.`;
      }
      return `Unexpected response (${status}). Try again.`;
  }
}

function firstApiMessage(body: ApiErrorPayload | null): string | null {
  if (!body) return null;
  const parts = [body.error, body.message, body.detail].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );
  if (parts.length === 0) return null;
  const text = parts.join(" ");
  if (typeof body.code === "string" && body.code.trim()) {
    return `${text} (${body.code.trim()})`;
  }
  return text;
}

export function messageFromFetchFailure(error: unknown): string {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed")
    ) {
      return "Could not reach the server. Check your internet connection and try again.";
    }
    return `Connection error: ${error.message}`;
  }
  if (error instanceof DOMException) {
    if (error.name === "AbortError") {
      return "The request was cancelled. Try again.";
    }
    return error.message || "Request failed.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export async function readApiJsonResponse<T extends ApiErrorPayload>(
  res: Response
): Promise<{ ok: true; body: T } | { ok: false; message: string }> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    return { ok: false, message: "Could not read the server response. Try again." };
  }

  let body: T | null = null;
  if (text.trim()) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      const statusMsg = httpStatusMessage(res.status);
      const snippet = text.replace(/\s+/g, " ").trim().slice(0, 100);
      if (!res.ok) {
        return {
          ok: false,
          message: snippet
            ? `${statusMsg} (response: ${snippet}${text.length > 100 ? "…" : ""})`
            : statusMsg,
        };
      }
      return {
        ok: false,
        message: "The server returned an unexpected response. Please try again.",
      };
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      message: firstApiMessage(body) ?? httpStatusMessage(res.status),
    };
  }

  if (body?.success === false) {
    return {
      ok: false,
      message: firstApiMessage(body) ?? "Request failed. Please try again.",
    };
  }

  return { ok: true, body: (body ?? {}) as T };
}

export async function fetchApiJson<T extends ApiErrorPayload>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: true; response: Response; body: T } | { ok: false; message: string }> {
  try {
    const response = await fetch(input, init);
    const parsed = await readApiJsonResponse<T>(response);
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
    return { ok: true, response, body: parsed.body };
  } catch (error) {
    return { ok: false, message: messageFromFetchFailure(error) };
  }
}
