import { SeoLandingPage } from "@/components/seo-landing-page";
import { supportedAccommodationManchesterContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Supported Accommodation in Manchester",
  description: "Search supported accommodation in Manchester and compare vacancies, support categories, provider details and professional referral routes.",
  path: supportedAccommodationManchesterContent.path,
});

export default function SupportedAccommodationManchesterPage() {
  return <SeoLandingPage content={supportedAccommodationManchesterContent} />;
}
