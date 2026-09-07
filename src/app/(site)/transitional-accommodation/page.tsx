import { SeoLandingPage } from "@/components/seo-landing-page";
import { transitionalAccommodationContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Transitional & Move-On Accommodation UK",
  description: "Search transitional, temporary and move-on accommodation from housing providers across the UK on RoomsNow.",
  path: transitionalAccommodationContent.path,
});

export default function TransitionalAccommodationPage() {
  return <SeoLandingPage content={transitionalAccommodationContent} />;
}
