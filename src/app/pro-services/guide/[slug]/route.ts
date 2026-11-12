import { DEMO_SLUG, type ProServiceKey } from "@/lib/pro-services";
import { buildProPack, packFileName } from "@/lib/pro-pack-pdf";

/** Public PDF guides: /pro-services/guide/crm, …/expert-sessions, …/all. Generic RoomsNow, no personal data. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = slug === "all" ? "ALL" : (Object.keys(DEMO_SLUG) as ProServiceKey[]).find((k) => DEMO_SLUG[k] === slug);
  if (!key) return new Response("Not found", { status: 404 });
  const pdf = buildProPack(key, { siteUrl: process.env.APP_URL });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${packFileName(key)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
