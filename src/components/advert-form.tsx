"use client";

import { useEffect, useState, useActionState } from "react";
import { saveListingAction } from "@/server/actions/listings";
import { CheckGroup, Field, FormError, SubmitButton, Toggle } from "./ui";
import { clsx } from "@/lib/clsx";
import {
  ACCOMMODATION_TYPES,
  GENDER_ARRANGEMENTS,
  REFERRAL_ROUTES,
  SUPPORT_TYPES,
} from "@/lib/taxonomy";

export type AdvertDefaults = Partial<{
  id: string;
  propertyName: string;
  city: string;
  area: string;
  postcode: string;
  addressLine1: string;
  showExactAddress: boolean;
  title: string;
  summary: string;
  accommodationType: string;
  bedrooms: number;
  roomCount: number;
  ensuite: boolean;
  furnished: boolean;
  selfContained: boolean;
  sharedFacilities: boolean;
  wheelchairAccess: boolean;
  accessibilityNotes: string;
  weeklyRentFrom: string;
  weeklyRentTo: string;
  billsIncluded: boolean;
  housingBenefit: boolean;
  availableFrom: string;
  genderArrangement: string;
  minAge: string;
  maxAge: string;
  supportTypes: string[];
  supportDescription: string;
  supportAvailability: string;
  supportProvider: string;
  referralRoutes: string[];
  eligibility: string;
  referralProcess: string;
  houseRules: string;
  description: string;
}>;

const STEPS = ["Property", "Accommodation", "Support", "Description"];

