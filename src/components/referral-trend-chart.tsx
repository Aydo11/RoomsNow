"use client";

import { useState } from "react";

export type TrendPoint = { label: string; long: string; made: number; placed: number };

/**
 * Referrals made and people placed per period as paired bars — one axis, one
 * validated pair (brand blue = made, aqua = placed). Hovering or focusing a period
 * shows its exact numbers; the same data is available as a table.
 */
export function ReferralTrendChart({ points }: { points: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 640;
  const height = 220;
  const pad = { top: 12, right: 8, bottom: 28, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((p) => Math.max(p.made, p.placed)));
  const step = max <= 4 ? 1 : Math.ceil(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const slot = innerW / points.length;
  const barW = Math.max(8, Math.min(30, slot - 6));
  const y = (value: number) => pad.top + innerH - (value / top) * innerH;
  const shown = active ?? points.length - 1;
  const current = points[shown];

  return (
    <figure className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-pine" aria-hidden="true" /> Referrals made
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[#1BAF7A]" aria-hidden="true" /> People placed
        </span>
        {current && (
          <span className="ml-auto tabular-nums text-ink" aria-live="polite">
            {current.long}: <strong>{current.made}</strong> made · <strong>{current.placed}</strong> placed
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Referrals made and people placed over time">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#D9E2EC" strokeWidth={1} strokeDasharray={tick === 0 ? undefined : "3 4"} />
            <text x={pad.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill="#758196">
              {tick}
            </text>
          </g>
        ))}
        {points.map((point, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const half = (barW - 2) / 2;
          const madeX = cx - half - 1;
          const placedX = cx + 1;
          const madeH = (point.made / top) * innerH;
          const placedH = (point.placed / top) * innerH;
          const isActive = shown === i;
          return (
            <g
              key={point.long}
              tabIndex={0}
              role="button"
              aria-label={`${point.long}: ${point.made} referrals made, ${point.placed} placed`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="cursor-default outline-none"
            >
              <rect x={pad.left + slot * i} y={pad.top} width={slot} height={innerH} fill={isActive ? "#EDF2F7" : "transparent"} />
              {madeH > 0 && <path d={roundedTop(madeX, y(point.made), half, madeH, 3)} fill="#1666AA" />}
              {placedH > 0 && <path d={roundedTop(placedX, y(point.placed), half, placedH, 3)} fill="#1BAF7A" />}
              {(i % Math.ceil(points.length / 6) === 0 || i === points.length - 1) && (
                <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill="#758196">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-[13px]">
        <summary className="cursor-pointer text-pine-dark">Show as a table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-ink-faint">
            <tr>
              <th className="py-1 font-medium">Period</th>
              <th className="py-1 text-right font-medium">Made</th>
              <th className="py-1 text-right font-medium">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {points.map((point) => (
              <tr key={point.long}>
                <td className="py-1">{point.long}</td>
                <td className="py-1 text-right">{point.made}</td>
                <td className="py-1 text-right">{point.placed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** A bar anchored to the baseline with only its top corners rounded. */
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}
