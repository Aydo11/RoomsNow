const visuals = {
  home: { label: "Illustration of a home", accent: "#1769aa", detail: "#dceefa" },
  checklist: { label: "Illustration of a room viewing checklist", accent: "#16806d", detail: "#dff3ed" },
  building: { label: "Illustration of a shared home", accent: "#4d6e9c", detail: "#e6eef8" },
  support: { label: "Illustration of housing and support", accent: "#16806d", detail: "#e0f3ed" },
  legal: { label: "Illustration of a housing guide document", accent: "#536b9a", detail: "#e7ecf6" },
  costs: { label: "Illustration of comparing housing costs", accent: "#1769aa", detail: "#e0eefb" },
} as const;

export function GuideVisual({ kind, compact = false, className }: { kind: keyof typeof visuals; compact?: boolean; className?: string }) {
  const visual = visuals[kind];

  return (
    <svg
      viewBox="0 0 640 280"
      role="img"
      aria-label={visual.label}
      className={className ?? `block w-full ${compact ? "h-[132px]" : "h-full min-h-[190px]"}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="640" height="280" rx="24" fill={visual.detail} />
      <circle cx="530" cy="55" r="24" fill="#fff" opacity=".78" />
      <circle cx="530" cy="55" r="10" fill={visual.accent} opacity=".75" />
      <path d="M0 226c86-24 142 14 232-4s142-28 215-7 128 22 193 4v61H0z" fill="#fff" opacity=".64" />
      <path d="M135 132 260 48l125 84v103H135z" fill="#fff" />
      <path d="m119 136 141-96 141 96-15 20-126-85-126 85z" fill={visual.accent} />
      <rect x="165" y="143" width="64" height="62" rx="7" fill={visual.detail} stroke={visual.accent} strokeWidth="5" />
      <path d="M197 144v61m-31-30h62" stroke={visual.accent} strokeWidth="4" opacity=".7" />
      <rect x="278" y="137" width="67" height="98" rx="8" fill={visual.accent} />
      <circle cx="329" cy="188" r="4" fill="#fff" />
      <path d="M422 176h94M422 199h70M422 222h82" stroke={visual.accent} strokeWidth="9" strokeLinecap="round" opacity=".4" />
      {kind === "checklist" || kind === "legal" ? (
        <g transform="translate(414 61)">
          <rect x="0" y="0" width="98" height="90" rx="14" fill="#fff" />
          <path d="m20 32 8 8 15-17m-23 39 8 8 15-17m11-21h25m-25 38h25" fill="none" stroke={visual.accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : kind === "costs" ? (
        <g transform="translate(440 58)">
          <circle cx="38" cy="38" r="38" fill="#fff" />
          <path d="M45 20c-3-4-16-5-20 2-6 10 3 14 14 17s16 10 10 19c-4 7-17 8-25 2m13-48v59" fill="none" stroke={visual.accent} strokeWidth="6" strokeLinecap="round" />
        </g>
      ) : kind === "support" ? (
        <g transform="translate(436 60)">
          <circle cx="38" cy="38" r="38" fill="#fff" />
          <path d="M38 57V25m-14 14h28M38 26l-9-9m9 9 9-9" fill="none" stroke={visual.accent} strokeWidth="7" strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
}
