import { SeoLandingPage } from "@/components/seo-landing-page";
import { advertiseAccommodationContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Advertise HMO Rooms & Accommodation Vacancies",
  description: "Advertise HMO rooms, supported housing and accommodation vacancies to people and professional referrers with RoomsNow.",
  path: advertiseAccommodationContent.path,
});

export default function AdvertiseAccommodationPage() {
  return (
    <SeoLandingPage
      content={advertiseAccommodationContent}
      street={[
        { at: 0.22, label: "New enquiry", tone: "amber" },
        { at: 0.5, label: "Referral received", tone: "blue" },
        { at: 0.78, label: "Room let", tone: "green" },
      ]}
    />
  );
}
