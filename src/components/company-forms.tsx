"use client";
import { useActionState, useEffect, useState, type DragEvent } from "react";

import { requestVerificationAction, updateCompanyAction } from "@/server/actions/company";
import { AvatarDropzone } from "./avatar-dropzone";
import { SocialLinksField, type SocialLink } from "./social-links-field";
import { CheckGroup, Field, FormError, FormSuccess, SubmitButton } from "./ui";
import { ORG_TYPES, SUPPORT_TYPES } from "@/lib/taxonomy";
import {
  OPTIONAL_VERIFICATION_DOCUMENTS,
  REQUIRED_VERIFICATION_DOCUMENTS,
} from "@/lib/verification";

const DOCUMENT_ACCEPT = "application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function documentKind(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") return "PDF";
  if (file.type.startsWith("image/") || ["jpg", "jpeg", "png"].includes(extension ?? "")) return "IMG";
  if (file.type.includes("word") || ["doc", "docx"].includes(extension ?? "")) return "DOC";
  return "FILE";
}

function documentSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentIcon({ file }: { file: File }) {
  const kind = documentKind(file);
  const colour = kind === "PDF" ? "bg-clay-light text-clay-dark" : kind === "IMG" ? "bg-sky-100 text-sky-700" : "bg-pine-light text-pine-dark";

  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[8px] ${colour}`} aria-hidden="true">
      {kind === "IMG" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="m6.5 16.5 3.6-3.8 2.8 2.7 2.2-2 3.4 3.1M8.5 9h.01" />
        </svg>
      ) : kind === "FILE" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M7 2.75h6.5L19 8.25V21.25H7zM13.5 2.75v5.5H19" />
        </svg>
      ) : (
        <span className="text-[9px] font-extrabold tracking-tight">{kind === "DOC" ? "W" : "PDF"}</span>
      )}
    </span>
  );
}

function DocumentDropzone({
  id,
  name,
  files,
  multiple = false,
  required = false,
  onFiles,
}: {
  id: string;
  name: string;
  files: File[];
  multiple?: boolean;
  required?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function selectFiles(incoming: File[]) {
    const usable = incoming.filter((file) => file.size > 0);
    if (!multiple) {
      onFiles(usable.slice(0, 1));
      return;
    }

    const combined = [...files, ...usable].filter(
      (file, index, all) => all.findIndex((candidate) =>
        candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified,
      ) === index,
    );
    onFiles(combined.slice(0, 5));
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    selectFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={drop}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed px-4 py-5 text-center transition focus-within:ring-2 focus-within:ring-pine/30 ${
          dragging ? "border-pine bg-pine-light/70" : "border-line-strong bg-paper hover:border-pine/60 hover:bg-pine-light/25"
        }`}
      >
        <input
          id={id}
          name={name}
          type="file"
          multiple={multiple}
          accept={DOCUMENT_ACCEPT}
          aria-required={required || undefined}
          onChange={(event) => selectFiles(Array.from(event.currentTarget.files ?? []))}
          className="sr-only"
        />
        <span className="grid h-10 w-10 place-items-center rounded-full bg-pine-light text-pine-dark" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
            <path d="M5 14.5v4.75h14V14.5" />
          </svg>
        </span>
        <span className="mt-2 text-[14px] font-semibold text-ink">Drop {multiple ? "documents" : "a document"} here</span>
        <span className="mt-0.5 text-[12px] text-ink-faint">or click to browse · PDF, Word, JPG or PNG</span>
      </label>

      {files.length > 0 && (
        <ul className="mt-2 space-y-2" aria-live="polite">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 rounded-[10px] border border-line bg-white px-3 py-2">
              <DocumentIcon file={file} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{file.name}</span>
                <span className="block text-[11px] text-ink-faint">{documentKind(file)} · {documentSize(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => onFiles(files.filter((_, fileIndex) => fileIndex !== index))}
                className="rounded-[8px] px-2 py-1 text-[12px] text-ink-faint hover:bg-paper-sunk hover:text-clay"
                aria-label={`Remove ${file.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
    bannerUrl: string | null;
    socialLinks: SocialLink[];
  };
}) {
  const [state, action] = useActionState(updateCompanyAction, { ok: false });
  const [bannerPreview, setBannerPreview] = useState(company.bannerUrl);

  useEffect(() => {
    return () => {
      if (bannerPreview?.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  return (
    <form action={action} className="card space-y-4 p-6">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <div>
        <div className="relative h-40 overflow-hidden rounded-[14px] bg-gradient-to-br from-pine-dark to-pine-light">
          {bannerPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerPreview} alt="Provider banner preview" className="h-full w-full object-cover" />
          )}
          <label htmlFor="banner" className="btn absolute bottom-3 right-3 cursor-pointer bg-white/95 text-pine-dark shadow-raise hover:bg-white">
            Change banner
          </label>
          <input
            id="banner"
            name="banner"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) setBannerPreview(URL.createObjectURL(file));
            }}
          />
        </div>
        {state.errors?.banner && <p className="mt-1 text-[13px] text-clay" role="alert">{state.errors.banner}</p>}

        <div className="relative -mt-10 ml-5">
          <AvatarDropzone
            id="logo"
            name="logo"
            initialPreview={company.logoUrl}
            fallback={company.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}
            error={state.errors?.logo}
          />
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
          <input id="website" name="website" inputMode="url" placeholder="https://yourwebsite.co.uk" defaultValue={company.website} className="field" />
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

      <Field label="About your organisation" name="about" hint="Explain who you support, your approach, experience and what makes your accommodation suitable.">
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

      <div>
        <label className="label">Social media</label>
        <p className="mt-1 text-[13px] text-ink-faint">Shown on your public provider page.</p>
        <div className="mt-2">
          <SocialLinksField initial={company.socialLinks} error={state.errors?.socialUrl} />
        </div>
      </div>

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

  function rememberFiles(name: string, files: File[]) {
    setSelectedFiles((current) => ({ ...current, [name]: files }));
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
            <DocumentDropzone
              id={document.input}
              name={document.input}
              required
              files={selectedFiles[document.input] ?? []}
              onFiles={(files) => rememberFiles(document.input, files)}
            />
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
            <DocumentDropzone
              id={document.input}
              name={document.input}
              files={selectedFiles[document.input] ?? []}
              onFiles={(files) => rememberFiles(document.input, files)}
            />
          </Field>
        ))}
      </div>

      <Field label="Additional due-diligence evidence" name="additionalDocuments" hint="Optional policies, accreditations or commissioning evidence. Up to five files.">
        <DocumentDropzone
          id="additionalDocuments"
          name="additionalDocuments"
          multiple
          files={selectedFiles.additionalDocuments ?? []}
          onFiles={(files) => rememberFiles("additionalDocuments", files)}
        />
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
