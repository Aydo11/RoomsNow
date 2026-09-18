import { SeoLandingPage } from "@/components/seo-landing-page";
import { accommodationReferralsContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Professional Accommodation Referral Platform",
  description: "Search housing vacancies and use a professional accommodation referral platform to submit and track referrals with participating providers.",
  path: accommodationReferralsContent.path,
});

export default function AccommodationReferralsPage() {
  return <SeoLandingPage content={accommodationReferralsContent} />;
}
