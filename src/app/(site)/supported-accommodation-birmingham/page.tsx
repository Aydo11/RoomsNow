import { SeoLandingPage } from "@/components/seo-landing-page";
import { supportedAccommodationBirminghamContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Supported Accommodation in Birmingham",
  description: "Search supported accommodation vacancies in Birmingham by support need, availability, accommodation type and referral route.",
  path: supportedAccommodationBirminghamContent.path,
});

export default function SupportedAccommodationBirminghamPage() {
  return <SeoLandingPage content={supportedAccommodationBirminghamContent} />;
}
