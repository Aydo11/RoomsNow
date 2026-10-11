# October 2026 dependency remediation

The deployment audit flagged the unpatched `braces` dependency used by
Tailwind 3, plus vulnerable Sharp, source-map-js and selector-parser releases.
Tailwind 4.3.3 removes the old glob/watcher dependency chain. The official
Tailwind upgrade tool migrated utilities and the PostCSS integration. Compatible
lockfile updates install Next 16.3.8, Sharp 0.35.5 and source-map-js 1.2.2.

Brand channel values use `--rn-*` tokens, separate from Tailwind's complete
`--color-*` values. Inline theme mappings preserve alpha modifiers and the
existing light/dark palette without circular CSS variable references. Font tokens
are similarly separated. Form and component surfaces use `paper-card` so dark
mode retains readable foreground/background contrast.

Validation: npm audit reports zero vulnerabilities; all 124 unit tests pass;
the normal Turbopack production build and TypeScript pass. Browser checks cover
sign-in and registration styling, fonts, colour contrast and horizontal overflow
at a 390px mobile viewport and desktop size. CI repeats the production build.

Tailwind 4 requires Safari 16.4+, Chrome 111+ or Firefox 128+. Revisit this choice
if support for older browsers becomes a product requirement.
