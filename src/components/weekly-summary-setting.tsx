"use client";

import { useState, useTransition } from "react";
import { sendTestWeeklySummaryAction, setWeeklySummaryAction } from "@/server/actions/weekly-summary";

/** Company settings card for the Monday summary email. */
export function WeeklySummarySetting({ initial, email }: { initial: boolean; email: string }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [sending, startSending] = useTransition();
  const [testMessage, setTestMessage] = useState<string | null>(null);

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-[20px]">Weekly summary</h2>
      <label className="mt-3 flex items-start gap-3 text-[15px]" htmlFor="weekly-summary">
        <input
          id="weekly-summary"
          type="checkbox"
          className="mt-1 h-4 w-4 accent-pine"
          checked={on}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.checked;
            setOn(next);
            start(async () => {
              await setWeeklySummaryAction(next);
            });
          }}
        />
        <span>
          Email a summary every Monday
          <span className="mt-0.5 block text-[13px] text-ink-faint">
            Views, enquiries, referrals and move-ins from the past week, plus one tip to improve an advert. Sent to {email} while you have
            live adverts.
          </span>
        </span>
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-secondary py-1.5 text-[13px]"
          disabled={sending}
          onClick={() =>
            startSending(async () => {
              const result = await sendTestWeeklySummaryAction();
              setTestMessage(result.message);
            })
          }
        >
          {sending ? "Sending…" : "Send me a test"}
        </button>
        {testMessage && (
          <span className="text-[13px] text-ink-soft" role="status">
            {testMessage}
          </span>
        )}
      </div>
    </section>
  );
}
