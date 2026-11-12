import type { ReactNode } from "react";
import { cleanNewsLink, newsParagraphs } from "./news";

/**
 * News post formatting. Posts are stored as plain text with a few simple
 * marks, which the editor toolbar inserts for you:
 *
 *   **bold**  *italic*  __underline__  ==highlight==  [link text](https://…)
 *   ## Heading      > Quote      - Bullet      1. Numbered
 *
 * It renders to React elements (never raw HTML), so nothing a writer types
 * can inject scripts or styles.
 */

export const NEWS_FONTS = {
  SANS: { label: "Standard", className: "" },
  SERIF: { label: "Classic serif", className: "font-serif" },
  ROUNDED: { label: "Friendly rounded", className: "[font-family:ui-rounded,'SF_Pro_Rounded','Nunito',system-ui,sans-serif]" },
} as const;
export type NewsFont = keyof typeof NEWS_FONTS;
export const isNewsFont = (v: unknown): v is NewsFont => typeof v === "string" && Object.hasOwn(NEWS_FONTS, v);

const INLINE = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|==[^=\n]+?==|\*[^*\n]+?\*|\[[^\]\n]+?\]\([^)\s]+?\))/g;

export function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${keyPrefix}-${n++}`;
    if (token.startsWith("**")) out.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>);
    else if (token.startsWith("__")) out.push(<u key={key}>{renderInline(token.slice(2, -2), key)}</u>);
    else if (token.startsWith("==")) out.push(<mark key={key} className="rounded bg-[#f5b544]/35 px-0.5 text-inherit">{renderInline(token.slice(2, -2), key)}</mark>);
    else if (token.startsWith("[")) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token) ?? [];
      const safe = cleanNewsLink(href);
      if (safe) {
        const external = /^https?:/.test(safe);
        out.push(
          <a key={key} href={safe} className="font-semibold text-pine-dark underline underline-offset-4" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {label}
          </a>,
        );
      } else out.push(token);
    } else out.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    last = at + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** One block (separated by blank lines) → heading, quote, list or paragraph. */
function renderBlock(block: string, i: number): ReactNode {
  const lines = block.split("\n");
  const key = `b${i}`;
  if (lines.length === 1 && /^#{2,3}\s/.test(block)) {
    const text = block.replace(/^#{2,3}\s+/, "");
    return block.startsWith("###") ? (
      <h3 key={key} className="pt-2 text-[20px] font-semibold leading-snug">{renderInline(text, key)}</h3>
    ) : (
      <h2 key={key} className="pt-3 text-[25px] font-semibold leading-tight">{renderInline(text, key)}</h2>
    );
  }
  if (lines.every((l) => /^[-•]\s/.test(l))) {
    return (
      <ul key={key} className="list-disc space-y-1.5 pl-6">
        {lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^[-•]\s+/, ""), `${key}-${j}`)}</li>)}
      </ul>
    );
  }
  if (lines.every((l) => /^\d+[.)]\s/.test(l))) {
    return (
      <ol key={key} className="list-decimal space-y-1.5 pl-6">
        {lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^\d+[.)]\s+/, ""), `${key}-${j}`)}</li>)}
      </ol>
    );
  }
  if (lines.every((l) => l.startsWith(">"))) {
    return (
      <blockquote key={key} className="border-l-4 border-pine/50 pl-4 italic text-ink-soft">
        {renderInline(lines.map((l) => l.replace(/^>\s?/, "")).join("\n"), key)}
      </blockquote>
    );
  }
  return <p key={key} className="whitespace-pre-line">{renderInline(block, key)}</p>;
}

export function NewsBody({ body, font, className = "" }: { body: string; font?: string | null; className?: string }) {
  const fontClass = isNewsFont(font) ? NEWS_FONTS[font].className : "";
  return <div className={`space-y-5 ${fontClass} ${className}`}>{newsParagraphs(body).map(renderBlock)}</div>;
}

/** The text without formatting marks, e.g. for reading time or previews. */
export function stripNewsMarks(body: string): string {
  return body
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__|==)(.+?)\1/g, "$2")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^(#{2,3}|>|[-•]|\d+[.)])\s+/gm, "");
}
