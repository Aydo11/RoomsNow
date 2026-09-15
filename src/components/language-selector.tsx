"use client";

import { useEffect, useState } from "react";

type LanguageCode = "en" | "ar" | "ti";

/**
 * Offers whole-page automatic translation without changing the canonical URL
 * or pretending machine-translated housing information has been human checked.
 */
export function LanguageSelector({ mobile = false }: { mobile?: boolean }) {
  const [language, setLanguage] = useState<LanguageCode>("en");

  useEffect(() => {
    const translatedLanguage = new URLSearchParams(window.location.search).get("_x_tr_tl");
    if (translatedLanguage === "ar" || translatedLanguage === "ti") {
      setLanguage(translatedLanguage);
      document.documentElement.classList.add("machine-translated");
    }
  }, []);

  function originalPageUrl() {
    const current = new URL(window.location.href);
    const original = current.hostname.endsWith(".translate.goog")
      ? new URL(`${window.location.protocol}//www.roomsnow.co.uk${current.pathname}`)
      : new URL(current.toString());

    current.searchParams.forEach((value, key) => {
      if (!key.startsWith("_x_tr_")) original.searchParams.set(key, value);
    });
    original.hash = current.hash;
    return original;
  }

  function changeLanguage(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLanguage = event.target.value as LanguageCode;
    const original = originalPageUrl();

    if (nextLanguage === "en") {
      window.location.assign(original.toString());
      return;
    }

    const translateUrl = new URL("https://translate.google.com/translate");
    translateUrl.searchParams.set("sl", "en");
    translateUrl.searchParams.set("tl", nextLanguage);
    translateUrl.searchParams.set("u", original.toString());
    window.location.assign(translateUrl.toString());
  }

  return (
    <div className={mobile ? "px-3 py-2" : "block"}>
      <label className={mobile ? "mb-1 block text-[12px] font-medium text-ink-faint" : "sr-only"} htmlFor={mobile ? "mobile-language" : "desktop-language"}>
        Language
      </label>
      <select
        id={mobile ? "mobile-language" : "desktop-language"}
        value={language}
        onChange={changeLanguage}
        className={mobile ? "field py-2" : "w-full rounded-[9px] border border-line bg-white px-2.5 py-2 text-[13px] text-ink-soft"}
        aria-label="Translate this page"
      >
        <option value="en">English</option>
        <option value="ar">العربية — Arabic</option>
        <option value="ti">ትግርኛ — Tigrinya</option>
      </select>
      <p className="mt-1 text-[11px] leading-snug text-ink-faint">Arabic and Tigrinya are automatic translations. Check important housing details with the provider.</p>
    </div>
  );
}
