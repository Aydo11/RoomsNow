import { SeoLandingPage } from "@/components/seo-landing-page";
import { hmoRoomsContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "HMO Rooms to Rent Across the UK",
  description: "Search HMO rooms to rent across the UK. Compare shared accommodation, rent, facilities, availability and referral routes on RoomsNow.",
  path: hmoRoomsContent.path,
});

export default function HmoRoomsPage() {
  return <SeoLandingPage content={hmoRoomsContent} />;
}
