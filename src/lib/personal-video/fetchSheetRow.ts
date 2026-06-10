import type { Workshop } from "./workshopCopy";

export interface SheetLookupResult {
  workshop: Workshop;
  row:      Record<string, string>;
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function toCsvUrls(sheetUrl: string): string[] {
  const match = sheetUrl.trim().match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Invalid Google Sheets URL: " + sheetUrl);
  const id = match[1];
  const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  const gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/);
  if (gidMatch && gidMatch[1] !== "0") {
    return [`${base}&gid=${gidMatch[1]}`, base];
  }
  return [base];
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n").map((l) => l.replace(/\r$/, "")).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

// ── Column detectors ──────────────────────────────────────────────────────────

function findBootcampIdCol(headers: string[]): string | null {
  return (
    headers.find((k) => /bootcamp.?id/i.test(k)) ??
    headers.find((k) => /niat.?id/i.test(k)) ??
    null
  );
}

function findMobileCols(headers: string[]): string[] {
  const explicit = headers.filter((k) => /mobile|phone/i.test(k));
  if (explicit.length) return explicit;
  return headers.filter((k) => /number|contact/i.test(k) && !/hall|seat|room|floor|roll/i.test(k));
}

function findFeedbackCol(headers: string[]): string | null {
  return (
    headers.find((k) => /feedback|rating|score|review/i.test(k)) ?? null
  );
}

// ── Mobile normalisation ──────────────────────────────────────────────────────

function normalizeMobile(val: string): string {
  if (!val) return "";
  const s = val.trim();
  if (/[eE]/.test(s)) {
    const n = Math.round(parseFloat(s));
    if (!isNaN(n)) return n.toString().slice(-10);
  }
  return s.replace(/\D/g, "").slice(-10);
}

// ── Feedback rating ───────────────────────────────────────────────────────────

/**
 * Scores a feedback value (text or number) 1–5.
 * Numeric string → parsed directly.
 * Common text keywords → mapped to a score.
 * Any other non-empty text → 3 (present but unstructured).
 * Empty → 1.
 */
function scoreFeedback(val: string): number {
  if (!val.trim()) return 1;
  const n = parseFloat(val.trim());
  if (!isNaN(n) && n >= 1 && n <= 5) return n;
  const v = val.trim().toLowerCase();
  if (/excellent|amazing|outstanding|superb|fantastic|loved|best/.test(v)) return 5;
  if (/great|awesome|wonderful|brilliant/.test(v)) return 4;
  if (/good|nice|helpful|useful|interesting|enjoyed/.test(v)) return 3;
  if (/ok|okay|average|fine|decent/.test(v)) return 2;
  if (/bad|poor|boring|waste|worst/.test(v)) return 1;
  return 3; // unrecognised text — assume they attended and gave some feedback
}

// ── Sheet fetcher ─────────────────────────────────────────────────────────────

async function fetchCsv(workshop: Workshop, url: string): Promise<Record<string, string>[] | null> {
  const csvUrls = toCsvUrls(url);
  for (const csvUrl of csvUrls) {
    try {
      const res = await fetch(csvUrl, {
        headers: { "Accept": "text/csv, text/plain, */*" },
        cache: "no-store",
      });
      if (!res.ok) { console.warn(`[sheets] ${workshop} → ${res.status}`); continue; }
      const text = await res.text();
      if (text.trim().startsWith("<")) { console.warn(`[sheets] ${workshop} got HTML`); continue; }
      const rows = parseCsv(text);
      if (rows.length) return rows;
    } catch (e) {
      console.error(`[sheets] ${workshop} fetch error:`, e);
    }
  }
  return null;
}

// ── Main lookup ───────────────────────────────────────────────────────────────

interface ScoredMatch extends SheetLookupResult { score: number }

/**
 * Searches ALL provided sheets for the student (by NIAT ID and/or mobile).
 * Returns the workshop where the student gave the highest-rated feedback.
 * If tied or only one match, returns that one.
 */
export async function lookupStudent(
  sheets: { workshop: Workshop; url: string }[],
  opts: { niatBootcampId?: string; mobile?: string; fullName: string },
): Promise<SheetLookupResult | null> {
  const normalizedMobile = opts.mobile ? normalizeMobile(opts.mobile) : "";

  // Fetch all sheets in parallel
  const fetched = await Promise.all(
    sheets.map(async ({ workshop, url }) => {
      const rows = await fetchCsv(workshop, url);
      return { workshop, rows };
    })
  );

  const matches: ScoredMatch[] = [];

  for (const { workshop, rows } of fetched) {
    if (!rows || !rows.length) continue;
    const headers = Object.keys(rows[0]);
    const feedbackCol = findFeedbackCol(headers);

    // Try NIAT Bootcamp ID match first
    if (opts.niatBootcampId) {
      const idCol = findBootcampIdCol(headers);
      if (idCol) {
        const row = rows.find((r) => r[idCol]?.trim().toUpperCase() === opts.niatBootcampId!.toUpperCase());
        if (row) {
          const score = feedbackCol ? scoreFeedback(row[feedbackCol]) : 3;
          matches.push({ workshop, row, score });
          continue; // found in this sheet, move to next
        }
      }
    }

    // Try mobile match
    if (normalizedMobile) {
      const mobileCols = findMobileCols(headers);
      if (mobileCols.length) {
        const row = rows.find((r) =>
          mobileCols.some((col) => normalizeMobile(r[col] ?? "") === normalizedMobile)
        );
        if (row) {
          const score = feedbackCol ? scoreFeedback(row[feedbackCol]) : 3;
          matches.push({ workshop, row, score });
        }
      }
    }
  }

  if (!matches.length) {
    console.log("[sheets] Student not found in any sheet");
    return null;
  }

  if (matches.length === 1) {
    console.log(`[sheets] Found in 1 sheet: ${matches[0].workshop}`);
    return matches[0];
  }

  // Multiple matches — pick highest rated
  matches.sort((a, b) => b.score - a.score);
  console.log(`[sheets] Found in ${matches.length} sheets:`, matches.map((m) => `${m.workshop}(${m.score})`).join(", "), `→ picking ${matches[0].workshop}`);
  return matches[0];
}

// Keep old exports for backwards compatibility
export async function lookupByNiatId(
  sheets: { workshop: Workshop; url: string }[],
  niatBootcampId: string,
): Promise<SheetLookupResult | null> {
  return lookupStudent(sheets, { niatBootcampId, fullName: "" });
}

export async function lookupByMobile(
  sheets: { workshop: Workshop; url: string }[],
  mobile: string,
): Promise<SheetLookupResult | null> {
  return lookupStudent(sheets, { mobile, fullName: "" });
}
