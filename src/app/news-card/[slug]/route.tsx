import { ImageResponse } from "next/og";
import { newsPostBySlug } from "@/server/news";
import { MARK_URI, photoData } from "@/lib/og-photo";

/**
 * Link-preview card (1200×630) for a News post: category, headline and cover
 * photo in the RoomsNow style. Only published posts get one, checked on every
 * request so unpublishing stops it straight away.
 */
export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = { ROOMSNOW: "RoomsNow update", CHARITY: "Charity", SECTOR: "Housing sector news" };

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const post = await newsPostBySlug((await params).slug);
  if (!post) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  // Only admin uploads are ever fetched (never a URL from the request); a broken photo just drops it.
  const photo = post.imageUrl ? await photoData(post.imageUrl) : null;
  const label = post.category === "CHARITY" && post.appealStatus === "OPEN" ? "Charity appeal" : (LABELS[post.category] ?? "News");
  const max = photo ? 80 : 110;
  const title = post.title.length > max ? `${post.title.slice(0, max - 1).trimEnd()}…` : post.title;

  const card = new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: "#171F2E", fontFamily: "sans-serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex" }}>
              <span style={{ padding: "8px 20px", borderRadius: 999, background: "#f5b544", color: "#171F2E", fontSize: 24, letterSpacing: 1 }}>{label.toUpperCase()}</span>
            </div>
            <div style={{ marginTop: 32, display: "flex", color: "#F4F7FB", fontSize: photo ? 54 : 62, lineHeight: 1.12, wordBreak: "break-word" }}>{title}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#9FB3C8", fontSize: 26 }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: "#1666AA", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
              <img src={MARK_URI} width={36} height={36} alt="" />
            </div>
            <span style={{ color: "#F4F7FB", fontSize: 30 }}>RoomsNow</span>
            <span>roomsnow.co.uk/news</span>
          </div>
        </div>
        {photo && (
          <div style={{ width: 400, height: 630, display: "flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse */}
            <img src={photo} width={400} height={630} style={{ objectFit: "cover" }} alt="" />
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 },
  );
  card.headers.set("Cache-Control", "no-store");
  return card;
}
