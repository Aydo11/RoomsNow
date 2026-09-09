"use client";
import { useState } from "react";

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

export type SocialLink = { platform: string; url: string };

/**
 * A repeatable list of platform + URL rows. Each row's <select> and <input>
 * share the plain field names "socialPlatform" / "socialUrl", so the values
 * arrive in FormData in row order on submit — no hidden JSON field or custom
 * submit handler needed, the surrounding <form action={...}> keeps working
 * unchanged.
 */
export function SocialLinksField({ initial, error }: { initial: SocialLink[]; error?: string }) {
  const [rows, setRows] = useState<SocialLink[]>(initial.length ? initial : [{ platform: "instagram", url: "" }]);

  function update(index: number, patch: Partial<SocialLink>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function remove(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  function add() {
    setRows((current) => [...current, { platform: "instagram", url: "" }]);
  }

  return (
    <div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex gap-2">
            <select
              name="socialPlatform"
              value={row.platform}
              onChange={(event) => update(index, { platform: event.target.value })}
              className="field w-[9.5rem] shrink-0"
              aria-label="Platform"
            >
              {PLATFORMS.map((platform) => (
                <option key={platform.value} value={platform.value}>{platform.label}</option>
              ))}
            </select>
            <input
              name="socialUrl"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={row.url}
              onChange={(event) => update(index, { url: event.target.value })}
              className="field flex-1"
              aria-label="Link"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="shrink-0 rounded-[8px] px-2 text-[13px] text-ink-faint hover:bg-paper-sunk hover:text-clay"
              aria-label="Remove this link"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {rows.length === 0 && <p className="text-[13px] text-ink-faint">No links added.</p>}
      {error && <p className="mt-1 text-[13px] text-clay" role="alert">{error}</p>}
      <button type="button" onClick={add} className="btn-secondary mt-2 text-[13px]">Add a link</button>
    </div>
  );
}
