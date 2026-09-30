"use client";

import { useEffect, useMemo, useState } from "react";

type Width = "desktop" | "mobile";

/**
 * Live preview of an admin mailshot, rendered by the server from the form's
 * current values. The site can't be framed (anti-clickjacking headers), so
 * the HTML is shown in a sandboxed srcdoc frame; links open in a new tab.
 */
export function EmailPreview({ values, subject }: { values: Record<string, string>; subject?: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState<Width>("desktop");
  const body = useMemo(() => JSON.stringify(values), [values]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/api/admin/email-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
        .then((text) => {
          setHtml(text.replace("<head>", '<head><base target="_blank">'));
          setFailed(false);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error("Email preview failed", error);
          setFailed(true);
        });
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [body]);

  function openFullSize() {
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Preview</p>
          {subject !== undefined && (
            <p className="truncate text-[12px] text-ink-soft">
              Subject: <span className="text-ink">{subject.trim() || "(no subject yet)"}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[8px] border border-line bg-paper-sunk p-0.5" role="group" aria-label="Preview width">
            {(["desktop", "mobile"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={width === option}
                onClick={() => setWidth(option)}
                className={`rounded-[6px] px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                  width === option ? "bg-white text-ink shadow-raise" : "text-ink-soft hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button type="button" onClick={openFullSize} disabled={!html} className="text-[13px] font-medium text-pine hover:underline disabled:opacity-50">
            Open full size
          </button>
        </div>
      </div>
      <div className="bg-paper-sunk">
        {failed ? (
          <div className="grid h-[640px] place-items-center px-6 text-center text-sm text-ink-soft">
            The preview couldn&apos;t load. Check your connection and try editing the form again.
          </div>
        ) : html === null ? (
          <div className="grid h-[640px] place-items-center text-sm text-ink-soft">Loading preview…</div>
        ) : (
          <iframe
            title="Email preview"
            srcDoc={html}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            className={`mx-auto block h-[720px] bg-white transition-[width] ${width === "mobile" ? "w-[390px] max-w-full" : "w-full"}`}
          />
        )}
      </div>
      <p className="border-t border-line px-4 py-2 text-[12px] text-ink-faint">
        Updates as you type. Names and unsubscribe links are filled in for each person when it sends.
      </p>
    </div>
  );
}
