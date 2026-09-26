import Link from "next/link";
import { ProsePage, Section } from "@/components/prose-page";
import { brand } from "@/brand.config";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <ProsePage title="Terms of use" intro={`These terms govern access to and use of ${brand.name}, including listings, enquiries, referrals, messaging, verification, memberships and promoted adverts.`} updated="6 September 2026">
      <div className="rounded-card border border-pine/25 bg-pine-light/35 p-5">
        <p className="font-semibold text-ink">Keep a copy of these terms</p>
        <p className="mt-1 text-[15px]">The PDF is suitable for saving, printing or sharing with your organisation.</p>
        <Link href="/legal/roomsnow-terms-of-use.pdf" download className="btn-primary mt-4">Download terms as PDF</Link>
      </div>

      <Section heading="1. About these terms">
        <p>By creating an account, accessing a restricted feature, buying a membership or continuing to use the service after being notified of a change, you agree to these terms. If you use RoomsNow for an organisation, you confirm that you have authority to bind it. If you do not agree, do not use the service.</p>
      </Section>
      <Section heading="2. The RoomsNow service">
        <p>RoomsNow is a technology platform for finding and advertising housing and accommodation, including HMOs, supported and transitional accommodation, adult social care housing, shared homes and self-contained properties. It provides search, profiles, messaging, referrals and workflow tools.</p>
        <p>RoomsNow is not a landlord, letting agent, care or support provider, local authority, commissioner, regulator, financial adviser or placement decision-maker. Unless expressly stated in writing, RoomsNow is not party to an occupancy, tenancy, support, referral or funding agreement between users.</p>
      </Section>
      <Section heading="3. Eligibility and accounts">
        <ul className="list-disc space-y-2 pl-5">
          <li>Account holders must be at least 18 and legally able to agree to these terms.</li>
          <li>Information supplied must be accurate, current and not misleading.</li>
          <li>Login details are personal and must be protected; suspected compromise must be reported promptly.</li>
          <li>Organisation administrators are responsible for staff access, permissions and removing leavers.</li>
          <li>You are responsible for activity through your account unless caused by RoomsNow&apos;s failure to use reasonable care.</li>
        </ul>
      </Section>
      <Section heading="4. Providers and accommodation adverts">
        <p>Providers are responsible for their properties, services and every statement made in an advert. They must:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>have authority to advertise the accommodation and accept enquiries;</li>
          <li>state rents, charges, deposits, availability, eligibility, accessibility and support accurately;</li>
          <li>hold all licences, registrations, permissions, insurance and safety records required for their activities;</li>
          <li>comply with housing, HMO, planning, fire, equality, consumer, safeguarding, care and data-protection law;</li>
          <li>remove or update unavailable, inaccurate or expired information promptly; and</li>
          <li>carry out lawful suitability, affordability, safeguarding and right-to-rent checks where applicable.</li>
        </ul>
        <p>RoomsNow review of an advert does not verify every claim or make the accommodation suitable for a particular person.</p>
      </Section>
      <Section heading="5. Provider due diligence and verification">
        <p>Providers requesting a badge must submit accurate, current evidence of legal identity, registration, insurance, governance and safeguarding arrangements and must keep it updated. RoomsNow may check public registers, request more evidence, record reviewer decisions and re-review or withdraw a badge.</p>
        <p>A badge is limited to the checks described on the verification page. It is not an inspection, accreditation, regulatory endorsement, guarantee of quality or recommendation. Fraudulent or altered evidence may lead to immediate suspension and referral to relevant authorities.</p>
      </Section>
      <Section heading="6. People looking for accommodation">
        <p>Applicants must provide accurate information and use the service lawfully. A search result, message, match or provider response is not an offer, allocation or guarantee. Before sharing money or documents, users should verify the provider, view the accommodation where possible, understand all agreements and charges, and obtain independent advice where appropriate.</p>
      </Section>
      <Section heading="7. Professional referrers">
        <p>Referrers must be authorised to act, follow their organisation&apos;s policies and complete their own assessment. Before entering another person&apos;s information, the referrer must provide the person with appropriate privacy information and establish a valid UK GDPR lawful basis and, where relevant, an Article 9 or criminal-offence-data condition. Consent must be informed, specific and recorded whenever consent is relied upon. Do not upload information unnecessary for the referral.</p>
      </Section>
      <Section heading="8. Messaging and platform conduct">
        <p>You must not use RoomsNow to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>mislead, impersonate, discriminate unlawfully, harass, threaten or exploit another person;</li>
          <li>publish unlawful, defamatory, infringing, unsafe or inappropriate material;</li>
          <li>scrape, reverse engineer, overload, probe or bypass security or access controls;</li>
          <li>send spam, malware, unsolicited marketing or requests for improper payments;</li>
          <li>circumvent platform charges or manipulate rankings, reviews or verification; or</li>
          <li>share another person&apos;s confidential or sensitive information without authority.</li>
        </ul>
      </Section>
      <Section heading="9. Content and intellectual property">
        <p>You retain ownership of content you submit. You give RoomsNow a non-exclusive, worldwide, royalty-free licence to host, copy, resize, display and distribute it only as needed to operate, secure and promote the service. You confirm you have the rights and permissions needed for that content. RoomsNow owns or licenses the platform, branding, design and software; no rights are transferred except the limited right to use the service under these terms.</p>
      </Section>
      <Section heading="10. Memberships, payments and renewals">
        <p>Prices, taxes, billing intervals, included limits and any minimum term are shown before payment. Memberships may renew automatically where clearly stated at checkout. You may manage or cancel a renewal from the membership page. Cancellation normally takes effect at the end of the paid billing period unless the checkout terms or law require otherwise. Statutory cancellation and refund rights are not restricted. Failed payments may limit paid features after reasonable notice.</p>
      </Section>
      <Section heading="11. Promoted adverts">
        <p>Paid promotion provides labelled placement subject to the selected duration, availability, matching filters and moderation. It does not guarantee impressions, enquiries or placements and never changes verification, safety review or organic eligibility. Promotion may be paused where an advert is paused, removed or no longer eligible.</p>
      </Section>
      <Section heading="12. Provider Services (external services marketplace)">
        <p>Service businesses may advertise trades, supplies and professional services to accommodation providers on a paid RoomsNow membership. Service businesses must submit accurate due-diligence evidence, keep insurance and licences in date, describe services and prices honestly and respond to enquiries in good faith. RoomsNow checks evidence when it is submitted; the Verified badge reflects only those checks and is not a guarantee of work, fitness for purpose or ongoing compliance.</p>
        <p>RoomsNow introduces the parties only. Quotes, contracts, payments, warranties and disputes are between the accommodation provider and the service business, and RoomsNow is not a party to them and does not take payment for jobs. Service businesses may only use information received through RoomsNow to respond to and carry out the requested work, and must not contact residents, request access to referral or support records, or use provider contact details for unrelated marketing. Reviews may only be left after a completed job and may be moderated or removed where they breach these terms.</p>
      </Section>
      <Section heading="13. Moderation, reports and investigations">
        <p>RoomsNow may review adverts, profiles, reports, account activity and verification evidence; request information; restrict visibility; preserve relevant records; or refer concerns where reasonably needed for safety, law enforcement, fraud prevention or platform integrity. Private message content is accessed only where authorised and necessary under the privacy notice and applicable law.</p>
      </Section>
      <Section heading="14. Suspension and termination">
        <p>RoomsNow may warn, restrict, suspend or close an account for a material or repeated breach, non-payment, safety risk, unlawful activity, misleading evidence or a legal requirement. Immediate action may be taken where delay could create harm. Otherwise, reasonable notice and an opportunity to respond will be given where practical. You may stop using the service and request account closure at any time, subject to lawful record-retention requirements.</p>
      </Section>
      <Section heading="15. Service availability and changes">
        <p>RoomsNow aims to provide a reliable service but does not promise uninterrupted or error-free access. Features may change for security, legal, operational or product reasons. Material changes that adversely affect paid services will be notified in advance where reasonably possible.</p>
      </Section>
      <Section heading="16. Responsibility and liability">
        <p>Nothing excludes liability that cannot lawfully be excluded, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or statutory consumer rights. To the extent permitted by law, RoomsNow is not responsible for decisions, conduct, property conditions, services or agreements of users, or for indirect or unforeseeable loss. Business users are responsible for losses caused by their breach, unlawful content or lack of authority to share data.</p>
      </Section>
      <Section heading="17. Privacy and confidentiality">
        <p>Personal information is handled as described in the <Link href="/privacy" className="text-pine-dark hover:underline">privacy notice</Link>. Users receiving confidential or personal information through RoomsNow must protect it, limit access to authorised people and use it only for the relevant housing, support or referral purpose.</p>
      </Section>
      <Section heading="18. Changes to these terms">
        <p>RoomsNow may update these terms to reflect law, safety requirements or service changes. The updated date will be shown and material changes will be brought to account holders&apos; attention. Changes do not apply retrospectively to completed transactions unless required by law.</p>
      </Section>
      <Section heading="19. Governing law, complaints and contact">
        <p>These terms are governed by the law of England and Wales. Consumers retain any mandatory rights to bring proceedings in the part of the UK where they live. Raise complaints first with RoomsNow at {brand.supportEmail}; this does not affect rights to contact a regulator, ombudsman, trading standards service or court.</p>
      </Section>
    </ProsePage>
  );
}
