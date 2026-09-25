"use client";

import { useEffect, useState } from "react";
import { playSuccessChime, setSoundsEnabled, soundsEnabled } from "@/lib/chime";

/** Settings card for the good-news chime. The choice is saved in this browser. */
export function SoundSetting() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(soundsEnabled());
  }, []);

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-[20px]">Sounds</h2>
      <label className="mt-3 flex items-start gap-3 text-[15px]" htmlFor="good-news-sound">
        <input
          id="good-news-sound"
          type="checkbox"
          className="mt-1 h-4 w-4 accent-pine"
          checked={on}
          onChange={(event) => {
            const next = event.target.checked;
            setOn(next);
            setSoundsEnabled(next);
            if (next) playSuccessChime();
          }}
        />
        <span>
          Play a chime for good news
          <span className="mt-0.5 block text-[13px] text-ink-faint">
            When you submit an advert, something is approved, or you reach a milestone like your first referral. Saved on this device.
          </span>
        </span>
      </label>
    </section>
  );
}
