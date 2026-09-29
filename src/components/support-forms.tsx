"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  addSupportLocationAction,
  createSupportPostAction,
  saveSupportOrganisationAction,
} from "@/server/actions/support-directory";
import { SUPPORT_AUDIENCES, SUPPORT_CATEGORIES, SUPPORT_POST_KINDS } from "@/lib/support-directory";
import type { FormState } from "@/lib/validation";
import { CheckGroup, Field, FormError, FormSuccess, SubmitButton } from "./ui";

const initial: FormState = { ok: false };

export type OrganisationDefaults = Partial<{
  name: string;
  summary: string;
  description: string | null;
  categories: string[];
  scope: "NATIONAL" | "LOCAL";
  areas: string[];
  phone: string | null;
  phoneNote: string | null;
  otherPhones: string[];
  textNumber: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  howToAccess: string | null;
  crisis: boolean;
}>;

export function SupportOrganisationForm({ orgId, defaults = {}, isAdmin = false }: { orgId?: string; defaults?: OrganisationDefaults; isAdmin?: boolean }) {
  const [state, action] = useActionState(saveSupportOrganisationAction, initial);
  const errors = state.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {orgId && <input type="hidden" name="orgId" value={orgId} />}
      <FormError message={errors.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <Field label="Organisation or service name" name="name" error={errors.name} required>
        <input id="name" name="name" defaultValue={defaults.name} className="field" placeholder="e.g. KIKIT Pathways to Recovery" />
      </Field>
      <Field label="One-line summary" name="summary" error={errors.summary} hint="How you help, in a sentence. Shown on your card." required>
        <input id="summary" name="summary" defaultValue={defaults.summary} maxLength={200} className="field" placeholder="e.g. Free, confidential drug and alcohol support across Birmingham." />
      </Field>
      <Field label="Type of support" name="categories" error={errors.categories} required>
        <CheckGroup name="categories" selected={defaults.categories ?? []} options={SUPPORT_CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))} columns={3} />
      </Field>
      <Field label="More about your service" name="description" error={errors.description}>
        <textarea id="description" name="description" rows={5} defaultValue={defaults.description ?? ""} className="field" placeholder="Who you help, what you offer and what to expect when someone gets in touch." />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where you help" name="scope">
          <select id="scope" name="scope" defaultValue={defaults.scope ?? "LOCAL"} className="field">
            <option value="LOCAL">Specific towns or areas</option>
            <option value="NATIONAL">Anywhere in the UK</option>
          </select>
        </Field>
        <Field label="Towns or areas covered" name="areas" error={errors.areas} hint="Separate with commas, e.g. Birmingham, Solihull">
          <input id="areas" name="areas" defaultValue={defaults.areas?.join(", ")} className="field" />
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-card border border-line p-4">
        <legend className="px-1 text-[14px] font-semibold text-ink">How people contact you</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Main phone number" name="phone" error={errors.phone}>
            <input id="phone" name="phone" type="tel" defaultValue={defaults.phone ?? ""} className="field" />
          </Field>
          <Field label="Phone note" name="phoneNote" error={errors.phoneNote} hint="e.g. Free, 24 hours a day">
            <input id="phoneNote" name="phoneNote" defaultValue={defaults.phoneNote ?? ""} className="field" />
          </Field>
          <Field label="Text or WhatsApp" name="textNumber" error={errors.textNumber} hint="e.g. Text SHOUT to 85258">
            <input id="textNumber" name="textNumber" defaultValue={defaults.textNumber ?? ""} className="field" />
          </Field>
          <Field label="Email" name="email" error={errors.email}>
            <input id="email" name="email" type="email" defaultValue={defaults.email ?? ""} className="field" />
          </Field>
          <Field label="Website" name="website" error={errors.website}>
            <input id="website" name="website" defaultValue={defaults.website ?? ""} className="field" placeholder="www.example.org.uk" />
          </Field>
          <Field label="Opening hours" name="hours" error={errors.hours}>
            <input id="hours" name="hours" defaultValue={defaults.hours ?? ""} className="field" placeholder="e.g. 9am–5pm, Monday to Friday" />
          </Field>
        </div>
        <Field label="Other numbers" name="otherPhones" hint="One per line, e.g. Out of hours: 0121 000 0000">
          <textarea id="otherPhones" name="otherPhones" rows={2} defaultValue={defaults.otherPhones?.join("\n")} className="field" />
        </Field>
        <Field label="How to get help" name="howToAccess" error={errors.howToAccess} hint="Self-referral, drop-in, GP referral, age limits…">
          <textarea id="howToAccess" name="howToAccess" rows={2} defaultValue={defaults.howToAccess ?? ""} className="field" />
        </Field>
      </fieldset>

      {isAdmin && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="crisis" defaultChecked={defaults.crisis} className="h-4 w-4 rounded border-line-strong text-pine" />
          Pin as a crisis or emergency line
        </label>
      )}

      <SubmitButton pendingLabel="Saving…">{orgId ? "Save changes" : "Submit for approval"}</SubmitButton>
    </form>
  );
}

