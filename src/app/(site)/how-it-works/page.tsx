import Link from "next/link";
import { brand } from "@/brand.config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How It Works | Finding & Advertising HMO Rooms and Supported Accommodation",
  description: "How RoomsNow works for people looking for a room, HMO or supported accommodation, for providers advertising vacancies, and for professionals making referrals.",
  path: "/how-it-works",
});

const AUDIENCES = [
  {
    who: "If you're looking for somewhere to live",
    steps: [
      ["Create an account", "You'll be asked for the basics only — name, email, roughly where you're looking."],
      ["Post what you're looking for", "An advert providers can find, with as much or as little detail as you want public."],
      ["Search and message", "Filter by support, area and availability. Messages go through the platform, so your number stays yours."],
      ["Request accommodation", "A structured request goes straight to the provider's worklist, and you can track its status."],
    ],
    cta: ["Create your advert", "/register?type=USER"],
  },
  {
    who: "If you advertise accommodation",
    steps: [
      ["Set up your organisation", "Company details, operating areas and the support you provide."],
      ["Post adverts", "Advertise HMOs, supported or transitional accommodation, adult social care housing and other homes, with room-level availability, photos, video and referral routes."],
      ["Get verified", "Send us your documents. Verification is manual, and it confirms identity — not regulatory status."],
      ["Work your enquiries", "Requests and referrals arrive in one worklist with a shared status trail."],
    ],
    cta: ["Advertise accommodation", "/register?type=PROVIDER"],
  },
  {
    who: "If you refer people professionally",
    steps: [
      ["Create a referrer account", "Tell us your organisation and role."],
      ["Find suitable accommodation", "Filter to providers accepting professional or local authority referrals."],
      ["Submit a referral", "Structured applicant details plus supporting documents, visible only to you, the provider and our admin team."],
      ["Track it to move-in", "Submitted, received, under review, assessment, offered, accepted, moved in."],
    ],
    cta: ["Make a referral", "/register?type=REFERRER"],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="shell max-w-4xl py-14">
      <h1 className="text-[38px] leading-tight">How {brand.name} works</h1>
      <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
        One marketplace for a broad range of housing: HMOs, supported and transitional
        accommodation, adult social care housing, shared homes and self-contained properties.
        People can find accommodation, providers can advertise vacancies, and professionals can refer clients.
      </p>

      <div className="mt-12 space-y-12">
        {AUDIENCES.map((audience) => (
          <section key={audience.who}>
            <h2 className="text-[26px]">{audience.who}</h2>
            <ol className="mt-5 space-y-5">
              {audience.steps.map(([title, body], index) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pine-light font-display text-[15px] text-pine-dark">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[18px]">{title}</h3>
                    <p className="mt-1 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href={audience.cta[1]} className="btn-primary mt-6">{audience.cta[0]}</Link>
          </section>
        ))}
      </div>

      <section className="card mt-14 p-7">
        <h2 className="text-[22px]">What we don&apos;t do</h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-soft">
          <li>We don&apos;t assess anyone&apos;s eligibility, needs or risk. Providers do that.</li>
          <li>We don&apos;t inspect properties or confirm regulatory registration of any kind.</li>
          <li>We don&apos;t share applicant information with anyone outside the provider it was sent to.</li>
          <li>Match percentages are a search aid, not a judgement about suitability.</li>
        </ul>
      </section>
    </div>
  );
}
