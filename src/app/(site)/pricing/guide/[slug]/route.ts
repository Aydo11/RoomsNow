import { db } from "@/lib/db";
import { planGuideBySlug } from "@/lib/plan-guides";
import { buildPlanPack, planFileName } from "@/lib/plan-pack-pdf";

/** Public PDF guides for the pricing page: /pricing/guide/boosts, …/professional-plan, …/all. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = slug === "all" ? "ALL" : planGuideBySlug(slug);
  if (!key) return new Response("Not found", { status: 404 });
  const plans = await db.membership.findMany({ where: { active: true }, select: { tier: true, priceMonthly: true } });
  const pdf = buildPlanPack(key, Object.fromEntries(plans.map((p) => [p.tier, p.priceMonthly])), { siteUrl: process.env.APP_URL });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${planFileName(key)}"`,
      "Cache-Control": "public, max-age=600",
    },
  });
}
