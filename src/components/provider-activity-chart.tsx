export type ProviderActivityPoint = {
  label: string;
  longLabel: string;
  requests: number;
  referrals: number;
};

const WIDTH = 760;
const HEIGHT = 250;
const PAD = { top: 18, right: 16, bottom: 40, left: 42 };

export function ProviderActivityChart({ points }: { points: ProviderActivityPoint[] }) {
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.requests, point.referrals]));
  const step = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.min(12, step * 0.28);
  const totalActivity = points.reduce((sum, point) => sum + point.requests + point.referrals, 0);
  const ticks = [0, Math.ceil(maxValue / 2), maxValue].filter((value, index, all) => all.indexOf(value) === index);

  return (
    <div>
      {totalActivity === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg bg-paper-sunk/45 px-5 text-center">
          <p className="text-[15px] font-medium text-ink">No new enquiries in the last 12 weeks</p>
          <p className="mt-1 max-w-[48ch] text-[13px] text-ink-soft">When people submit a request or a professional sends a referral for one of your adverts, weekly activity will appear here.</p>
        </div>
      ) : (
        <svg className="block h-auto w-full overflow-visible" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="provider-activity-title provider-activity-desc">
          <title id="provider-activity-title">Weekly requests and referrals</title>
          <desc id="provider-activity-desc">A grouped bar chart showing accommodation requests and professional referrals received in each of the last 12 weeks.</desc>
          {ticks.map((tick) => {
            const y = PAD.top + plotHeight - (tick / maxValue) * plotHeight;
            return (
              <g key={tick}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="currentColor" className="text-line" strokeDasharray={tick === 0 ? undefined : "3 5"} />
                <text x={PAD.left - 9} y={y + 4} textAnchor="end" className="fill-ink-faint" fontSize="11">{tick}</text>
              </g>
            );
          })}
          {points.map((point, index) => {
            const center = PAD.left + step * (index + 0.5);
            const requestHeight = (point.requests / maxValue) * plotHeight;
            const referralHeight = (point.referrals / maxValue) * plotHeight;
            const showLabel = index % 2 === 0 || index === points.length - 1;
            return (
              <g key={`${point.longLabel}-${index}`}>
                <rect x={center - barWidth - 2} y={PAD.top + plotHeight - requestHeight} width={barWidth} height={Math.max(point.requests ? 2 : 0, requestHeight)} rx="3" fill="#1666AA" aria-label={`${point.requests} requests`}>
                  <title>{`${point.longLabel}: ${point.requests} request${point.requests === 1 ? "" : "s"}`}</title>
                </rect>
                <rect x={center + 2} y={PAD.top + plotHeight - referralHeight} width={barWidth} height={Math.max(point.referrals ? 2 : 0, referralHeight)} rx="3" className="fill-pine" aria-label={`${point.referrals} referrals`}>
                  <title>{`${point.longLabel}: ${point.referrals} referral${point.referrals === 1 ? "" : "s"}`}</title>
                </rect>
                {showLabel && <text x={center} y={HEIGHT - 13} textAnchor="middle" className="fill-ink-faint" fontSize="10">{point.label}</text>}
              </g>
            );
          })}
        </svg>
      )}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-soft" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#1666AA]" />Accommodation requests</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-pine" />Professional referrals</span>
      </div>
    </div>
  );
}