function useResetOnSuccess(state: FormState) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  return form;
}

export function SupportLocationForm({ orgId }: { orgId: string }) {
  const [state, action] = useActionState(addSupportLocationAction, initial);
  const form = useResetOnSuccess(state);
  const errors = state.errors ?? {};
  return (
    <form ref={form} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="orgId" value={orgId} />
      <FormError message={errors.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location name" name="loc-name" error={errors.name} required>
          <input id="loc-name" name="name" className="field" placeholder="e.g. City Centre hub" />
        </Field>
        <Field label="Street address" name="loc-address" error={errors.address} required>
          <input id="loc-address" name="address" className="field" />
        </Field>
        <Field label="Town or city" name="loc-city" error={errors.city} required>
          <input id="loc-city" name="city" className="field" />
        </Field>
        <Field label="Postcode" name="loc-postcode" error={errors.postcode} required>
          <input id="loc-postcode" name="postcode" className="field" />
        </Field>
        <Field label="Opening hours here" name="loc-hours" error={errors.hours}>
          <input id="loc-hours" name="hours" className="field" placeholder="e.g. Drop-in 10am–4pm" />
        </Field>
        <Field label="Phone for this location" name="loc-phone" error={errors.phone}>
          <input id="loc-phone" name="phone" type="tel" className="field" />
        </Field>
      </div>
      <SubmitButton className="btn-secondary" pendingLabel="Adding…">Add location</SubmitButton>
    </form>
  );
}

export function SupportPostForm({ orgId }: { orgId: string }) {
  const [state, action] = useActionState(createSupportPostAction, initial);
  const form = useResetOnSuccess(state);
  const errors = state.errors ?? {};
  return (
    <form ref={form} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="orgId" value={orgId} />
      <FormError message={errors.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What is it?" name="kind">
          <select id="kind" name="kind" defaultValue="TRAINING" className="field">
            {Object.entries(SUPPORT_POST_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Who is it for?" name="audience">
          <select id="audience" name="audience" defaultValue="everyone" className="field">
            {Object.entries(SUPPORT_AUDIENCES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Title" name="post-title" error={errors.title} required>
        <input id="post-title" name="title" className="field" placeholder="e.g. Free drug awareness training for housing staff" />
      </Field>
      <Field label="Details" name="post-body" error={errors.body} required>
        <textarea id="post-body" name="body" rows={5} className="field" placeholder="What it covers, who can come, how to book and anything to bring." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" name="startsAt" error={errors.startsAt} hint="Leave blank for news or ongoing services.">
          <input id="startsAt" name="startsAt" type="datetime-local" className="field" />
        </Field>
        <Field label="Ends" name="endsAt" error={errors.endsAt}>
          <input id="endsAt" name="endsAt" type="datetime-local" className="field" />
        </Field>
        <Field label="Venue or address" name="venue" error={errors.venue}>
          <input id="venue" name="venue" className="field" placeholder="e.g. 153 Stratford Road, Birmingham B11 1RD, or Online" />
        </Field>
        <Field label="Booking or info link" name="bookingUrl" error={errors.bookingUrl}>
          <input id="bookingUrl" name="bookingUrl" className="field" placeholder="https://" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" name="free" defaultChecked className="h-4 w-4 rounded border-line-strong text-pine" />
        It&apos;s free
      </label>
      <SubmitButton pendingLabel="Posting…">Post it</SubmitButton>
    </form>
  );
}
