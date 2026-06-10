import { adminClient } from "../../../utils/supabase/admin";
import { getPersonalizationForStudent } from "./mockPersonalization";
import type { PersonalizationContext } from "./mockPersonalization";
import type { PersonalizationCopy } from "./personalization";
import { lookupStudent } from "./fetchSheetRow";
import { getCopyForWorkshop, type Workshop } from "./workshopCopy";

export { type PersonalizationContext };

export async function resolvePersonalization(profile: {
  fullName:        string;
  tribeName?:      string;
  bootcampId:      string;
  niatBootcampId?: string;
  mobile?:         string;
}): Promise<PersonalizationContext> {
  // 1. Load ALL sheet URLs across all bootcamps (search everywhere for the student)
  const { data: sheetRows } = await adminClient
    .from("bootcamp_workshop_sheets")
    .select("workshop, sheet_url");

  if (!sheetRows || sheetRows.length === 0) {
    console.warn("[personalization] No sheets configured anywhere → using mock");
    return getPersonalizationForStudent("local", profile);
  }

  console.log("[personalization] Sheets found:", sheetRows.length, "(searching all bootcamps)");

  const sheets = (sheetRows as { workshop: string; sheet_url: string }[]).map((r) => ({
    workshop: r.workshop as Workshop,
    url:      r.sheet_url,
  }));

  // 2. Search all sheets simultaneously — pick highest-rated if multiple matches
  console.log("[personalization] Searching sheets for student (niatId:", profile.niatBootcampId ?? "none", "mobile:", profile.mobile ?? "none", ")");
  const result = await lookupStudent(sheets, {
    niatBootcampId: profile.niatBootcampId,
    mobile:         profile.mobile,
    fullName:       profile.fullName,
  });

  if (!result) {
    console.warn("[personalization] Student not found in any sheet → using name-based fallback");
    const fallbackWorkshop: Workshop = "neuroscience";
    const copy = getCopyForWorkshop(fallbackWorkshop, { fullName: profile.fullName, tribeName: profile.tribeName });
    return { copy, isMock: true };
  }

  const copy: PersonalizationCopy = getCopyForWorkshop(result.workshop, {
    fullName:  profile.fullName,
    tribeName: profile.tribeName,
  });

  return { copy, isMock: false };
}

export function mergeSheetFeedback(
  copy: PersonalizationCopy,
  _sheetRow: Record<string, string> | null
): PersonalizationCopy {
  if (!_sheetRow) return copy;
  return copy;
}
