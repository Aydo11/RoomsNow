/** Small server-rendered SVG charts for the admin Overview. Colours come from theme tokens. */

type Series = { label: string; points: number[]; stroke: string; dot: string; swatch: string; fill?: string };

const W = 720;
const H = 220;
const PAD = { l: 34, r: 12, t: 12, b: 26 };

const shortDay = (day: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

/** Daily lines for the last N days, with a light grid and labelled ends. */
export function LineChart({ days, series, title }: { days: string[]; series: Series[]; title: string }) {
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const top = max <= 4 ? max : Math.ceil(max / 4) * 4;
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(1, days.length - 1);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const ticks = top <= 4 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, top / 4, top / 2, (3 * top) / 4, top];
  const labelAt = [0, Math.floor((days.length - 1) / 2), days.length - 1];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-ink-faint text-[11px]">{t}</text>
          </g>
        ))}
        {labelAt.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} className="fill-ink-faint text-[11px]">{shortDay(days[i])}</text>
        ))}
        {series.map((s) => {
          const d = s.points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
          const last = s.points.length - 1;
          return (
            <g key={s.label}>
              {s.fill && <path d={`${d}L${x(last)},${y(0)}L${x(0)},${y(0)}Z`} className={s.fill} />}
              <path d={d} fill="none" className={s.stroke} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(last)} cy={y(s.points[last])} r="4" className={s.dot} />
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-[13px] text-ink-soft">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${s.swatch}`} />{s.label}</span>
        ))}
      </figcaption>
    </figure>
  );
}
