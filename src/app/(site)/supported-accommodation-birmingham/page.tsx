import { SeoLandingPage } from "@/components/seo-landing-page";
import { supportedAccommodationBirminghamContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";
import { neighbourhoodGuides } from "@/lib/neighbourhood-guides";

export const metadata = pageMetadata({
  title: "Supported Accommodation in Birmingham",
  description: "Search supported accommodation vacancies in Birmingham by support need, availability, accommodation type and referral route.",
  path: supportedAccommodationBirminghamContent.path,
});

export default function SupportedAccommodationBirminghamPage() {
  // Links every district page from the main Birmingham page so search engines find them.
  const relatedLinks = [
    ...(supportedAccommodationBirminghamContent.relatedLinks ?? []),
    ...neighbourhoodGuides.map((g) => ({ label: `Supported accommodation in ${g.name}`, href: `/areas/birmingham/${g.slug}` })),
  ];
  return <SeoLandingPage content={{ ...supportedAccommodationBirminghamContent, relatedLinks }} />;
}
