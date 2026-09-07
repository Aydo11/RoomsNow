import { SeoLandingPage } from "@/components/seo-landing-page";
import { adultSocialCareContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Adult Social Care Accommodation UK",
  description: "Search adult social care and specialist accommodation by location, support category, accessibility and referral route.",
  path: adultSocialCareContent.path,
});

export default function AdultSocialCareAccommodationPage() {
  return <SeoLandingPage content={adultSocialCareContent} />;
}
