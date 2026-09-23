import Link from "next/link";
import { ProsePage, Section } from "@/components/prose-page";
import { brand } from "@/brand.config";

export const metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy notice" intro={`This notice explains how ${brand.name} collects, uses, shares and protects personal information across its housing, messaging, referral and verification services.`} updated="23 September 2026">
      <Section heading="1. Who is responsible for your information">
        <p>RoomsNow is responsible for personal information it determines how and why to use. Contact the privacy team at {brand.supportEmail} for questions, rights requests or complaints.</p>
        <p>Providers and professional referrers are normally separate controllers for information they collect for their own housing, support, safeguarding, commissioning or referral work. Their privacy notices also apply.</p>
      </Section>

      <Section heading="2. Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>account and identity details, contact information, login history and security records;</li>
          <li>profiles, accommodation needs, preferred locations and availability;</li>
          <li>provider company details, staff roles, properties, rooms, adverts and due-diligence evidence;</li>
          <li>referrals, requests, case status, documents and communications;</li>
          <li>payment, subscription, invoice and transaction references from payment providers;</li>
          <li>reports, moderation decisions, audit logs and support correspondence; and</li>
          <li>technical data such as IP address, device/browser information, page events and error logs.</li>
        </ul>
      </Section>

      <Section heading="3. Sensitive information">
        <p>Housing profiles and referrals may include health, disability, ethnicity, religion, sexual orientation or other special-category data, and may exceptionally include criminal-offence information. RoomsNow asks users to provide only what is necessary for a housing or support purpose.</p>
        <p>In addition to an Article 6 lawful basis, RoomsNow identifies and documents an Article 9 condition before using special-category data and an appropriate legal condition before using criminal-offence data. Where explicit consent is used, it must be specific, informed, recorded and capable of withdrawal. Professional referrers remain responsible for their own lawful basis and conditions before sharing a person&apos;s information.</p>
      </Section>

      <Section heading="4. Why we use information and our lawful bases">
        <div className="overflow-x-auto rounded-[10px] border border-line">
          <table className="w-full min-w-[620px] text-left text-[14px]">
            <thead className="bg-paper-sunk text-ink"><tr><th className="px-3 py-2">Purpose</th><th className="px-3 py-2">Typical lawful basis</th></tr></thead>
            <tbody className="divide-y divide-line">
              <tr><td className="px-3 py-2">Create accounts and provide requested platform features</td><td className="px-3 py-2">Contract; steps requested before a contract</td></tr>
              <tr><td className="px-3 py-2">Display adverts and discoverable profiles</td><td className="px-3 py-2">Contract; consent or legitimate interests depending on the feature</td></tr>
              <tr><td className="px-3 py-2">Process requests, referrals and messages</td><td className="px-3 py-2">Contract, consent, legitimate interests or legal obligation, plus an additional condition for sensitive data</td></tr>
              <tr><td className="px-3 py-2">Provider verification and fraud prevention</td><td className="px-3 py-2">Contract and legitimate interests; legal obligation where applicable</td></tr>
              <tr><td className="px-3 py-2">Payments, accounting and tax records</td><td className="px-3 py-2">Contract and legal obligation</td></tr>
              <tr><td className="px-3 py-2">Safety, moderation, legal claims and security</td><td className="px-3 py-2">Legitimate interests, legal obligation and establishment or defence of legal claims</td></tr>
              <tr><td className="px-3 py-2">Optional product communications</td><td className="px-3 py-2">Consent or legitimate interests, with an opt-out where required</td></tr>
            </tbody>
          </table>
        </div>
        <p>RoomsNow records its lawful-basis assessment and does not use a new incompatible purpose without telling affected people and identifying a lawful basis.</p>
      </Section>

      <Section heading="5. Public information and visibility controls">
        <p>Provider profiles and approved adverts are public. Applicant profiles are private by default and become searchable only when the person deliberately enables discoverability. Public property locations normally show an area and outward postcode unless a provider chooses to publish a full address.</p>
      </Section>

      <Section heading="6. Who receives information">
        <p>Information is shared only as needed with the provider, applicant or referrer involved in a request; authorised RoomsNow staff; and contracted suppliers for hosting, storage, email, payments, monitoring, maps and security. Suppliers receive only the access needed for their service and must protect the information under contract.</p>
        <p>RoomsNow may disclose information where required by law, to protect someone from serious harm, to investigate fraud or abuse, to establish or defend legal rights, or as part of a properly managed business transfer. RoomsNow does not sell personal information.</p>
      </Section>

      <Section heading="7. Provider verification documents">
        <p>Incorporation evidence, insurance, organisation charts, safeguarding policies and related due-diligence files are private. Access is limited to authorised company staff and RoomsNow reviewers, served through an access-controlled route and recorded in the audit log. The public badge does not reveal the documents.</p>
      </Section>

      <Section heading="8. International transfers">
        <p>If a supplier processes information outside the UK, RoomsNow uses an adequacy regulation or appropriate safeguards such as the UK International Data Transfer Agreement or approved addendum, and assesses relevant transfer risks where required.</p>
      </Section>

      <Section heading="9. Retention">
        <p>RoomsNow aims to keep information only while needed for the stated purpose, safety, disputes and legal obligations. The intended review periods are: account and operational records while the account is active and for up to 24 months afterwards; closed requests, referrals and messages for up to 24 months; verification evidence while a badge is active and for up to 12 months after it ends; security and audit logs for up to 12 months; and billing/tax records for the applicable accounting period. Records may be kept longer for an active complaint, safeguarding concern, fraud investigation or legal claim.</p>
        <p className="rounded-[10px] border border-line bg-paper-sunk px-4 py-3">These are review targets, not a promise that every record is automatically erased on those dates. Automated deletion and backup expiry are not yet fully enforced across all data types. Until the retention jobs and backup lifecycle are operationally configured, some records may remain longer. Contact {brand.supportEmail} about a specific retention concern.</p>
      </Section>

      <Section heading="10. Professional referral declarations">
        <p>When a professional submits a referral, RoomsNow records the data-sharing basis they select, the time of their declaration, a confirmation that they have considered privacy information and data minimisation, and a confirmation that any additional condition and safeguards for special-category or criminal-offence data have been considered. This is an accountability record of what the referrer declared; it is not a finding by RoomsNow that the basis or condition is legally valid.</p>
        <p>The referring organisation remains responsible for its own lawful-basis assessment, any Article 9 condition, any DPA 2018 Schedule 1 condition where required, transparency to the person, confidentiality duties, and its case records. RoomsNow receives only the information submitted and does not independently assess the person's case.</p>
      </Section>

      <Section heading="11. Security">
        <p>RoomsNow uses role-based access, private document storage, access checks, audit logs, upload validation, rate limiting, encrypted transport, session controls, backups and error monitoring. No service can guarantee absolute security. Report suspected compromise immediately and do not send passwords or unnecessary sensitive information in messages.</p>
      </Section>

      <Section heading="12. Your rights">
        <p>Depending on the circumstances, you may ask for access, correction, deletion, restriction, portability or objection, and may withdraw consent without affecting earlier lawful use. RoomsNow may need to verify identity and may retain information where law permits or requires it. Rights requests can be sent to {brand.supportEmail}.</p>
        <p>You may complain to the Information Commissioner&apos;s Office at <a href="https://ico.org.uk/make-a-complaint/" className="text-pine-dark hover:underline">ico.org.uk</a>. Please contact RoomsNow first if you would like the opportunity for the issue to be resolved directly.</p>
      </Section>

      <Section heading="13. Automated decisions and children">
        <p>RoomsNow does not make solely automated decisions that produce legal or similarly significant effects. Search ordering and filters assist discovery but do not decide eligibility or placements. RoomsNow accounts are for people aged 18 or over; information about a child must be entered only by an authorised professional with an appropriate lawful basis and safeguarding controls.</p>
      </Section>

      <Section heading="14. Cookies and changes to this notice">
        <p>Strictly necessary cookies support login, security and core service operation. Optional analytics or marketing technologies will not be enabled without the consent controls required by law. RoomsNow may update this notice when its services, suppliers or legal duties change and will highlight material changes to account holders.</p>
        <p>Related information appears in the <Link href="/terms" className="text-pine-dark hover:underline">terms of use</Link> and <Link href="/verification" className="text-pine-dark hover:underline">verification policy</Link>.</p>
      </Section>
    </ProsePage>
  );
}
