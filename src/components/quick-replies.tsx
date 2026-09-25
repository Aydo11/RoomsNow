"use client";

import { useState, useTransition } from "react";
import { deleteQuickReplyAction, saveQuickReplyAction, type QuickReplyItem } from "@/server/actions/quick-replies";

/** Ready-made replies every provider starts with. Their own saved replies appear above these. */
const SUGGESTED = [
  "Thanks for your message. The room is still available. When would suit you for a viewing?",
  "Thanks for getting in touch. Unfortunately this room has now been let, but we may have others coming up. Would you like me to keep your details?",
  "Could you tell me a little more about the support needed, so I can check we're the right fit?",
  "Thanks for the referral. We've received it and will be in touch within two working days.",
  "Could you confirm the move-in date you're hoping for, and whether Housing Benefit will cover the rent?",
];

/**
 * The "Quick replies" button in a provider's message composer. Tapping a reply
 * puts it into the message box (it isn't sent until they press Send), and the
 * current draft can be saved for the whole team to reuse.
 */
export function QuickReplies({
  initial,
  onInsert,
  getDraft,
}: {
  initial: QuickReplyItem[];
  onInsert: (text: string) => void;
  getDraft: () => string;
}) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function use(text: string) {
    onInsert(text);
    setOpen(false);
    setNotice(null);
  }

  function saveDraft() {
    start(async () => {
      const result = await saveQuickReplyAction(getDraft());
      if (result.replies) setReplies(result.replies);
      setNotice(result.message ?? null);
    });
  }

  function remove(id: string) {
    start(async () => {
      const result = await deleteQuickReplyAction(id);
      if (result.replies) setReplies(result.replies);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setNotice(null);
        }}
        aria-expanded={open}
        className={`rounded-pill px-2.5 py-1.5 text-[12px] font-medium hover:bg-brand/5 ${open ? "bg-pine-light text-pine-dark" : "text-brand"}`}
      >
        ↩ Quick replies
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-[min(400px,calc(100vw-40px))] animate-fade-in-up rounded-card border border-line bg-white p-2 shadow-float">
          <div className="max-h-72 overflow-y-auto">
            {replies.length > 0 && (
              <>
                <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Your team&apos;s replies</p>
                <ul>
                  {replies.map((reply) => (
                    <li key={reply.id} className="group flex items-start gap-1">
                      <button
                        type="button"
                        onClick={() => use(reply.body)}
                        className="min-w-0 flex-1 rounded-[9px] px-2 py-2 text-left text-[14px] leading-snug text-ink hover:bg-pine-light/60"
                      >
                        {reply.body}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(reply.id)}
                        className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-paper-sunk hover:text-clay"
                        aria-label="Remove this quick reply"
                        title="Remove"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Suggested</p>
            <ul>
              {SUGGESTED.map((text) => (
                <li key={text}>
                  <button
                    type="button"
                    onClick={() => use(text)}
                    className="w-full rounded-[9px] px-2 py-2 text-left text-[14px] leading-snug text-ink-soft hover:bg-pine-light/60 hover:text-ink"
                  >
                    {text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-line px-2 pt-2">
            <button type="button" disabled={pending} onClick={saveDraft} className="btn-secondary py-1.5 text-[13px]">
              {pending ? "Saving…" : "Save my message as a quick reply"}
            </button>
            {notice && (
              <span className="text-[12px] text-ink-faint" role="status">
                {notice}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
