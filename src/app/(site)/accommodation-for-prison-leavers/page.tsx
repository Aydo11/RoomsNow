import { SeoLandingPage } from "@/components/seo-landing-page";
import { prisonLeaversAccommodationContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Accommodation for Prison Leavers",
  description: "Search supported, transitional and shared accommodation advertised for prison leavers, resettlement teams and professional referrers.",
  path: prisonLeaversAccommodationContent.path,
});

export default function PrisonLeaversAccommodationPage() {
  return <SeoLandingPage content={prisonLeaversAccommodationContent} />;
}
