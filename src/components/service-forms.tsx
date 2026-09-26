"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeServiceQuoteAsBusinessAction,
  deleteServiceEvidenceAction,
  replyToServiceReviewAction,
  respondToServiceQuoteAction,
  saveServiceAdvertAction,
  saveServiceProfileAction,
  setServiceAdvertStatusAction,
  submitServiceBusinessForReviewAction,
  uploadServiceEvidenceAction,
} from "@/server/actions/service-business";
import { SERVICE_CATEGORIES, EVIDENCE_LABELS, type ServiceAdvertStatusValue } from "@/lib/service-marketplace";
import type { FormState } from "@/lib/validation";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";
import { SocialLinksField, type SocialLink } from "./social-links-field";
import { clsx } from "@/lib/clsx";

const initial: FormState = { ok: false };

function useRedirectOnSuccess(state: FormState) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok && state.redirect) router.push(state.redirect);
  }, [state, router]);
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="card grid gap-4 p-5 sm:grid-cols-2">
      <legend className="sr-only">{title}</legend>
      <div className="sm:col-span-2">
        <h2 className="text-[18px]">{title}</h2>
        {hint && <p className="mt-1 text-[14px] text-ink-soft">{hint}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line bg-white p-3">
      <input id={name} type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-pine focus:ring-pine" />
      <span>
        <span className="block text-[15px] text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-ink-faint">{hint}</span>}
      </span>
    </label>
  );
}

// ------------------------------------------------------------------ profile

export type ServiceProfileValues = {
  name: string;
  tradingName: string | null;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  socialLinks: SocialLink[];
  companyNumber: string | null;
  categories: string[];
  areas: string[];
  postcodes: string[];
  nationalCoverage: boolean;
  basePostcode: string | null;
  radiusMiles: number | null;
  description: string | null;
  yearsExperience: number | null;
  openingHours: string | null;
  emergencyAvailable: boolean;
  pricingSummary: string | null;
  quoteOnly: boolean;
  terms: string | null;
  cancellationPolicy: string | null;
  responseTarget: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  portfolio: string[];
};

