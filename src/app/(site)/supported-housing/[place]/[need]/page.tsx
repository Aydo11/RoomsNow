import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaPage } from "@/components/area-page";
import { loadAreaPage } from "@/server/area-pages";
import { areaPath, areaTitle } from "@/lib/area-pages";
import { pageMetadata } from "@/lib/seo";
import { smsEnabled } from "@/lib/room-alerts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ place: string; need: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { place, need } = await params;
  const data = await loadAreaPage(place, need);
  if (!data) return { title: "Area not found", robots: { index: false, follow: true } };
  const { stats } = data;
  const meta = pageMetadata({
    title: areaTitle(data.place, data.need),
    description: stats.adverts
      ? `${stats.roomsFree} rooms free now across ${stats.adverts} adverts offering ${data.need!.short} in ${data.place.name}. Compare rent, Housing Benefit and referral routes.`
      : `Get a free alert when a room offering ${data.need!.short} comes up in ${data.place.name}.`,
    path: areaPath(data.place, data.need),
  });
  // Pages with nothing live stay out of Google until they have something to show.
  return stats.adverts ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function SupportedHousingNeedPage({ params }: Props) {
  const { place, need } = await params;
  const data = await loadAreaPage(place, need);
  if (!data) notFound();
  return <AreaPage data={data} smsEnabled={smsEnabled()} />;
}
