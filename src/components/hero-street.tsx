/**
 * The homepage street: a row of terraced houses along the bottom of the hero.
 * The RoomsNow magnifying glass glides along it and the rooms it passes light
 * up, which is what the site does. Pure SVG + CSS (transform/opacity only, no
 * filters or blur) so it stays cheap on phones, and it sits still for anyone
 * who prefers reduced motion. Decorative, so hidden from screen readers.
 */

const W = 1600;
const H = 220;
const GROUND = 206;
/** One full cycle of the scan, in seconds. Keep in sync with globals.css. */
const CYCLE = 14;
/** How long the glass takes to cross the street. */
const SWEEP = 10;

type House = { x: number; w: number; h: number; roof: "gable" | "flat" | "hip"; floors: number; cols: number; chimney?: boolean };

// Hand-placed so the skyline reads like a real terrace: varied widths,
// heights and roof shapes, nothing in a regular rhythm.
const HOUSES: House[] = [
  { x: 0, w: 120, h: 138, roof: "gable", floors: 2, cols: 2, chimney: true },
  { x: 124, w: 150, h: 164, roof: "hip", floors: 3, cols: 3 },
  { x: 278, w: 108, h: 130, roof: "gable", floors: 2, cols: 2 },
  { x: 390, w: 168, h: 176, roof: "flat", floors: 3, cols: 4 },
  { x: 562, w: 124, h: 144, roof: "gable", floors: 2, cols: 2, chimney: true },
  { x: 690, w: 140, h: 158, roof: "gable", floors: 3, cols: 3 },
  { x: 834, w: 112, h: 126, roof: "hip", floors: 2, cols: 2 },
  { x: 950, w: 176, h: 182, roof: "flat", floors: 3, cols: 4 },
  { x: 1130, w: 126, h: 142, roof: "gable", floors: 2, cols: 2, chimney: true },
  { x: 1260, w: 146, h: 162, roof: "hip", floors: 3, cols: 3 },
  { x: 1410, w: 104, h: 128, roof: "gable", floors: 2, cols: 2 },
  { x: 1518, w: 82, h: 146, roof: "gable", floors: 2, cols: 1, chimney: true },
];

// A cheap deterministic "random" so server and client render the same street.
const pick = (n: number) => ((n * 9301 + 49297) % 233280) / 233280;

type Win = { x: number; y: number; w: number; h: number; mode: "scan" | "home" | "off"; delay: number };

function windowsFor(house: House, index: number): Win[] {
  const wins: Win[] = [];
  const top = GROUND - house.h + 22;
  const usable = house.h - 22 - 48; // leave room for the door storey
  // Never squash windows: drop a storey rather than shrink them.
  const floors = Math.max(1, Math.min(house.floors, Math.floor(usable / 34)));
  const rowH = usable / floors;
  const colW = (house.w - 24) / house.cols;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < house.cols; c++) {
      const w = Math.min(22, colW - 12);
      const h = Math.min(26, rowH - 10);
      const x = house.x + 12 + c * colW + (colW - w) / 2;
      const y = top + f * rowH + (rowH - h) / 2;
      const r = pick(index * 31 + f * 7 + c * 3 + 1);
      const mode: Win["mode"] = r < 0.5 ? "scan" : r < 0.72 ? "home" : "off";
      // Light up just after the glass passes this window.
      const delay = Math.max(0, ((x + 40) / (W + 120)) * SWEEP + 0.15);
      wins.push({ x, y, w, h, mode, delay });
    }
  }
  return wins;
}

function roofPath(h: House) {
  const top = GROUND - h.h;
  if (h.roof === "flat") return `M${h.x - 3} ${top + 4} H${h.x + h.w + 3} V${top + 12} H${h.x - 3} Z`;
  if (h.roof === "hip") return `M${h.x - 4} ${top + 14} L${h.x + 18} ${top - 14} H${h.x + h.w - 18} L${h.x + h.w + 4} ${top + 14} Z`;
  return `M${h.x - 4} ${top + 14} L${h.x + h.w / 2} ${top - 22} L${h.x + h.w + 4} ${top + 14} Z`;
}

export type StreetPill = { at: number; label: string; tone: "amber" | "blue" | "green" };

const DEFAULT_PILLS: StreetPill[] = [
  { at: 0.24, label: "Room free · Erdington", tone: "amber" },
  { at: 0.52, label: "Bills included", tone: "blue" },
  { at: 0.79, label: "Verified provider", tone: "green" },
];

/** `pills` are the little cards that pop up as the glass reaches them (0–1 along the street). */
export function HeroStreet({ pills = DEFAULT_PILLS, className }: { pills?: StreetPill[]; className?: string }) {
  const houses = HOUSES.map((house, index) => ({ house, wins: windowsFor(house, index) }));

  return (
    <div className={className ? `hero-street ${className}` : "hero-street"} aria-hidden="true" style={{ ["--street-cycle" as string]: `${CYCLE}s` }}>
      {pills.map((pill) => (
        <span
          key={pill.label}
          className={`street-pill street-pill-${pill.tone}`}
          style={{ left: `${pill.at * 100}%`, animationDelay: `${pill.at * SWEEP}s` }}
        >
          <span className="street-pill-dot" />
          {pill.label}
        </span>
      ))}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="hero-street-svg" focusable="false">
        {houses.map(({ house, wins }, index) => {
          const doorW = 22;
          const doorX = house.x + (index % 2 ? house.w - doorW - 16 : 16);
          return (
            <g key={index}>
              {house.chimney && <rect className="street-roof" x={house.x + house.w * 0.68} y={GROUND - house.h - 26} width="14" height="30" rx="2" />}
              <path className="street-roof" d={roofPath(house)} />
              <rect className="street-house" x={house.x} y={GROUND - house.h + 12} width={house.w} height={house.h - 12} rx="3" />
              {wins.map((win, i) => (
                <g key={i}>
                  <rect className="street-win" x={win.x} y={win.y} width={win.w} height={win.h} rx="3" />
                  {win.mode !== "off" && (
                    <rect
                      className={win.mode === "scan" ? "street-lit street-lit-scan" : "street-lit street-lit-home"}
                      x={win.x}
                      y={win.y}
                      width={win.w}
                      height={win.h}
                      rx="3"
                      style={win.mode === "scan" ? { animationDelay: `${win.delay.toFixed(2)}s` } : undefined}
                    />
                  )}
                </g>
              ))}
              <rect className="street-door" x={doorX} y={GROUND - 38} width={doorW} height="38" rx="3" />
              <circle className="street-knob" cx={doorX + doorW - 6} cy={GROUND - 18} r="1.8" />
            </g>
          );
        })}
        <rect className="street-ground" x="0" y={GROUND} width={W} height={H - GROUND} />
        <g className="street-glass">
          <circle cx="0" cy="128" r="30" className="street-glass-lens" />
          <circle cx="0" cy="128" r="30" className="street-glass-ring" />
          <path d="M21 149 L42 170" className="street-glass-handle" />
        </g>
      </svg>
    </div>
  );
}
