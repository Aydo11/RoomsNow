import { SeoLandingPage } from "@/components/seo-landing-page";
import { supportedAccommodationContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Supported Accommodation Across the UK",
  description: "Search supported accommodation and supported housing vacancies by location, support need, availability and referral route with RoomsNow.",
  path: supportedAccommodationContent.path,
});

export default function SupportedAccommodationPage() {
  return <SeoLandingPage content={supportedAccommodationContent} />;
}
