import Link from "next/link";
import { ProsePage, Section } from "@/components/prose-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Provider Verification | How We Check Accommodation Providers",
  description: "How RoomsNow verifies HMO, supported accommodation and adult social care providers: the evidence required, the checks made and what a verified badge does and doesn't mean.",
  path: "/verification",
});

export default function VerificationPage() {
  return (
    <ProsePage
      title="Provider verification"
      intro="How RoomsNow checks provider identity and due-diligence evidence before displaying a verified badge."
      updated="6 September 2026"
    >
      <Section heading="Evidence providers must submit">
        <ul className="list-disc space-y-2 pl-5">
          <li>certificate of incorporation, charity registration or equivalent legal-registration evidence;</li>
          <li>current company insurance, including the expiry date and relevant cover;</li>
          <li>an organisation chart showing directors, accountable leaders and service-management lines;</li>
          <li>a current safeguarding policy naming the responsible lead and escalation route;</li>
          <li>regulator, commissioning and ICO evidence where it applies to the organisation&apos;s work; and</li>
          <li>any further evidence reasonably requested to resolve an inconsistency or risk.</li>
        </ul>
        <p>Evidence is stored privately and access is logged. It is not published on provider profiles or adverts.</p>
      </Section>

      <Section heading="The checks we record">
        <p>
          An authorised RoomsNow reviewer checks that the registration record and submitted identity details
          are consistent, insurance appears current and appropriate, accountable roles are clear, and the
          safeguarding route is documented. The reviewer records the outcome, date and any note to the provider.
        </p>
        <p>
          Companies House information can be checked against the public register. Charity, regulator and
          commissioning evidence is checked against the relevant issuing body where reasonably possible.
        </p>
      </Section>

      <Section heading="What the badge means">
        <p>
          The badge means RoomsNow has completed its stated identity and document checks using the evidence
          available at the review date. It does not mean RoomsNow has inspected a property, audited support
          quality, guaranteed legal compliance or approved a placement.
        </p>
      </Section>

      <Section heading="What the badge does not replace">
        <p>
          Verification is not a licence, accreditation, regulator rating, local-authority approval or
          recommendation. Users and referrers must still make their own suitability, safeguarding, property,
          funding and regulatory checks before making or accepting a placement.
        </p>
      </Section>

      <Section heading="Ongoing duties and renewal">
        <p>
          Providers must keep evidence current and tell RoomsNow promptly about expired insurance, changes in
          ownership or control, safeguarding leadership, regulatory action or any fact that makes the submitted
          evidence inaccurate. RoomsNow may request refreshed evidence, place the badge under review or remove it.
        </p>
      </Section>

      <Section heading="Applying as a provider">
        <p>
          Complete the legal name, registration number and registered address on your company profile, then
          upload the required evidence. Submissions must be made by an authorised representative.
        </p>
        <p><Link href="/provider/settings" className="text-pine-dark hover:underline">Start a due-diligence review</Link></p>
      </Section>

      <Section heading="Suspension or removal">
        <p>
          RoomsNow may reject, suspend or remove verification where evidence is missing, expired, inconsistent
          or misleading; where a provider does not respond to a review; or where safety, regulatory or platform
          concerns require further checks. Providers are given a reason unless doing so would create a safety,
          security or legal risk.
        </p>
      </Section>
    </ProsePage>
  );
}
