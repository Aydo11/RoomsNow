"use client";

type LanguageCode = "en" | "ar" | "ti";

/**
 * Offers whole-page automatic translation without changing the canonical URL
 * or pretending machine-translated housing information has been human checked.
 */
export function LanguageSelector({ mobile = false }: { mobile?: boolean }) {
  function changeLanguage(event: React.ChangeEvent<HTMLSelectElement>) {
    const language = event.target.value as LanguageCode;
    if (language === "en") return;

    const translateUrl = new URL("https://translate.google.com/translate");
    translateUrl.searchParams.set("sl", "en");
    translateUrl.searchParams.set("tl", language);
    translateUrl.searchParams.set("u", window.location.href);
    window.location.assign(translateUrl.toString());
  }

  return (
    <div className={mobile ? "px-3 py-2" : "block"}>
      <label className={mobile ? "mb-1 block text-[12px] font-medium text-ink-faint" : "sr-only"} htmlFor={mobile ? "mobile-language" : "desktop-language"}>
        Language
      </label>
      <select
        id={mobile ? "mobile-language" : "desktop-language"}
        defaultValue="en"
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
