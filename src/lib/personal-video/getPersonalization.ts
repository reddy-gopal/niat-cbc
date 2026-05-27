import { getPersonalizationForStudent } from "./mockPersonalization";
import type { PersonalizationContext } from "./mockPersonalization";
import type { PersonalizationCopy } from "./personalization";

export function resolvePersonalization(profile?: {
  fullName?: string;
  tribeName?: string;
}): PersonalizationContext {
  return getPersonalizationForStudent("local", profile);
}

/**
 * Future: merge Google Sheets feedback row into copy (screens 6, 9, 11, 12).
 * @example
 * const sheet = await fetchSheetRowByMobile(mobile);
 * return { ...copy, lovedMostHeadline: sheet.loved_most, ... };
 */
export function mergeSheetFeedback(
  copy: PersonalizationCopy,
  _sheetRow: Record<string, string> | null
): PersonalizationCopy {
  if (!_sheetRow) return copy;
  return copy;
}
