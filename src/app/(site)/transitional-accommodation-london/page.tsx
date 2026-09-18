import { SeoLandingPage } from "@/components/seo-landing-page";
import { transitionalAccommodationLondonContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Transitional Accommodation in London",
  description: "Search transitional, temporary and move-on accommodation advertised in London, with shared and self-contained options and referral routes.",
  path: transitionalAccommodationLondonContent.path,
});

export default function TransitionalAccommodationLondonPage() {
  return <SeoLandingPage content={transitionalAccommodationLondonContent} />;
}