export function AdvertForm({ defaults = {} }: { defaults?: AdvertDefaults }) {
  const [state, action] = useActionState(saveListingAction, { ok: false });
  const [step, setStep] = useState(0);
  const editing = Boolean(defaults.id);

  useEffect(() => {
    const errors = state.errors;
    if (!errors) return;
    if (errors.propertyName || errors.city || errors.postcode || errors.addressLine1) setStep(0);
    else if (errors.title || errors.weeklyRentFrom || errors.weeklyRentTo || errors.minAge || errors.maxAge) setStep(1);
    else if (errors.supportTypes) setStep(2);
    else if (Object.keys(errors).length) setStep(3);
  }, [state.errors]);

  return (
    <form action={action} className="space-y-6">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={clsx(
                "rounded-pill px-3 py-1.5 text-[13px]",
                i === step ? "bg-ink text-white" : "bg-paper-sunk text-ink-soft hover:text-ink",
              )}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <FormError message={state.errors?.form} />
      {state.errors && Object.keys(state.errors).some((key) => key !== "form") && (
        <p className="rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay-dark">
          Some details need attention. We&apos;ve opened the relevant section to fix.
        </p>
      )}

      {/* All steps stay mounted so a single submit carries every field. */}
      <section className={clsx("card space-y-4 p-6", step !== 0 && "hidden")}>
        <h2 className="text-[20px]">Where is it?</h2>
        <p className="text-[14px] text-ink-soft">
          Only the town and outward postcode are shown publicly, unless you choose otherwise.
        </p>
        <Field label="Property name" name="propertyName" hint="Internal and public reference, e.g. Bramble House." error={state.errors?.propertyName}>
          <input id="propertyName" name="propertyName" defaultValue={defaults.propertyName} className="field" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Town or city" name="city" error={state.errors?.city}>
            <input id="city" name="city" defaultValue={defaults.city} className="field" />
          </Field>
          <Field label="Area or neighbourhood" name="area">
            <input id="area" name="area" defaultValue={defaults.area} className="field" />
          </Field>
          <Field label="Postcode" name="postcode" error={state.errors?.postcode}>
            <input id="postcode" name="postcode" defaultValue={defaults.postcode} className="field" />
          </Field>
          <Field label="Address line 1" name="addressLine1" hint="Never shown unless you switch on the option below.">
            <input id="addressLine1" name="addressLine1" defaultValue={defaults.addressLine1} className="field" />
          </Field>
        </div>
        <Toggle
          name="showExactAddress"
          label="Show the full address publicly"
          description="Most providers leave this off for resident safety."
          defaultChecked={defaults.showExactAddress}
        />
      </section>

      <section className={clsx("card space-y-4 p-6", step !== 1 && "hidden")}>
        <h2 className="text-[20px]">The accommodation</h2>
        <Field label="Advert title" name="title" error={state.errors?.title}>
          <input id="title" name="title" defaultValue={defaults.title} className="field" />
        </Field>
        <Field label="One-line summary" name="summary">
          <input id="summary" name="summary" defaultValue={defaults.summary} className="field" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Accommodation type" name="accommodationType">
            <select id="accommodationType" name="accommodationType" defaultValue={defaults.accommodationType ?? "SHARED_ACCOMMODATION"} className="field">
              {Object.entries(ACCOMMODATION_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Bedrooms in the property" name="bedrooms">
            <input id="bedrooms" name="bedrooms" type="number" min={1} defaultValue={defaults.bedrooms ?? 1} className="field" />
          </Field>
          {!editing && (
            <Field label="Rooms to advertise" name="roomCount" hint="We'll create this many rooms you can track individually.">
              <input id="roomCount" name="roomCount" type="number" min={1} defaultValue={defaults.roomCount ?? 1} className="field" />
            </Field>
          )}
          <Field label="Available from" name="availableFrom">
            <input id="availableFrom" name="availableFrom" type="date" defaultValue={defaults.availableFrom} className="field" />
          </Field>
          <Field label="Weekly rent from (£)" name="weeklyRentFrom">
            <input id="weeklyRentFrom" name="weeklyRentFrom" type="number" step="0.01" min={0} defaultValue={defaults.weeklyRentFrom} className="field" />
          </Field>
          <Field label="Weekly rent to (£)" name="weeklyRentTo">
            <input id="weeklyRentTo" name="weeklyRentTo" type="number" step="0.01" min={0} defaultValue={defaults.weeklyRentTo} className="field" />
          </Field>
          <Field label="Household" name="genderArrangement">
            <select id="genderArrangement" name="genderArrangement" defaultValue={defaults.genderArrangement ?? "ANY"} className="field">
              {Object.entries(GENDER_ARRANGEMENTS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum age" name="minAge">
              <input id="minAge" name="minAge" type="number" min={16} defaultValue={defaults.minAge} className="field" />
            </Field>
            <Field label="Maximum age" name="maxAge">
              <input id="maxAge" name="maxAge" type="number" min={16} defaultValue={defaults.maxAge} className="field" />
            </Field>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle name="ensuite" label="En-suite rooms" defaultChecked={defaults.ensuite} />
          <Toggle name="furnished" label="Furnished" defaultChecked={defaults.furnished ?? true} />
          <Toggle name="selfContained" label="Self-contained" defaultChecked={defaults.selfContained} />
          <Toggle name="sharedFacilities" label="Shared facilities" defaultChecked={defaults.sharedFacilities ?? true} />
          <Toggle name="wheelchairAccess" label="Wheelchair accessible" defaultChecked={defaults.wheelchairAccess} />
          <Toggle name="billsIncluded" label="Bills included" defaultChecked={defaults.billsIncluded ?? true} />
          <Toggle name="housingBenefit" label="Benefits accepted (incl. Universal Credit)" defaultChecked={defaults.housingBenefit ?? true} />
        </div>

        <Field label="Accessibility notes" name="accessibilityNotes">
          <textarea id="accessibilityNotes" name="accessibilityNotes" rows={3} defaultValue={defaults.accessibilityNotes} className="field" />
        </Field>
      </section>

      <section className={clsx("card space-y-4 p-6", step !== 2 && "hidden")}>
        <h2 className="text-[20px]">Support and referrals</h2>
        <Field label="Support categories" name="supportTypes" error={state.errors?.supportTypes}>
          <CheckGroup
            name="supportTypes"
            selected={defaults.supportTypes ?? []}
            options={SUPPORT_TYPES.map((t) => ({ value: t.slug, label: t.label }))}
            columns={3}
          />
        </Field>
        <Field label="What support is provided" name="supportDescription">
          <textarea
            id="supportDescription"
            name="supportDescription"
            rows={5}
            defaultValue={defaults.supportDescription}
            placeholder={"e.g. Daily welfare checks, help with budgeting and benefits claims, support to register with a GP and access local services, and move-on planning towards independent living."}
            className="field"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support hours" name="supportAvailability" hint="e.g. 24/7 on site, or weekdays 9–5.">
            <input id="supportAvailability" name="supportAvailability" defaultValue={defaults.supportAvailability} className="field" />
          </Field>
          <Field label="Support delivered by" name="supportProvider">
            <input id="supportProvider" name="supportProvider" defaultValue={defaults.supportProvider} className="field" />
          </Field>
        </div>
        <Field label="How people can apply" name="referralRoutes">
          <CheckGroup
            name="referralRoutes"
            selected={defaults.referralRoutes ?? []}
            options={Object.entries(REFERRAL_ROUTES).map(([value, label]) => ({ value, label }))}
            columns={2}
          />
        </Field>
        <Field label="Referral process" name="referralProcess">
          <textarea id="referralProcess" name="referralProcess" rows={4} defaultValue={defaults.referralProcess} className="field" />
        </Field>
      </section>

      <section className={clsx("card space-y-4 p-6", step !== 3 && "hidden")}>
        <h2 className="text-[20px]">Full description</h2>
        <Field
          label="About the property"
          name="description"
          hint="Basic formatting is kept; scripts and styling are stripped. Up to 50,000 characters."
          error={state.errors?.description}
        >
          <textarea
            id="description"
            name="description"
            rows={12}
            defaultValue={defaults.description}
            placeholder={"e.g. A newly refurbished 6-bed supported house in a quiet residential street, five minutes' walk from the town centre and bus routes. Each room has its own lock, with a shared kitchen, lounge and garden. On-site support staff are based here during the day, with an on-call line overnight."}
            className="field"
          />
        </Field>
        <Field label="House rules" name="houseRules" hint="Up to 8,000 characters." error={state.errors?.houseRules}>
          <textarea id="houseRules" name="houseRules" rows={4} defaultValue={defaults.houseRules} className="field" />
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {step > 0 && (
          <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)}>Back</button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" className="btn-secondary" onClick={() => setStep((s) => s + 1)}>Next</button>
        )}
        {step === STEPS.length - 1 && (
          <SubmitButton pendingLabel="Saving…">
            {editing ? "Save changes" : "Save and add photos"}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
