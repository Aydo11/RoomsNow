import { SeoLandingPage } from "@/components/seo-landing-page";
import { mentalHealthAccommodationContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Mental-Health Supported Accommodation",
  description: "Search mental-health supported accommodation and compare vacancies, facilities, provider information and referral routes.",
  path: mentalHealthAccommodationContent.path,
});

export default function MentalHealthAccommodationPage() {
  return <SeoLandingPage content={mentalHealthAccommodationContent} />;
}
