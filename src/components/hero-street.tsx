/**
 * The homepage "live map": a faint street grid along the bottom of the hero.
 * Map pins drop onto it one after another with a ripple and a little
 * "Room free · Erdington" tag, while light pulses run along the roads.
 * It reads as "rooms are coming up near you, right now".
 *
 * Pure SVG + CSS (transform/opacity only, no filters) so it stays cheap on
 * phones. Everything sits still, with every pin showing, for anyone who
 * prefers reduced motion. Decorative, so hidden from screen readers.
 * (File keeps its old name so the three pages that use it don't change.)
 */

const W = 1600;
const H = 290;
/** Seconds between one pin dropping and the next. */
const STEP = 2.4;

// Roads: [x1, y1, x2, y2, major?]. An irregular grid so it reads like a real map.
const ROADS: [number, number, number, number, boolean?][] = [
  [0, 78, 1600, 78],
  [0, 160, 1600, 160, true],
  [0, 238, 1600, 238],
  [140, 0, 140, 290],
  [330, 0, 330, 290, true],
  [520, 0, 520, 290],
  [700, 0, 700, 290],
  [880, 0, 880, 290, true],
  [1060, 0, 1060, 290],
  [1250, 0, 1250, 290, true],
  [1440, 0, 1440, 290],
];
// Two diagonal roads and a canal break up the grid.
const DIAGONALS = ["M0 290 L420 0", "M1180 290 L1600 40"];
const CANAL = "M0 205 C220 190 300 120 520 128 S820 220 1020 198 S1360 110 1600 122";
// Small parks / blocks, [x, y, w, h].
const PARKS: [number, number, number, number][] = [
  [350, 92, 150, 52],
  [900, 176, 140, 46],
  [1270, 176, 150, 46],
  [160, 94, 150, 50],
];

/** Pins in the order they drop. Spread out so the eye travels across the map. */
const PINS: { x: number; y: number; label: string }[] = [
  { x: 700, y: 160, label: "Room free · Erdington" },
  { x: 1250, y: 78, label: "£115/wk · Aston" },
  { x: 330, y: 238, label: "Bills incl. · Handsworth" },
  { x: 1060, y: 238, label: "Room free · Selly Oak" },
  { x: 520, y: 78, label: "Verified · Moseley" },
  { x: 1440, y: 160, label: "Room free · Digbeth" },
  { x: 880, y: 78, label: "En-suite · Edgbaston" },
  { x: 140, y: 160, label: "Room free · Perry Barr" },
];
const CYCLE = PINS.length * STEP;

/** Light pulses: which road they run along, how long a run takes, and a start offset. */
const PULSES: { road: number; dur: number; delay: number; reverse?: boolean }[] = [
  { road: 1, dur: 9, delay: 0 },
  { road: 0, dur: 12, delay: 3, reverse: true },
  { road: 2, dur: 10, delay: 6 },
  { road: 4, dur: 5, delay: 1.5 },
  { road: 7, dur: 4.5, delay: 4, reverse: true },
  { road: 9, dur: 5.5, delay: 7 },
];

export type StreetPill = { at: number; label: string; tone: "amber" | "blue" | "green" };

const DEFAULT_PILLS: StreetPill[] = [
  { at: 0.24, label: "Room free · Erdington", tone: "amber" },
  { at: 0.52, label: "Bills included", tone: "blue" },
  { at: 0.79, label: "Verified provider", tone: "green" },
];

/** `pills` are the little cards that pop up in turn above the map (0–1 sets where along it, and when). */
export function HeroStreet({ pills = DEFAULT_PILLS, className }: { pills?: StreetPill[]; className?: string }) {
  return (
    <div className={className ? `hero-street ${className}` : "hero-street"} aria-hidden="true" style={{ ["--street-cycle" as string]: `${CYCLE}s` }}>
      {pills.map((pill) => (
        <span key={pill.label} className={`street-pill street-pill-${pill.tone}`} style={{ left: `${pill.at * 100}%`, animationDelay: `${pill.at * 10}s` }}>
          <span className="street-pill-dot" />
          {pill.label}
        </span>
      ))}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="hero-street-svg" focusable="false">
        <defs>
          {/* The map fades out towards the top so it melts into the hero. */}
          <linearGradient id="map-fade-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id="map-fade">
            <rect width={W} height={H} fill="url(#map-fade-grad)" />
          </mask>
          <radialGradient id="map-glow-grad">
            <stop offset="0" stopColor="#f5b544" stopOpacity="0.5" />
            <stop offset="1" stopColor="#f5b544" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="map-trail-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f5b544" stopOpacity="0" />
            <stop offset="1" stopColor="#f5b544" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <g mask="url(#map-fade)">
          {PARKS.map(([x, y, w, h], i) => (
            <rect key={i} className="map-park" x={x} y={y} width={w} height={h} rx="8" />
          ))}
          <path className="map-canal" d={CANAL} />
          {DIAGONALS.map((d) => (
            <path key={d} className="map-road" d={d} />
          ))}
          {ROADS.map(([x1, y1, x2, y2, major], i) => (
            <line key={i} className={major ? "map-road map-road-major" : "map-road"} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}

          {PULSES.map((p, i) => {
            const [x1, y1, x2, y2] = ROADS[p.road];
            const across = y1 === y2;
            const len = across ? x2 - x1 : y2 - y1;
            // Trail is drawn pointing along +x, then rotated to the road's direction.
            const angle = (across ? 0 : 90) + (p.reverse ? 180 : 0);
            const start = p.reverse ? [x2, y2] : [x1, y1];
            return (
              <g key={i} transform={`translate(${start[0]} ${start[1]}) rotate(${angle})`}>
                <g className="map-pulse" style={{ ["--run" as string]: `${len}px`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}>
                  <rect x="-60" y="-1.5" width="60" height="3" rx="1.5" fill="url(#map-trail-grad)" />
                  <circle r="3.5" className="map-pulse-head" />
                </g>
              </g>
            );
          })}
        </g>

        {PINS.map((pin, i) => {
          const delay = `${(i * STEP).toFixed(2)}s`;
          const tagW = pin.label.length * 7.4 + 30;
          return (
            <g key={pin.label} transform={`translate(${pin.x} ${pin.y})`}>
              <circle className="map-ripple" r="14" style={{ animationDelay: delay }} />
              <g className="map-pin" style={{ animationDelay: delay }}>
                <circle className="map-pin-glow" cy="-20" r="34" fill="url(#map-glow-grad)" />
<g transform="scale(1.35)">
                <ellipse className="map-pin-shadow" rx="7" ry="2.5" />
                <path className="map-pin-body" d="M0 0 C-3 -7 -12 -13 -12 -22 A12 12 0 0 1 12 -22 C12 -13 3 -7 0 0 Z" />
                <circle className="map-pin-eye" cy="-22" r="4.5" />
                </g>
              </g>
              <g className="map-tag" style={{ animationDelay: delay }}>
                <rect x={-tagW / 2} y="-78" width={tagW} height="24" rx="12" className="map-tag-bg" />
                <circle cx={-tagW / 2 + 15} cy="-66" r="3.5" className="map-tag-dot" />
                <text x={-tagW / 2 + 25} y="-61.5" className="map-tag-text">
                  {pin.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