export function ServiceProfileForm({ values, maxAreas, portfolioLimit }: { values: ServiceProfileValues; maxAreas: number; portfolioLimit: number }) {
  const [state, action] = useActionState(saveServiceProfileAction, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-5">
      <FormError message={e.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <Section title="Your business" hint="Your registered name and company number are checked against Companies House. Only a 'Registered company' marker is shown publicly.">
        <Field label="Registered business name" name="name" required error={e.name}>
          <input id="name" name="name" defaultValue={values.name} required className="field" autoComplete="organization" />
        </Field>
        <Field label="Trading name" name="tradingName" hint="If different — this is the name providers see" error={e.tradingName}>
          <input id="tradingName" name="tradingName" defaultValue={values.tradingName ?? ""} className="field" />
        </Field>
        <Field label="Company registration number" name="companyNumber" hint="Leave blank if you're a sole trader" error={e.companyNumber}>
          <input id="companyNumber" name="companyNumber" defaultValue={values.companyNumber ?? ""} className="field uppercase" inputMode="text" />
        </Field>
        <Field label="Years of experience" name="yearsExperience" error={e.yearsExperience}>
          <input id="yearsExperience" name="yearsExperience" type="number" min={0} max={100} defaultValue={values.yearsExperience ?? ""} className="field" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="About your business" name="description" hint="What you do, who for, and what makes you reliable. At least 60 characters." error={e.description}>
            <textarea id="description" name="description" rows={6} maxLength={4000} defaultValue={values.description ?? ""} className="field" />
          </Field>
        </div>
      </Section>

      <Section title="Contact" hint="Hidden from anyone who isn't a paying accommodation provider.">
        <Field label="Contact person" name="contactName" required error={e.contactName}>
          <input id="contactName" name="contactName" defaultValue={values.contactName} required className="field" autoComplete="name" />
        </Field>
        <Field label="Business email" name="email" required error={e.email}>
          <input id="email" name="email" type="email" defaultValue={values.email} required className="field" autoComplete="email" />
        </Field>
        <Field label="Business phone" name="phone" error={e.phone}>
          <input id="phone" name="phone" type="tel" defaultValue={values.phone ?? ""} className="field" autoComplete="tel" />
        </Field>
        <Field label="Website" name="website" error={e.website}>
          <input id="website" name="website" type="url" defaultValue={values.website ?? ""} placeholder="https://" className="field" />
        </Field>
        <div className="sm:col-span-2">
          <SocialLinksField initial={values.socialLinks} error={e.socialLinks} />
        </div>
      </Section>

      <Section title="Services and coverage" hint={`Your plan covers up to ${maxAreas} named areas. Tick nationwide if you cover the whole UK.`}>
        <div className="sm:col-span-2">
          <p className="label">Service categories</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATEGORIES.map((category) => (
              <label key={category.slug} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-line bg-white px-3 py-2.5 text-[14px] hover:border-line-strong">
                <input type="checkbox" name="categories" value={category.slug} defaultChecked={values.categories.includes(category.slug)} className="h-4 w-4 rounded border-line-strong text-pine focus:ring-pine" />
                {category.label}
              </label>
            ))}
          </div>
          {e.categories && <p className="mt-1 text-[13px] text-clay" role="alert">{e.categories}</p>}
        </div>
        <Field label="Towns, cities or regions you cover" name="areas" hint="Separate with commas" error={e.areas}>
          <textarea id="areas" name="areas" rows={2} defaultValue={values.areas.join(", ")} className="field" placeholder="Walsall, Wolverhampton, Dudley" />
        </Field>
        <Field label="Postcode areas" name="postcodes" hint="Optional, e.g. WS1, WS2, B21" error={e.postcodes}>
          <textarea id="postcodes" name="postcodes" rows={2} defaultValue={values.postcodes.join(", ")} className="field uppercase" />
        </Field>
        <Field label="Base postcode" name="basePostcode" hint="Private. Used for radius searches only." error={e.basePostcode}>
          <input id="basePostcode" name="basePostcode" defaultValue={values.basePostcode ?? ""} className="field uppercase" autoComplete="postal-code" />
        </Field>
        <Field label="How far you travel (miles)" name="radiusMiles" error={e.radiusMiles}>
          <input id="radiusMiles" name="radiusMiles" type="number" min={0} max={300} defaultValue={values.radiusMiles ?? ""} className="field" />
        </Field>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          <Check name="nationalCoverage" label="We cover the whole UK" defaultChecked={values.nationalCoverage} />
          <Check name="emergencyAvailable" label="We take emergency call-outs" defaultChecked={values.emergencyAvailable} />
        </div>
      </Section>

      <Section title="How you work">
        <Field label="Opening hours" name="openingHours" error={e.openingHours}>
          <input id="openingHours" name="openingHours" defaultValue={values.openingHours ?? ""} placeholder="Mon–Fri 8am–6pm, Sat 9am–1pm" className="field" />
        </Field>
        <Field label="Typical response time" name="responseTarget" error={e.responseTarget}>
          <input id="responseTarget" name="responseTarget" defaultValue={values.responseTarget ?? ""} placeholder="Within 2 working hours" className="field" />
        </Field>
        <Field label="Pricing summary" name="pricingSummary" hint="e.g. Gas safety certificate from £60 per property" error={e.pricingSummary}>
          <textarea id="pricingSummary" name="pricingSummary" rows={2} defaultValue={values.pricingSummary ?? ""} className="field" />
        </Field>
        <div className="self-end">
          <Check name="quoteOnly" label="Most jobs are quoted individually" hint="Shows 'Request a quote' on your profile" defaultChecked={values.quoteOnly} />
        </div>
        <Field label="Terms of service" name="terms" error={e.terms}>
          <textarea id="terms" name="terms" rows={3} defaultValue={values.terms ?? ""} className="field" />
        </Field>
        <Field label="Cancellation policy" name="cancellationPolicy" error={e.cancellationPolicy}>
          <textarea id="cancellationPolicy" name="cancellationPolicy" rows={3} defaultValue={values.cancellationPolicy ?? ""} className="field" />
        </Field>
      </Section>

      <Section title="Images" hint={`Logo and cover are shown on your profile. Your plan includes up to ${portfolioLimit} portfolio photos. JPG, PNG or WebP up to 8MB.`}>
        <Field label="Logo" name="logo" error={e.logo}>
          {values.logoUrl && <img src={values.logoUrl} alt="Current logo" className="mb-2 h-14 w-14 rounded-[10px] border border-line object-cover" />}
          <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="field" />
        </Field>
        <Field label="Cover image" name="cover" error={e.cover}>
          {values.coverUrl && <img src={values.coverUrl} alt="Current cover" className="mb-2 h-14 w-full rounded-[10px] border border-line object-cover" />}
          <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="field" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Add portfolio photos" name="portfolio" error={e.portfolio}>
            <input id="portfolio" name="portfolio" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="field" />
          </Field>
          {values.portfolio.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {values.portfolio.map((image) => (
                <li key={image} className="space-y-1">
                  <img src={image} alt="" className="aspect-square w-full rounded-[8px] object-cover" />
                  <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                    <input type="checkbox" name="removePortfolio" value={image} className="h-3.5 w-3.5 rounded border-line-strong" />
                    Remove
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <div className="sticky bottom-3 z-10 flex justify-end">
        <SubmitButton className="btn-primary shadow-float" pendingLabel="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ evidence

export function EvidenceUploadForm() {
  const [state, action] = useActionState(uploadServiceEvidenceAction, initial);
  const [type, setType] = useState("PUBLIC_LIABILITY");
  const e = state.errors ?? {};
  const needsExpiry = ["PUBLIC_LIABILITY", "EMPLOYERS_LIABILITY", "LICENCE"].includes(type);
  return (
    <form action={action} key={state.ok ? state.message : "form"} className="card grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-[18px]">Upload a document</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          Documents are private. Only RoomsNow&apos;s verification team can open them, and every view is logged. Providers only ever see what a document is, who
          issued it and when it expires.
        </p>
      </div>
      <FormError message={e.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <Field label="Document type" name="type" required error={e.type}>
        <select id="type" name="type" className="field" value={type} onChange={(event) => setType(event.target.value)}>
          {Object.entries(EVIDENCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>
      <Field label="Name shown to providers" name="label" required hint="e.g. Public liability £5m, Gas Safe registered" error={e.label}>
        <input id="label" name="label" required className="field" />
      </Field>
      <Field label="Issued by" name="issuer" hint="Insurer, awarding body or register" error={e.issuer}>
        <input id="issuer" name="issuer" className="field" />
      </Field>
      <Field label="Policy or registration number" name="reference" hint="Private — never shown publicly" error={e.reference}>
        <input id="reference" name="reference" className="field" />
      </Field>
      <Field label={needsExpiry ? "Expiry date" : "Expiry date (if any)"} name="expiresAt" required={needsExpiry} error={e.expiresAt}>
        <input id="expiresAt" name="expiresAt" type="date" required={needsExpiry} className="field" />
      </Field>
      <Field label="File" name="file" required hint="PDF, JPG, PNG or Word, up to 15MB" error={e.file}>
        <input id="file" name="file" type="file" required accept="application/pdf,image/jpeg,image/png,.doc,.docx" className="field" />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Uploading…">Upload document</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteEvidenceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => deleteServiceEvidenceAction(id))} className="text-[13px] text-clay underline underline-offset-2 disabled:opacity-50">
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function SubmitBusinessForReviewForm({ disabled }: { disabled?: boolean }) {
  const [state, action] = useActionState(submitServiceBusinessForReviewAction, initial);
  return (
    <form action={action} className="space-y-3">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      {!state.ok && <SubmitButton disabled={disabled} pendingLabel="Sending…">Send for verification</SubmitButton>}
    </form>
  );
}

// ------------------------------------------------------------------ adverts

export type ServiceAdvertValues = {
  id?: string;
  status?: ServiceAdvertStatusValue;
  title: string;
  category: string;
  subcategory: string | null;
  description: string;
  locations: string[];
  nationwide: boolean;
  priceType: string;
  priceFrom: number | null;
  priceTo: number | null;
  priceUnit: string | null;
  availability: string | null;
  emergency: boolean;
  sameDay: boolean;
  qualifications: string | null;
  website: string | null;
  images: string[];
};

const pounds = (pence: number | null) => (pence === null ? "" : (pence / 100).toFixed(pence % 100 ? 2 : 0));

export function ServiceAdvertForm({ values, maxAreas, canSubmit }: { values: ServiceAdvertValues; maxAreas: number; canSubmit: boolean }) {
  const [state, action] = useActionState(saveServiceAdvertAction, initial);
  useRedirectOnSuccess(state);
  const [category, setCategory] = useState(values.category || SERVICE_CATEGORIES[0].slug);
  const [priceType, setPriceType] = useState(values.priceType || "QUOTE");
  const e = state.errors ?? {};
  const subcategories = SERVICE_CATEGORIES.find((c) => c.slug === category)?.subcategories ?? [];
  const isNew = !values.id;
  const isDraft = isNew || values.status === "DRAFT";

  return (
    <form action={action} className="space-y-5">
      {values.id && <input type="hidden" name="advertId" value={values.id} />}
      <FormError message={e.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <Section title="The service">
        <div className="sm:col-span-2">
          <Field label="Advert title" name="title" required hint="Say what you do and where, e.g. 'Gas safety certificates for HMOs across the Black Country'" error={e.title}>
            <input id="title" name="title" defaultValue={values.title} required maxLength={100} className="field" />
          </Field>
        </div>
        <Field label="Category" name="category" required error={e.category}>
          <select id="category" name="category" className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Type of service" name="subcategory" error={e.subcategory}>
          <select id="subcategory" name="subcategory" className="field" defaultValue={values.subcategory ?? ""} key={category}>
            <option value="">General</option>
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" name="description" required hint="What's included, how you work with supported housing, turnaround times. At least 60 characters." error={e.description}>
            <textarea id="description" name="description" rows={7} maxLength={5000} defaultValue={values.description} required className="field" />
          </Field>
        </div>
        <Field label="Qualifications for this service" name="qualifications" hint="e.g. Gas Safe registered engineers, NICEIC approved" error={e.qualifications}>
          <textarea id="qualifications" name="qualifications" rows={2} defaultValue={values.qualifications ?? ""} className="field" />
        </Field>
        <Field label="Availability" name="availability" hint="e.g. Weekdays, most jobs booked within 5 days" error={e.availability}>
          <textarea id="availability" name="availability" rows={2} defaultValue={values.availability ?? ""} className="field" />
        </Field>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          <Check name="emergency" label="Emergency call-outs" defaultChecked={values.emergency} />
          <Check name="sameDay" label="Same-day service available" defaultChecked={values.sameDay} />
        </div>
      </Section>

      <Section title="Where" hint={`Up to ${maxAreas} areas on your plan.`}>
        <Field label="Towns or areas" name="locations" hint="Separate with commas" error={e.locations}>
          <textarea id="locations" name="locations" rows={2} defaultValue={values.locations.join(", ")} className="field" placeholder="Walsall, Wolverhampton" />
        </Field>
        <div className="self-end">
          <Check name="nationwide" label="Available nationwide" defaultChecked={values.nationwide} />
        </div>
      </Section>

      <Section title="Price" hint="Prices are a guide. Jobs are agreed directly with each provider.">
        <Field label="How you price" name="priceType" error={e.priceType}>
          <select id="priceType" name="priceType" className="field" value={priceType} onChange={(event) => setPriceType(event.target.value)}>
            <option value="QUOTE">Quote only</option>
            <option value="FIXED">Fixed price</option>
            <option value="FROM">From a price</option>
            <option value="RANGE">Price range</option>
            <option value="HOURLY">Hourly rate</option>
          </select>
        </Field>
        {priceType !== "QUOTE" && (
          <Field label={priceType === "RANGE" ? "From (£)" : priceType === "HOURLY" ? "Per hour (£)" : "Price (£)"} name="priceFrom" required error={e.priceFrom}>
            <input id="priceFrom" name="priceFrom" inputMode="decimal" defaultValue={pounds(values.priceFrom)} className="field" />
          </Field>
        )}
        {priceType === "RANGE" && (
          <Field label="To (£)" name="priceTo" required error={e.priceTo}>
            <input id="priceTo" name="priceTo" inputMode="decimal" defaultValue={pounds(values.priceTo)} className="field" />
          </Field>
        )}
        {priceType !== "QUOTE" && priceType !== "HOURLY" && (
          <Field label="Per" name="priceUnit" hint="e.g. per certificate, per room" error={e.priceUnit}>
            <input id="priceUnit" name="priceUnit" defaultValue={values.priceUnit ?? ""} className="field" />
          </Field>
        )}
        <Field label="Website for this service" name="website" error={e.website}>
          <input id="website" name="website" type="url" defaultValue={values.website ?? ""} placeholder="https://" className="field" />
        </Field>
      </Section>

      <Section title="Photos" hint="Up to 6. JPG, PNG or WebP. Don't include residents or anything that identifies an address.">
        <div className="sm:col-span-2">
          <Field label="Add photos" name="images" error={e.images}>
            <input id="images" name="images" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="field" />
          </Field>
          {values.images.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {values.images.map((image) => (
                <li key={image} className="space-y-1">
                  <img src={image} alt="" className="aspect-square w-full rounded-[8px] object-cover" />
                  <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                    <input type="checkbox" name="removeImages" value={image} className="h-3.5 w-3.5 rounded border-line-strong" />
                    Remove
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="max-w-[60ch] text-[13px] text-ink-soft">
          {isDraft
            ? "Every advert is checked by our team before providers can see it."
            : "Saving changes sends this advert back to our team for a quick check. It's hidden until it's approved again."}
        </p>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <SubmitButton className="btn-secondary" name="intent" value="draft" pendingLabel="Saving…">
              Save draft
            </SubmitButton>
          )}
          <SubmitButton name="intent" value="submit" pendingLabel="Sending…" disabled={!canSubmit && isDraft}>
            {isDraft ? "Send for review" : "Save and send for review"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

const STATUS_ACTIONS: Partial<Record<ServiceAdvertStatusValue, Array<{ to: ServiceAdvertStatusValue; label: string; tone?: "danger" }>>> = {
  DRAFT: [{ to: "ARCHIVED", label: "Archive", tone: "danger" }],
  PENDING_REVIEW: [{ to: "DRAFT", label: "Withdraw to draft" }, { to: "ARCHIVED", label: "Archive", tone: "danger" }],
  ACTIVE: [{ to: "PAUSED", label: "Pause" }, { to: "ARCHIVED", label: "Archive", tone: "danger" }],
  PAUSED: [{ to: "ACTIVE", label: "Resume" }, { to: "ARCHIVED", label: "Archive", tone: "danger" }],
  REJECTED: [{ to: "ARCHIVED", label: "Archive", tone: "danger" }],
  ARCHIVED: [{ to: "PENDING_REVIEW", label: "Restore and send for review" }],
};

export function ServiceAdvertStatusButtons({ id, status }: { id: string; status: ServiceAdvertStatusValue }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const options = STATUS_ACTIONS[status] ?? [];
  if (!options.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          key={option.to}
          type="button"
          disabled={pending}
          className={clsx("btn-secondary min-h-9 px-3 py-1.5 text-[13px]", option.tone === "danger" && "text-clay")}
          onClick={() =>
            start(async () => {
              const result = await setServiceAdvertStatusAction(id, option.to);
              setMessage(result.message);
              router.refresh();
            })
          }
        >
          {option.label}
        </button>
      ))}
      {message && <span className="text-[13px] text-ink-soft" role="status">{message}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ quotes and reviews

export function QuoteResponseForm({ quoteId, canQuote, canDecline, hasQuote }: { quoteId: string; canQuote: boolean; canDecline: boolean; hasQuote: boolean }) {
  const [state, action] = useActionState(respondToServiceQuoteAction, initial);
  const [decision, setDecision] = useState<"quote" | "decline">(canQuote ? "quote" : "decline");
  const e = state.errors ?? {};
  if (!canQuote && !canDecline) return null;
  return (
    <form action={action} className="card space-y-4 p-5">
      <input type="hidden" name="quoteId" value={quoteId} />
      <h2 className="text-[18px]">{hasQuote ? "Revise your quote" : "Respond"}</h2>
      <FormError message={e.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Your response">
        {canQuote && (
          <label className={clsx("chip cursor-pointer", decision === "quote" && "chip-active")}>
            <input type="radio" name="decision" value="quote" checked={decision === "quote"} onChange={() => setDecision("quote")} className="sr-only" />
            Send a quote
          </label>
        )}
        {canDecline && (
          <label className={clsx("chip cursor-pointer", decision === "decline" && "chip-active")}>
            <input type="radio" name="decision" value="decline" checked={decision === "decline"} onChange={() => setDecision("decline")} className="sr-only" />
            Decline
          </label>
        )}
      </div>
      {decision === "quote" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quote (£)" name="amount" required error={e.amount}>
            <input id="amount" name="amount" inputMode="decimal" required className="field" />
          </Field>
          <Field label="Valid until" name="validUntil" error={e.validUntil}>
            <input id="validUntil" name="validUntil" type="date" className="field" />
          </Field>
        </div>
      )}
      <Field label={decision === "quote" ? "What's included" : "Reason (optional)"} name="note" error={e.note}>
        <textarea id="note" name="note" rows={4} maxLength={2000} className="field" placeholder={decision === "quote" ? "Labour, parts, certificates, timescales, and anything that isn't included." : "e.g. We don't cover that area."} />
      </Field>
      <p className="text-[12.5px] text-ink-faint">Your response is also posted in your message thread with this provider. Payment and terms are agreed directly between you.</p>
      <SubmitButton pendingLabel="Sending…">{decision === "quote" ? (hasQuote ? "Send revised quote" : "Send quote") : "Decline request"}</SubmitButton>
    </form>
  );
}

export function CompleteQuoteButton({ quoteId }: { quoteId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={pending} className="btn-secondary" onClick={() => start(async () => { await completeServiceQuoteAsBusinessAction(quoteId); router.refresh(); })}>
      {pending ? "Saving…" : "Mark job complete"}
    </button>
  );
}

export function ServiceReviewReplyForm({ reviewId, initialReply }: { reviewId: string; initialReply: string | null }) {
  const [state, action] = useActionState(replyToServiceReviewAction, initial);
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <label htmlFor={`reply-${reviewId}`} className="label">Your public reply</label>
      <textarea id={`reply-${reviewId}`} name="reply" rows={3} maxLength={800} defaultValue={initialReply ?? ""} className="field" />
      <FormError message={state.errors?.form ?? state.errors?.reply} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <SubmitButton className="btn-secondary" pendingLabel="Saving…">{initialReply ? "Update reply" : "Publish reply"}</SubmitButton>
    </form>
  );
}
