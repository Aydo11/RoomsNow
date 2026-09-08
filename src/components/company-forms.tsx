"use client";
import { useActionState, useEffect, useState } from "react";

import { requestVerificationAction, updateCompanyAction } from "@/server/actions/company";
import { CheckGroup, Field, FormError, FormSuccess, SubmitButton } from "./ui";
import { ORG_TYPES, SUPPORT_TYPES } from "@/lib/taxonomy";
import {
  OPTIONAL_VERIFICATION_DOCUMENTS,
  REQUIRED_VERIFICATION_DOCUMENTS,
} from "@/lib/verification";

export function CompanyForm({
  company,
}: {
  company: {
    name: string;
    tradingName: string;
    registrationNumber: string;
    email: string;
    phone: string;
    website: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postcode: string;
    orgType: string;
    about: string;
    operatingAreas: string[];
    supportTypes: string[];
    logoUrl: string | null;
  };
}) {
  const [state, action] = useActionState(updateCompanyAction, { ok: false });

  return (
    <form action={action} className="card space-y-4 p-6">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <div className="flex items-center gap-4">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt="" className="h-16 w-16 rounded-[10px] object-contain" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-[10px] bg-paper-sunk text-[12px] text-ink-faint">
            No logo
          </span>
        )}
        <div className="flex-1">
          <Field label="Logo" name="logo" error={state.errors?.logo}>
            <input id="logo" name="logo" type="file" accept="image/*" className="field" />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organisation name" name="name" error={state.errors?.name}>
          <input id="name" name="name" defaultValue={company.name} className="field" />
        </Field>
        <Field label="Trading name" name="tradingName">
          <input id="tradingName" name="tradingName" defaultValue={company.tradingName} className="field" />
        </Field>
        <Field label="Organisation type" name="orgType">
          <select id="orgType" name="orgType" defaultValue={company.orgType} className="field">
            {Object.entries(ORG_TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Company or charity number" name="registrationNumber">
          <input id="registrationNumber" name="registrationNumber" defaultValue={company.registrationNumber} className="field" />
        </Field>
        <Field label="Contact email" name="email" error={state.errors?.email}>
          <input id="email" name="email" type="email" defaultValue={company.email} className="field" />
        </Field>
        <Field label="Contact phone" name="phone">
          <input id="phone" name="phone" defaultValue={company.phone} className="field" />
        </Field>
        <Field label="Website" name="website">
          <input id="website" name="website" defaultValue={company.website} className="field" />
        </Field>
        <Field label="Areas you cover" name="operatingAreas" hint="Separate with commas.">
          <input id="operatingAreas" name="operatingAreas" defaultValue={company.operatingAreas.join(", ")} className="field" />
        </Field>
        <Field label="Address line 1" name="addressLine1">
          <input id="addressLine1" name="addressLine1" defaultValue={company.addressLine1} className="field" />
        </Field>
        <Field label="Address line 2" name="addressLine2">
          <input id="addressLine2" name="addressLine2" defaultValue={company.addressLine2} className="field" />
        </Field>
        <Field label="Town or city" name="city">
          <input id="city" name="city" defaultValue={company.city} className="field" />
        </Field>
        <Field label="Postcode" name="postcode">
          <input id="postcode" name="postcode" defaultValue={company.postcode} className="field" />
        </Field>
      </div>

      <Field label="About your organisation" name="about">
        <textarea id="about" name="about" rows={6} defaultValue={company.about} className="field" />
      </Field>

      <Field label="Support you provide" name="supportTypes">
        <CheckGroup
          name="supportTypes"
          selected={company.supportTypes}
          options={SUPPORT_TYPES.map((t) => ({ value: t.slug, label: t.label }))}
          columns={3}
        />
      </Field>

      <SubmitButton pendingLabel="Saving…">Save company profile</SubmitButton>
    </form>
  );
}

