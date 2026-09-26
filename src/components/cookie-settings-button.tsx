"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="text-left hover:text-pine-dark"
      onClick={() => window.dispatchEvent(new Event("roomsnow:cookie-settings"))}
    >
      Cookie settings
    </button>
  );
}
