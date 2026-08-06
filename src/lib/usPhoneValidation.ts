/** Digits only from a phone input value. */
export function extractPhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/** Limit US national input to 10 digits as the user types. */
export function sanitizeUsPhoneInput(raw: string): string {
  return extractPhoneDigits(raw).slice(0, 10);
}

/**
 * NANP: 10-digit US number — area code and exchange cannot start with 0 or 1.
 * @see https://en.wikipedia.org/wiki/North_American_Numbering_Plan
 */
export function isValidUsPhoneDigits(digits: string): boolean {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits);
}

/** WordData id for phone validation error, or null when valid. */
export function usPhoneValidationWordId(digits: string): number | null {
  if (!digits) return null;
  if (digits.length < 10) return 555;
  if (!isValidUsPhoneDigits(digits)) return 557;
  return null;
}