export function VerificationForm() {
  const [state, action] = useActionState(requestVerificationAction, { ok: false });
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [note, setNote] = useState("");
  const [declaration, setDeclaration] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setSelectedFiles({});
      setInsuranceExpiry("");
      setNote("");
      setDeclaration(false);
    }
  }, [state.ok]);

  function rememberFiles(name: string, list: FileList | null) {
    setSelectedFiles((current) => ({ ...current, [name]: list ? Array.from(list) : [] }));
  }

  function submitWithRememberedFiles(formData: FormData) {
    // React can hand this callback a snapshot taken before controlled values have
    // finished syncing to the DOM. Send the values we display explicitly so the
    // server always receives the declaration and date the provider confirmed.
    formData.set("insuranceExpiry", insuranceExpiry);
    formData.set("note", note);
    if (declaration) formData.set("declaration", "1");
    else formData.delete("declaration");

    for (const [name, files] of Object.entries(selectedFiles)) {
      formData.delete(name);
      for (const file of files) formData.append(name, file);
    }
    action(formData);
  }

  function fileSummary(name: string) {
    const files = selectedFiles[name] ?? [];
    if (!files.length) return null;
    return <span className="mt-1 block text-[12px] font-medium text-pine-dark">Selected: {files.map((file) => file.name).join(", ")}</span>;
  }

  return (
    <form action={submitWithRememberedFiles} className="space-y-4">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <div className="rounded-card border border-pine/25 bg-pine-light/35 p-4 text-[14px] leading-relaxed text-ink-soft">
        Every required item is reviewed by a person. Files remain private and are available only to
        authorised company staff and the RoomsNow verification team.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {REQUIRED_VERIFICATION_DOCUMENTS.map((document) => (
          <Field
            key={document.input}
            label={document.label}
            name={document.input}
            hint={document.hint}
            required
            error={state.errors?.[document.input]}
          >
            <input
              id={document.input}
              name={document.input}
              type="file"
              onChange={(event) => rememberFiles(document.input, event.currentTarget.files)}
              accept="application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="field"
            />
            {fileSummary(document.input)}
          </Field>
        ))}
      </div>

      <Field
        label="Insurance expiry date"
        name="insuranceExpiry"
        hint="Your badge can be reviewed when this evidence expires."
        required
        error={state.errors?.insuranceExpiry}
      >
        <input
          id="insuranceExpiry"
          name="insuranceExpiry"
          type="date"
          required
          value={insuranceExpiry}
          onChange={(event) => setInsuranceExpiry(event.currentTarget.value)}
          className="field max-w-xs"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONAL_VERIFICATION_DOCUMENTS.map((document) => (
          <Field key={document.input} label={`${document.label} (if applicable)`} name={document.input} hint={document.hint}>
            <input
              id={document.input}
              name={document.input}
              type="file"
              onChange={(event) => rememberFiles(document.input, event.currentTarget.files)}
              accept="application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="field"
            />
            {fileSummary(document.input)}
          </Field>
        ))}
      </div>

      <Field label="Additional due-diligence evidence" name="additionalDocuments" hint="Optional policies, accreditations or commissioning evidence. Up to five files.">
        <input id="additionalDocuments" name="additionalDocuments" type="file" multiple onChange={(event) => rememberFiles("additionalDocuments", event.currentTarget.files)} accept="application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="field" />
        {fileSummary("additionalDocuments")}
      </Field>

      <Field label="Anything we should know" name="note">
        <textarea id="note" name="note" rows={3} value={note} onChange={(event) => setNote(event.currentTarget.value)} className="field" />
      </Field>

      <label className="flex items-start gap-3 rounded-card border border-line bg-paper p-4 text-[14px] leading-relaxed text-ink-soft">
        <input name="declaration" type="checkbox" value="1" required checked={declaration} onChange={(event) => setDeclaration(event.currentTarget.checked)} className="mt-1 h-4 w-4 accent-pine" />
        <span>
          I am authorised to submit this evidence. I confirm it is accurate, current and relates to
          this organisation, and I will tell RoomsNow if anything material changes.
        </span>
      </label>

      <SubmitButton pendingLabel="Submitting securely…">Submit due-diligence review</SubmitButton>
    </form>
  );
}
