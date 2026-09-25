"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import Link from "next/link";
import { saveListingAction, autosaveDraftListingAction } from "@/server/actions/listings";
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
  petsAllowed: boolean;
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

const DESCRIPTION_MAX = 50000;
const HOUSE_RULES_MAX = 8000;

export function AdvertForm({
  defaults = {},
  initialStep = 0,
}: {
  defaults?: AdvertDefaults;
  /** Opens the form on a given step (0-based), e.g. from an advert strength tip. */
  initialStep?: number;
}) {
  const [state, action] = useActionState(saveListingAction, { ok: false });
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), STEPS.length - 1));
  const [descriptionLength, setDescriptionLength] = useState(defaults.description?.length ?? 0);
  const [houseRulesLength, setHouseRulesLength] = useState(defaults.houseRules?.length ?? 0);
  const editing = Boolean(defaults.id);
  const formRef = useRef<HTMLFormElement>(null);
  // Recovery draft id from autosaveDraftListingAction — never set while
  // editing a real, already-published advert, only while posting a new one.
  const [draftId, setDraftId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const errors = state.errors;
    if (!errors) return;
    if (errors.propertyName || errors.city || errors.postcode || errors.addressLine1) setStep(0);
    else if (errors.title || errors.weeklyRentFrom || errors.weeklyRentTo || errors.minAge || errors.maxAge) setStep(1);
    else if (errors.supportTypes) setStep(2);
    else if (Object.keys(errors).length) setStep(3);
  }, [state.errors]);

  // The instant this form's action is submitted, React resets every
  // uncontrolled field back to its original defaultValue — before the action
  // even runs, and whether it succeeds or not (a native <form>.reset() call,
  // fired from inside React's own form-submission handling). The data it
  // sent to the server is unaffected (that's already captured), but the
  // fields on screen go blank, and any later validation error then reports
  // them as "required" even though the person filled them in correctly.
  // saveListingAction hands the rejected submission's values back as
  // `state.values` for exactly this reason; put them back onto the actual
  // DOM nodes once they arrive, since updating `defaultValue` alone never
  // touches an already-mounted uncontrolled input's current value.
  useEffect(() => {
    const values = state.values;
    const form = formRef.current;
    if (!values || !form) return;

    for (const [key, value] of Object.entries(values)) {
      const field = form.elements.namedItem(key);
      if (!field) continue;

      if (field instanceof RadioNodeList) {
        // A checkbox group sharing one name (supportTypes, referralRoutes).
        const selected = Array.isArray(value) ? value.map(String) : [];
        Array.from(field).forEach((node) => {
          if (node instanceof HTMLInputElement && node.type === "checkbox") {
            node.checked = selected.includes(node.value);
          }
        });
        continue;
      }

      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        field.checked = Boolean(value);
        continue;
      }

      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
      ) {
        field.value = value == null ? "" : String(value);
      }
    }

    // These two textareas track their own length in state for the character
    // counters, which a direct DOM write above doesn't trigger via onChange.
    if (typeof values.description === "string") setDescriptionLength(values.description.length);
    if (typeof values.houseRules === "string") setHouseRulesLength(values.houseRules.length);
  }, [state.values]);

  // Checkpoints the advert as a Draft under "My adverts" whenever the
  // provider moves between steps, so a crashed tab, refresh or dropped
  // session never loses their work. Never runs while editing an existing
  // advert — that already has a real, saved id. Best-effort: a failure here
  // never blocks navigating between steps, only the final submit matters.
  async function checkpointDraft() {
    if (editing || !formRef.current) return;
    const data = new FormData(formRef.current);
    const propertyName = String(data.get("propertyName") ?? "").trim();
    const city = String(data.get("city") ?? "").trim();
    const postcode = String(data.get("postcode") ?? "").trim();
    if (!propertyName || !city || !postcode) return;
    const title = String(data.get("title") ?? "").trim();
    try {
      const result = await autosaveDraftListingAction({ draftId, propertyName, city, postcode, title });
      if (result) setDraftId(result.draftId);
    } catch {
      // Ignored — the real submit below still saves everything properly.
    }
  }

  function goToStep(next: number) {
    void checkpointDraft();
    setStep(next);
  }

  return (
    <form ref={formRef} action={action} noValidate className="space-y-6">
      {(defaults.id ?? draftId) && <input type="hidden" name="id" value={defaults.id ?? draftId} />}

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => goToStep(i)}
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
      <p className="text-[13px] text-ink-faint">Fields marked <span className="text-clay">*</span> are required.</p>
      {!editing && draftId && (
        <p className="rounded-[10px] border border-line bg-paper-sunk/60 px-4 py-2 text-[13px] text-ink-soft">
          Saved as a draft as you go — if you don&apos;t finish now, pick it back up from{" "}
          <Link href="/provider/adverts" className="text-pine-dark underline">My adverts</Link>.
        </p>
      )}

      {/* All steps stay mounted so a single submit carries every field. */}
      <section className={clsx("card space-y-4 p-6", step !== 0 && "hidden")}>
        <h2 className="text-[20px]">Where is it?</h2>
        <p className="text-[14px] text-ink-soft">
          Only the town and outward postcode are shown publicly, unless you choose otherwise.
        </p>
        <Field label="Property name" name="propertyName" hint="Internal and public reference, e.g. Bramble House." error={state.errors?.propertyName} required>
          <input id="propertyName" name="propertyName" defaultValue={defaults.propertyName} className="field" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Town or city" name="city" error={state.errors?.city} required>
            <input id="city" name="city" defaultValue={defaults.city} className="field" />
          </Field>
          <Field label="Area or neighbourhood" name="area">
            <input id="area" name="area" defaultValue={defaults.area} className="field" />
          </Field>
          <Field label="Postcode" name="postcode" error={state.errors?.postcode} required>
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
        <Field label="Advert title" name="title" error={state.errors?.title} required>
          <input id="title" name="title" defaultValue={defaults.title} className="field" />
        </Field>
        <Field label="One-line summary" name="summary">
          <input id="summary" name="summary" defaultValue={defaults.summary} className="field" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Accommodation type" name="accommodationType">
            <select id="accommodationType" name="accommodationType" defaultValue={defaults.accommodationType ?? "SHARED_ACCOMMODATION"} className="field">
              {Object.entries(ACCOMMODATION_TYPES).filter(([value]) => value !== "SINGLE_ROOM").map(([value, label]) => (
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
          <Toggle name="petsAllowed" label="Pets allowed" defaultChecked={defaults.petsAllowed} />
          <Toggle name="billsIncluded" label="Bills included" defaultChecked={defaults.billsIncluded ?? true} />
          <Toggle name="housingBenefit" label="Benefits accepted (incl. Universal Credit)" defaultChecked={defaults.housingBenefit ?? true} />
        </div>

        <Field label="Accessibility notes" name="accessibilityNotes">
          <textarea id="accessibilityNotes" name="accessibilityNotes" rows={3} defaultValue={defaults.accessibilityNotes} className="field" />
        </Field>
      </section>

      <section className={clsx("card space-y-4 p-6", step !== 2 && "hidden")}>
        <h2 className="text-[20px]">Support and referrals</h2>
        <Field label="Support categories" name="supportTypes" error={state.errors?.supportTypes} required>
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
          hint="Basic formatting is kept; scripts and styling are stripped."
          error={state.errors?.description}
        >
          <textarea
            id="description"
            name="description"
            rows={12}
            defaultValue={defaults.description}
            onChange={(event) => setDescriptionLength(event.target.value.length)}
            placeholder={"e.g. A newly refurbished 6-bed supported house in a quiet residential street, five minutes' walk from the town centre and bus routes. Each room has its own lock, with a shared kitchen, lounge and garden. On-site support staff are based here during the day, with an on-call line overnight."}
            className="field"
          />
          <p
            className={clsx(
              "mt-1 text-right text-[12px] tabular-nums",
              descriptionLength > DESCRIPTION_MAX ? "text-clay" : descriptionLength > DESCRIPTION_MAX * 0.9 ? "text-amber-700" : "text-ink-faint",
            )}
          >
            {descriptionLength.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()} characters
          </p>
        </Field>
        <Field label="House rules" name="houseRules" error={state.errors?.houseRules}>
          <textarea
            id="houseRules"
            name="houseRules"
            rows={4}
            defaultValue={defaults.houseRules}
            onChange={(event) => setHouseRulesLength(event.target.value.length)}
            className="field"
          />
          <p
            className={clsx(
              "mt-1 text-right text-[12px] tabular-nums",
              houseRulesLength > HOUSE_RULES_MAX ? "text-clay" : houseRulesLength > HOUSE_RULES_MAX * 0.9 ? "text-amber-700" : "text-ink-faint",
            )}
          >
            {houseRulesLength.toLocaleString()} / {HOUSE_RULES_MAX.toLocaleString()} characters
          </p>
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {step > 0 && (
          <button type="button" className="btn-ghost" onClick={() => goToStep(step - 1)}>Back</button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" className="btn-secondary" onClick={() => goToStep(step + 1)}>Next</button>
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
