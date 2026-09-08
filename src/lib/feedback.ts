export const FEEDBACK_MARKER = "[ROOMSNOW_FEEDBACK:";

export function encodeFeedback(category: string, title: string, message: string, pageUrl?: string) {
  return `${FEEDBACK_MARKER}${category}]\nTITLE:${title}\nPAGE:${pageUrl ?? ""}\n\n${message}`;
}

export function decodeFeedback(detail: string | null) {
  const source = detail ?? "";
  const category = source.match(/^\[ROOMSNOW_FEEDBACK:([^\]]+)\]/)?.[1] ?? "OTHER";
  const title = source.match(/^TITLE:(.*)$/m)?.[1]?.trim() || "Site feedback";
  const pageUrl = source.match(/^PAGE:(.*)$/m)?.[1]?.trim() || null;
  const message = source.split("\n\n").slice(1).join("\n\n").trim();
  return { category, title, pageUrl, message };
}
