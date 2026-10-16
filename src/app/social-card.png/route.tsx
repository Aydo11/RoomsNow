import { ImageResponse } from "next/og";

/**
 * The default link-preview picture (1200×630) for every page that has no
 * picture of its own: WhatsApp, Facebook, LinkedIn, X and Slack show it when
 * someone shares a RoomsNow link. Drawn once at build time and served static.
 * Adverts use their own photo card instead (share-card/[id]).
 */
export const dynamic = "force-static";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6 L44 22 V40 H4 V22 Z" fill="white"/><rect x="12" y="28" width="8" height="12" rx="1" fill="#1666AA"/><circle cx="35" cy="30" r="7" stroke="#549DE5" stroke-width="3" fill="#171F2E"/><line x1="40.2" y1="35.2" x2="44.5" y2="39.5" stroke="#549DE5" stroke-width="3" stroke-linecap="round"/></svg>`;
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

const POINTS = ["HMO rooms", "Supported accommodation", "Verified providers", "Free to search"];

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0F2A44 0%, #171F2E 55%, #1666AA 140%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK_URI} width={64} height={64} alt="" />
            <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>RoomsNow</span>
          </div>
          <span style={{ fontSize: 28, color: "#F5B544", fontWeight: 700 }}>roomsnow.co.uk</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, maxWidth: 960 }}>
            Find an HMO room or supported accommodation
          </span>
          <span style={{ marginTop: 22, fontSize: 30, color: "#B9D6F2" }}>
            Rooms free now across the UK, with the right support alongside.
          </span>
        </div>
        <div style={{ display: "flex" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {POINTS.map((point) => (
              <span
                key={point}
                style={{
                  display: "flex",
                  padding: "10px 20px",
                  borderRadius: 999,
                  fontSize: 22,
                  background: "rgba(84,157,229,0.18)",
                  border: "1px solid rgba(84,157,229,0.45)",
                }}
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
