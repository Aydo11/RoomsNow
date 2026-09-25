import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaPage } from "@/components/area-page";
import { loadAreaPage } from "@/server/area-pages";
import { areaPath, areaTitle } from "@/lib/area-pages";
import { pageMetadata } from "@/lib/seo";
import { smsEnabled } from "@/lib/room-alerts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ place: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { place } = await params;
  const data = await loadAreaPage(place);
  if (!data) return { title: "Area not found", robots: { index: false, follow: true } };
  const { stats } = data;
  const meta = pageMetadata({
    title: `${areaTitle(data.place)}: ${stats.roomsFree} Room${stats.roomsFree === 1 ? "" : "s"} Free`,
    description: `${stats.roomsFree} rooms free now in ${data.place.name} across ${stats.adverts} live supported housing adverts. Compare rent, Housing Benefit, support and referral routes, and contact providers.`,
    path: areaPath(data.place),
  });
  return stats.adverts ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function SupportedHousingPlacePage({ params }: Props) {
  const { place } = await params;
  const data = await loadAreaPage(place);
  if (!data) notFound();
  return <AreaPage data={data} smsEnabled={smsEnabled()} />;
}
