import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { publicLocation, rentRange } from "@/lib/format";
import { coverImage } from "@/lib/cover-image";
import { demoListingImage } from "@/lib/demo-listings";
import { supportLabel } from "@/lib/taxonomy";

/**
 * Share card for an advert: photo, title, rent, area and the RoomsNow link,
 * drawn as a PNG. `?format=square` (1080×1080) is for WhatsApp status,
 * Instagram and Facebook posts; the default wide card (1200×630) is what link
 * previews use.
 */
export const dynamic = "force-dynamic";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6 L44 22 V40 H4 V22 Z" fill="white"/><rect x="12" y="28" width="8" height="12" rx="1" fill="#1666AA"/><circle cx="35" cy="30" r="7" stroke="#549DE5" stroke-width="3" fill="#171F2E"/><line x1="40.2" y1="35.2" x2="44.5" y2="39.5" stroke="#549DE5" stroke-width="3" stroke-linecap="round"/></svg>`;
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

function absolute(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  const base = (process.env.APP_URL ?? "https://www.roomsnow.co.uk").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Photos are fetched here so a broken or slow image never breaks the card. */
async function photoData(url: string): Promise<string | null> {
  try {
    const response = await fetch(absolute(url), { signal: AbortSignal.timeout(6000) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\/(jpeg|png|webp|gif)/.test(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 6 * 1024 * 1024) return null;
    return `data:${type.split(";")[0]};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const square = new URL(request.url).searchParams.get("format") === "square";
  const listing = await db.listing.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      weeklyRentFrom: true,
      weeklyRentTo: true,
      billsIncluded: true,
      supportTypes: true,
      rooms: { select: { status: true } },
      company: { select: { name: true, verification: true } },
      property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true } },
      media: { where: { type: { in: ["IMAGE", "VIDEO_URL"] } }, orderBy: [{ type: "asc" }, { isPrimary: "desc" }, { position: "asc" }], take: 4, select: { type: true, url: true } },
    },
  });
  if (!listing || listing.status !== "ACTIVE") return new Response("Not found", { status: 404 });

  const cover = coverImage(listing.media);
  const photo = (await photoData(cover?.url ?? demoListingImage(listing.id).url)) ?? (await photoData(demoListingImage(listing.id).url));
  const rent = rentRange(listing.weeklyRentFrom, listing.weeklyRentTo);
  const location = publicLocation(listing.property);
  const free = listing.rooms.filter((room) => room.status === "AVAILABLE").length;
  const chips = [
    free > 0 ? `${free} room${free === 1 ? "" : "s"} free now` : null,
    listing.billsIncluded ? "Bills included" : null,
    ...listing.supportTypes.slice(0, 2).map((slug) => supportLabel(slug).replace(/\s*\(.*\)$/, "")),
  ].filter(Boolean) as string[];
  const verified = listing.company.verification === "APPROVED";

  const width = square ? 1080 : 1200;
  const height = square ? 1080 : 630;
  const photoBox = square ? { width: 1080, height: 600 } : { width: 560, height: 630 };
  const title = listing.title.length > 70 ? `${listing.title.slice(0, 68).trimEnd()}…` : listing.title;

  return new ImageResponse(
    (
      <div style={{ width, height, display: "flex", flexDirection: square ? "column" : "row", background: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ ...photoBox, display: "flex", position: "relative", background: "#171F2E" }}>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse
            <img src={photo} width={photoBox.width} height={photoBox.height} style={{ objectFit: "cover" }} alt="" />
          )}
          <div
            style={{
              position: "absolute",
              top: 28,
              left: 28,
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: 999,
              background: "#1666AA",
              color: "#ffffff",
              fontSize: square ? 26 : 22,
              letterSpacing: 1,
            }}
          >
            ROOM AVAILABLE
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: square ? "36px 48px 40px" : "44px 44px 36px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: square ? 50 : 40, lineHeight: 1.12, color: "#14202e", display: "flex" }}>{title}</div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontSize: square ? 46 : 38, color: "#0F4F87" }}>{rent}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: square ? 30 : 26, color: "#4a5a6c", display: "flex" }}>{location}</div>
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {chips.slice(0, square ? 4 : 3).map((chip) => (
                <span key={chip} style={{ padding: "8px 18px", borderRadius: 999, background: "#E6F0FA", color: "#0F4F87", fontSize: square ? 24 : 20 }}>
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #dde5ee", paddingTop: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 54, height: 54, borderRadius: 14, background: "#171F2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
                <img src={MARK_URI} width={36} height={36} alt="" />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: square ? 30 : 26, color: "#14202e" }}>RoomsNow</span>
                <span style={{ fontSize: square ? 22 : 19, color: "#4a5a6c" }}>roomsnow.co.uk</span>
              </div>
            </div>
            <span style={{ fontSize: square ? 22 : 19, color: verified ? "#0F4F87" : "#4a5a6c", display: "flex" }}>
              {verified ? "Verified provider" : listing.company.name.slice(0, 32)}
            </span>
          </div>
        </div>
      </div>
    ),
    { width, height, headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
