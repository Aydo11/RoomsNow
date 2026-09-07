import { SeoLandingPage } from "@/components/seo-landing-page";
import { accommodationReferralsContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Accommodation Referrals for Housing Professionals",
  description: "Search housing vacancies and submit supported accommodation referrals securely to participating providers through RoomsNow.",
  path: accommodationReferralsContent.path,
});

export default function AccommodationReferralsPage() {
  return <SeoLandingPage content={accommodationReferralsContent} />;
}
