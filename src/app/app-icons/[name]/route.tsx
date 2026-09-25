import { ImageResponse } from "next/og";

/**
 * App icons for the home screen, drawn from the RoomsNow mark at build time
 * so there are no binary files to keep in sync with the logo.
 *   /app-icons/192, /app-icons/512  – standard icons (rounded tile)
 *   /app-icons/maskable             – full-bleed tile with safe-zone padding
 *   /app-icons/badge                – white silhouette for Android's status bar
 */
export const dynamic = "force-static";

const MARK = `<path d="M24 6 L44 22 V40 H4 V22 Z" fill="white"/><rect x="12" y="28" width="8" height="12" rx="1" fill="#1666AA"/><circle cx="35" cy="30" r="7" stroke="#549DE5" stroke-width="3" fill="#171F2E"/><line x1="40.2" y1="35.2" x2="44.5" y2="39.5" stroke="#549DE5" stroke-width="3" stroke-linecap="round"/>`;
// Android draws only the badge's shape, so the door is a real hole, not a colour.
const BADGE = `<path fill-rule="evenodd" d="M24 6 L44 22 V40 H4 V22 Z M12 28 H20 V40 H12 Z" fill="white"/>`;

const svg = (inner: string) => `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${inner}</svg>`).toString("base64")}`;

const ICONS = {
  "192": { size: 192, rounded: true, mark: 0.6, badge: false },
  "512": { size: 512, rounded: true, mark: 0.6, badge: false },
  maskable: { size: 512, rounded: false, mark: 0.46, badge: false },
  badge: { size: 96, rounded: false, mark: 0.9, badge: true },
} as const;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const icon = ICONS[name as keyof typeof ICONS];
  if (!icon) return new Response("Not found", { status: 404 });
  const markSize = Math.round(icon.size * icon.mark);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: icon.badge ? "transparent" : "#171F2E",
          borderRadius: icon.rounded ? icon.size * 0.22 : 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
        <img src={svg(icon.badge ? BADGE : MARK)} width={markSize} height={markSize} alt="" />
      </div>
    ),
    { width: icon.size, height: icon.size, headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
