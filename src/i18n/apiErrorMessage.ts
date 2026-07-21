import { getWordPlain } from "../wordData/getWord";
import i18n from "./i18n";

/**
 * Maps backend/API error codes to localized copy. Add keys under `errors` namespace JSON;
 * unknown codes fall back to `errors:unknown`.
 */
export function translateApiErrorCode(code: string | undefined | null): string {
  const trimmed = code?.trim();
  if (trimmed) {
    const key = `errors:${trimmed}`;
    if (i18n.exists(key)) return i18n.t(key);
  }
  return i18n.t("errors:unknown");
}

function parseNumericCode(code: string | undefined | null): number | undefined {
  const trimmed = code?.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Gateway / API error display: WordData[numericCode] → i18n errors:key → server errMessage → fallback.
 */
export function translateGatewayError(
  code: string | number | undefined | null,
  errMessage?: string | null,
  fallback = "Something went wrong. Please try again.",
): string {
  const codeStr =
    code === undefined || code === null ? "" : String(code).trim();
  const numericId = parseNumericCode(codeStr);
  if (numericId !== undefined) {
    const fromWordData = getWordPlain(numericId);
    if (fromWordData) return fromWordData;
  }
  if (codeStr) {
    const fromI18n = translateApiErrorCode(codeStr);
    if (fromI18n !== i18n.t("errors:unknown")) return fromI18n;
  }
  const serverMsg = errMessage?.trim();
  if (serverMsg) return serverMsg;
  return fallback;
}
