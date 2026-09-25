/**
 * Adverts store sanitised HTML. Tour mode and read-aloud need it as plain
 * text: line breaks kept, tags and entities gone, optionally trimmed.
 */
export function htmlToText(html: string | null | undefined, limit?: number): string | null {
  if (!html) return null;
  const text = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  return limit && text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}
