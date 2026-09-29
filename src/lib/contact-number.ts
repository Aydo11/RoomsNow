/**
 * Helpers for nudging people to leave a phone number when they contact a
 * provider. Providers tend to ring round when a room comes up, so a message
 * with a number in it gets a much quicker answer.
 */

/** Tidies a UK phone number, or returns null if it doesn't look like one. */
export function normaliseUkPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+44")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("0044")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("44") && digits.length === 12) digits = `0${digits.slice(2)}`;
  if (!/^0\d{9,10}$/.test(digits)) return null;
  // 07xxx xxxxxx for mobiles, 0xxx xxx xxxx for landlines.
  if (digits.startsWith("07") && digits.length === 11) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.startsWith("02") && digits.length === 11) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  if (digits.length === 11) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return digits;
}

/**
 * What to use from a "your phone number" box: a tidy UK number where possible,
 * otherwise what they typed if it has enough digits to be a real number
 * (international numbers are fine). Null for blank; "invalid" for junk.
 */
export function contactNumberFromInput(input: string | null | undefined): string | null | "invalid" {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  const uk = normaliseUkPhone(trimmed);
  if (uk) return uk;
  const digits = trimmed.replace(/\D/g, "");
  if (/^[\d\s+().-]+$/.test(trimmed) && digits.length >= 7 && digits.length <= 15) return trimmed.replace(/\s+/g, " ");
  return "invalid";
}

/** True when the text already contains something that looks like a UK phone number. */
export function mentionsPhone(text: string | null | undefined): boolean {
  if (!text) return false;
  const candidates = text.match(/(?:\+?44|0)[\d\s().-]{8,16}\d/g) ?? [];
  return candidates.some((candidate) => normaliseUkPhone(candidate) !== null);
}

/** Adds "My number is …" to the end of a message unless it's already there. */
export function withContactNumber(body: string, phone: string | null): string {
  if (!phone || mentionsPhone(body)) return body;
  return `${body.trimEnd()}\n\nMy number is ${phone} — feel free to call or text.`;
}
