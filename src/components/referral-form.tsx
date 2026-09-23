"use client";
import { useActionState } from "react";

import { createReferralAction } from "@/server/actions/referrals";
import { CheckGroup, Field, FormError, SubmitButton } from "./ui";
import { Dropzone } from "./dropzone";
import { SUPPORT_TYPES, URGENCY_LABELS } from "@/lib/taxonomy";

export function ReferralForm({
  listingId,
  clientId,
  defaults,
}: {
  listingId?: string;
  clientId?: string;
  defaults?: {
    organisation?: string;
    applicantFirstName?: string;
    applicantLastName?: string;
    applicantDob?: string;
    applicantPhone?: string;
    applicantEmail?: string;
    preferredLocation?: string;
    accommodationNeeds?: string;
    supportNeeds?: string;
    supportTypes?: string[];
  };
}) {
  const [state, action] = useActionState(createReferralAction, { ok: false });

  return (
    <form action={action} className="space-y-6">
      {listingId && <input type="hidden" name="listingId" value={listingId} />}
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      {clientId && (
        <div className="rounded-[10px] border border-pine/25 bg-pine-light px-4 py-3 text-[14px] text-pine-dark">
          Pre-filled from your saved client. Anything you change here only affects this referral.
        </div>
      )}
      <FormError message={state.errors?.form} />

      <section className="card space-y-4 p-6">
        <h2 className="text-[20px]">About the person you&apos;re referring</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="applicantFirstName" error={state.errors?.applicantFirstName}>
            <input id="applicantFirstName" name="applicantFirstName" defaultValue={defaults?.applicantFirstName} className="field" />
          </Field>
          <Field label="Last name" name="applicantLastName" error={state.errors?.applicantLastName}>
            <input id="applicantLastName" name="applicantLastName" defaultValue={defaults?.applicantLastName} className="field" />
          </Field>
          <Field label="Date of birth" name="applicantDob">
            <input id="applicantDob" name="applicantDob" type="date" defaultValue={defaults?.applicantDob} className="field" />
          </Field>
          <Field label="Contact phone" name="applicantPhone">
            <input id="applicantPhone" name="applicantPhone" defaultValue={defaults?.applicantPhone} className="field" />
          </Field>
          <Field label="Contact email" name="applicantEmail" hint="If they have one — it links the referral to their account.">
            <input id="applicantEmail" name="applicantEmail" type="email" defaultValue={defaults?.applicantEmail} className="field" />
          </Field>
          <Field label="Preferred area" name="preferredLocation">
            <input id="preferredLocation" name="preferredLocation" defaultValue={defaults?.preferredLocation} className="field" />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-[20px]">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your organisation" name="organisation" error={state.errors?.organisation}>
            <input id="organisation" name="organisation" defaultValue={defaults?.organisation} className="field" />
          </Field>
          <Field label="Your job title" name="referrerJobTitle">
            <input id="referrerJobTitle" name="referrerJobTitle" className="field" />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-[20px]">Needs</h2>
        <Field label="Support categories" name="supportTypes">
          <CheckGroup
            name="supportTypes"
            selected={defaults?.supportTypes ?? []}
            options={SUPPORT_TYPES.map((t) => ({ value: t.slug, label: t.label }))}
            columns={3}
          />
        </Field>
        <Field label="Accommodation needs" name="accommodationNeeds">
          <textarea id="accommodationNeeds" name="accommodationNeeds" rows={4} defaultValue={defaults?.accommodationNeeds} className="field" />
        </Field>
        <Field label="Support needs" name="supportNeeds">
          <textarea id="supportNeeds" name="supportNeeds" rows={5} defaultValue={defaults?.supportNeeds} className="field" />
        </Field>
        <Field label="How urgent is this" name="urgency">
          <select id="urgency" name="urgency" defaultValue="MEDIUM" className="field">
            {Object.entries(URGENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Anything else the provider should know" name="additionalInfo">
          <textarea id="additionalInfo" name="additionalInfo" rows={4} className="field" />
        </Field>
        <Field
          label="Supporting documents"
          name="documents"
          hint="Assessments, risk assessments, support plans. Stored privately and only shown to the provider you refer to."
          error={state.errors?.documents}
        >
          <Dropzone name="documents" accept="application/pdf,image/*" hint="PDF or image, up to 15MB each" />
        </Field>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-[20px]">Before you share this referral</h2>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Consent is not the only possible lawful basis. Your organisation is responsible for deciding
          and documenting the appropriate UK GDPR basis for this disclosure. This selection records
          your declaration; it does not validate the legal basis or replace your case notes.
        </p>
        <Field label="Data-sharing basis assessed by your organisation" name="dataSharingBasis" error={state.errors?.dataSharingBasis}>
          <select id="dataSharingBasis" name="dataSharingBasis" defaultValue="" className="field">
            <option value="" disabled>Select a basis</option>
            <option value="CONSENT">Consent</option>
            <option value="CONTRACT">Contract</option>
            <option value="LEGAL_OBLIGATION">Legal obligation</option>
            <option value="VITAL_INTERESTS">Vital interests</option>
            <option value="PUBLIC_TASK">Public task</option>
            <option value="LEGITIMATE_INTERESTS">Legitimate interests</option>
            <option value="RECOGNISED_LEGITIMATE_INTERESTS">Recognised legitimate interests</option>
            <option value="OTHER">Other — explain in your organisation&apos;s records</option>
          </select>
        </Field>
        <p className="-mt-2 text-[13px] leading-relaxed text-ink-faint">
          If relying on consent, make sure it is valid for this specific sharing and retain your organisation&apos;s record of it. Consent may not be the right basis for every professional referral.
        </p>
        <label className="flex items-start gap-3 text-[14px] leading-relaxed">
          <input type="checkbox" name="dataSharingConfirmed" className="mt-1 h-4 w-4" />
          <span>I have authority to submit this referral, have given the person appropriate privacy information (or recorded why that is not possible), and have limited the details and documents to what is necessary for this housing referral.</span>
        </label>
        {state.errors?.dataSharingConfirmed && <p className="text-[14px] text-clay-dark">{state.errors.dataSharingConfirmed}</p>}
        <label className="flex items-start gap-3 text-[14px] leading-relaxed">
          <input type="checkbox" name="specialCategoryConditionConfirmed" className="mt-1 h-4 w-4" />
          <span>Where this referral includes health or other special-category data, or criminal-offence data, I have checked and documented the additional UK GDPR/DPA 2018 condition and safeguards that apply.</span>
        </label>
        {state.errors?.specialCategoryConditionConfirmed && <p className="text-[14px] text-clay-dark">{state.errors.specialCategoryConditionConfirmed}</p>}
        <p className="text-[13px] leading-relaxed text-ink-faint">
          The receiving provider and authorised RoomsNow reviewers can access the referral. See the <a href="/privacy" className="text-pine-dark underline">privacy notice</a>. Do not include information that is not needed.
        </p>
      </section>

      <SubmitButton pendingLabel="Sending…">Send referral</SubmitButton>
    </form>
  );
}
