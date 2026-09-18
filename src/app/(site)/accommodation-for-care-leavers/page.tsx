import { SeoLandingPage } from "@/components/seo-landing-page";
import { careLeaversAccommodationContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Accommodation for Care Leavers",
  description: "Search accommodation for care leavers and young people, including supported, transitional and shared housing referral options.",
  path: careLeaversAccommodationContent.path,
});

export default function CareLeaversAccommodationPage() {
  return <SeoLandingPage content={careLeaversAccommodationContent} />;
}
