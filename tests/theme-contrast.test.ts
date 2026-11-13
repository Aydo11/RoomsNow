import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const themes = {
  light: css.match(/:root\s*\{([^}]*--rn-ink:[^}]+)\}/)?.[1] ?? "",
  dark: css.match(/html\[data-theme="dark"\]\s*\{([^}]*--rn-ink:[^}]+)\}/)?.[1] ?? "",
};

function luminance(rgb: number[]) {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number[], b: number[]) {
  const levels = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (levels[0] + 0.05) / (levels[1] + 0.05);
}

for (const [theme, definitions] of Object.entries(themes)) {
  test(`${theme} theme shared text and status colours meet 4.5:1 contrast`, () => {
    const colour = (token: string) => {
      const match = definitions.match(new RegExp(`--rn-${token}: (\\d+) (\\d+) (\\d+);`));
      assert.ok(match, `missing ${token}`);
      return match.slice(1).map(Number);
    };
    const pairs = [
      ...["paper", "paper-card", "paper-sunk"].flatMap((surface) =>
        ["ink", "ink-soft", "ink-faint", "pine-dark"].map((foreground) => [foreground, surface])),
      ["pine-dark", "pine-light"],
      ["positive", "positive-surface"],
      ["caution", "caution-surface"],
      ["clay", "clay-light"],
    ];
    for (const [foreground, background] of pairs) {
      const ratio = contrast(colour(foreground), colour(background));
      assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
    }
    assert.ok(contrast([255, 255, 255], colour("pine")) >= 4.5);
  });
}
