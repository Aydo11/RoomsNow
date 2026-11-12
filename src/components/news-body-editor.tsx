"use client";

import { useRef, useState } from "react";
import { NewsBody, NEWS_FONTS, type NewsFont } from "@/lib/news-format";

type Action = { label: string; title: string; wrap?: [string, string]; line?: string; numbered?: boolean; link?: boolean; className?: string };

const ACTIONS: Action[] = [
  { label: "B", title: "Bold", wrap: ["**", "**"], className: "font-bold" },
  { label: "I", title: "Italic", wrap: ["*", "*"], className: "italic" },
  { label: "U", title: "Underline", wrap: ["__", "__"], className: "underline" },
  { label: "Highlight", title: "Highlight", wrap: ["==", "=="] },
  { label: "Heading", title: "Heading", line: "## " },
  { label: "Subheading", title: "Smaller heading", line: "### " },
  { label: "• List", title: "Bullet list", line: "- " },
  { label: "1. List", title: "Numbered list", numbered: true },
  { label: "Quote", title: "Quote", line: "> " },
  { label: "Link", title: "Link", link: true },
];

/** The post body: a plain textarea with a formatting toolbar, a font choice and a live preview. */
export function NewsBodyEditor({ defaultValue, defaultFont, error }: { defaultValue?: string; defaultFont?: string | null; error?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [text, setText] = useState(defaultValue ?? "");
  const [font, setFont] = useState<NewsFont>((defaultFont as NewsFont) || "SANS");

  function apply(action: Action) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    let insert: string;
    let caret: [number, number];
    if (action.wrap) {
      const inner = selected || action.title.toLowerCase();
      insert = `${action.wrap[0]}${inner}${action.wrap[1]}`;
      caret = [start + action.wrap[0].length, start + action.wrap[0].length + inner.length];
    } else if (action.link) {
      const url = window.prompt("Link address (https://…, /page or mailto:…)", "https://");
      if (!url) return;
      const inner = selected || "link text";
      insert = `[${inner}](${url.trim()})`;
      caret = [start + 1, start + 1 + inner.length];
    } else {
      // Line formats apply to every selected line, starting on a fresh line.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end) || action.title;
      const lines = block.split("\n").map((l, i) => (action.numbered ? `${i + 1}. ` : action.line) + l.replace(/^(#{2,3}|>|[-•]|\d+[.)])\s+/, ""));
      insert = lines.join("\n");
      const next = value.slice(0, lineStart) + insert + value.slice(end);
      setValue(el, next);
      el.focus();
      el.setSelectionRange(lineStart, lineStart + insert.length);
      return;
    }
    setValue(el, value.slice(0, start) + insert + value.slice(end));
    el.focus();
    el.setSelectionRange(caret[0], caret[1]);
  }

  function setValue(el: HTMLTextAreaElement, next: string) {
    el.value = next;
    setText(next);
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label htmlFor="news-body" className="label">Full post</label>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          Font
          <select name="bodyFont" value={font} onChange={(e) => setFont(e.target.value as NewsFont)} className="field h-9 w-auto py-1 text-[13px]">
            {(Object.keys(NEWS_FONTS) as NewsFont[]).map((k) => <option key={k} value={k}>{NEWS_FONTS[k].label}</option>)}
          </select>
        </label>
      </div>
      <div role="toolbar" aria-label="Formatting" className="mt-1 flex flex-wrap gap-1 rounded-t-card border border-b-0 border-line bg-paper-sunk/60 p-1.5">
        {ACTIONS.map((a) => (
          <button key={a.title} type="button" title={a.title} aria-label={a.title} onClick={() => apply(a)} disabled={preview} className={`rounded-[6px] px-2.5 py-1 text-[13px] hover:bg-white disabled:opacity-40 ${a.className ?? ""}`}>
            {a.label}
          </button>
        ))}
        <button type="button" onClick={() => setPreview((p) => !p)} aria-pressed={preview} className="ml-auto rounded-[6px] px-2.5 py-1 text-[13px] font-semibold text-pine-dark hover:bg-white">
          {preview ? "Back to editing" : "Preview"}
        </button>
      </div>
      <textarea
        ref={ref}
        id="news-body"
        name="body"
        required
        rows={14}
        hidden={preview}
        className="field rounded-t-none"
        defaultValue={defaultValue}
        onChange={(e) => setText(e.target.value)}
        placeholder="Leave a blank line between paragraphs. Select text and use the buttons above to format it."
        aria-describedby="news-body-help"
      />
      {preview && (
        <div className="min-h-[200px] rounded-b-card border border-line bg-white p-4 text-[16px] leading-relaxed">
          {text.trim() ? <NewsBody body={text} font={font} /> : <p className="text-ink-faint">Nothing to preview yet.</p>}
        </div>
      )}
      <p id="news-body-help" className="mt-1 text-[12.5px] text-ink-faint">
        Formatting: **bold**, *italic*, __underline__, ==highlight==, ## heading, - bullet, 1. numbered, &gt; quote, [text](link). Pasting from Word or Google Docs brings plain text across, so use the buttons to add formatting.
      </p>
      {error && <p className="mt-1 text-[12.5px] text-clay">{error}</p>}
    </div>
  );
}
