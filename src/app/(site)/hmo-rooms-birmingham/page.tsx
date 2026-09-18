import { SeoLandingPage } from "@/components/seo-landing-page";
import { hmoRoomsBirminghamContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "HMO Rooms in Birmingham",
  description: "Search HMO rooms and shared accommodation in Birmingham. Compare rent, bills, facilities, room availability and provider details.",
  path: hmoRoomsBirminghamContent.path,
});

export default function HmoRoomsBirminghamPage() {
  return <SeoLandingPage content={hmoRoomsBirminghamContent} />;
}
