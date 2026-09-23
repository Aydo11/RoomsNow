"use client";

import { useActionState } from "react";
import { saveAssessmentAction } from "@/server/actions/clients";
import { CheckGroup, Field, FormError, FormSuccess, SubmitButton } from "./ui";
import { ACCOMMODATION_TYPES, GENDER_ARRANGEMENTS } from "@/lib/taxonomy";
import {
  FACILITIES,
  FUNDING,
  GENDERS,
  LEVELS,
  MAPPA,
  NEED_AREAS,
  NEED_LEVELS,
  RISK_AREAS,
  SUPPORT_LEVELS,
  type Assessment,
} from "@/lib/assessment";

function Choice({ name, options, value, placeholder = "Not recorded" }: { name: string; options: Record<string, string>; value?: string; placeholder?: string }) {
  return (
    <select id={name} name={name} defaultValue={value ?? ""} className="field">
      <option value="">{placeholder}</option>
      {Object.entries(options).map(([k, label]) => (
        <option key={k} value={k}>{label}</option>
      ))}
    </select>
  );
}

/** A compact row of radio pills for a single rating, with "not recorded" as the default. */
function Rating({ name, label, options, value }: { name: string; label: string; options: Record<string, string>; value?: string }) {
  return (
    <fieldset className="grid gap-2 border-b border-line py-3 last:border-0 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
      <legend className="sr-only">{label}</legend>
      <span className="text-[14px] text-ink" aria-hidden="true">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {[["", "Not recorded"], ...Object.entries(options)].map(([k, text]) => (
          <label key={k || "none"} className="cursor-pointer">
            <input type="radio" name={name} value={k} defaultChecked={(value ?? "") === k} className="peer sr-only" />
            <span className="inline-block rounded-pill border border-line bg-white px-3 py-1.5 text-[13px] text-ink-soft transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-pine/40">
              {text}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AssessmentForm({ clientId, firstName, value }: { clientId: string; firstName: string; value: Assessment }) {
  const [state, action] = useActionState(saveAssessmentAction, { ok: false });

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="clientId" value={clientId} />
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="text-[20px]">Where and when</h2>
          <p className="mt-1 text-[14px] text-ink-soft">Used to rank adverts by location and availability.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px_180px]">
          <Field label="Preferred areas" name="areas" hint="Towns, areas or postcodes, separated by commas.">
            <input id="areas" name="areas" defaultValue={value.areas?.join(", ")} className="field" placeholder="Handsworth, B21, Walsall" />
          </Field>
          <Field label="Within (miles)" name="radiusMiles">
            <input id="radiusMiles" name="radiusMiles" type="number" min={1} max={100} defaultValue={value.radiusMiles} className="field" placeholder="10" />
          </Field>
          <Field label="Needs to move by" name="moveBy">
            <input id="moveBy" name="moveBy" type="date" defaultValue={value.moveBy} className="field" />
          </Field>
        </div>
        <Field label="Types of accommodation that would work" name="accommodationTypes">
          <CheckGroup
            name="accommodationTypes"
            columns={3}
            selected={value.accommodationTypes}
            options={Object.entries(ACCOMMODATION_TYPES).map(([v, l]) => ({ value: v, label: l }))}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gender" name="gender" hint="Only used to rule out single-sex houses that wouldn't fit.">
            <Choice name="gender" options={GENDERS} value={value.gender} />
          </Field>
          <Field label="Household preference" name="household">
            <Choice name="household" options={GENDER_ARRANGEMENTS} value={value.household} />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="text-[20px]">Room and money</h2>
          <p className="mt-1 text-[14px] text-ink-soft">Matched against each room, so the best room in a house is picked for {firstName}.</p>
        </div>
        <Field label="Needs" name="facilities">
          {/* Sentinel so "none of these" is saved as an answer rather than "not recorded". */}
          <input type="hidden" name="facilities" value="" />
          <CheckGroup name="facilities" columns={3} selected={value.facilities} options={Object.entries(FACILITIES).map(([v, l]) => ({ value: v, label: l }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How rent is paid" name="funding">
            <Choice name="funding" options={FUNDING} value={value.funding} />
          </Field>
          <Field label="Maximum rent (£ per week)" name="maxWeeklyRent">
            <input id="maxWeeklyRent" name="maxWeeklyRent" type="number" min={1} defaultValue={value.maxWeeklyRent} className="field" placeholder="e.g. 250" />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="text-[20px]">Support needs</h2>
          <p className="mt-1 text-[14px] text-ink-soft">How much help {firstName} needs day to day.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Field label="Level of support" name="supportLevel">
            <Choice name="supportLevel" options={SUPPORT_LEVELS} value={value.supportLevel} />
          </Field>
          <Field label="Hours a week" name="supportHours">
            <input id="supportHours" name="supportHours" type="number" min={0} max={168} defaultValue={value.supportHours} className="field" />
          </Field>
        </div>
        <div>
          {(Object.keys(NEED_AREAS) as (keyof typeof NEED_AREAS)[]).map((key) => (
            <Rating key={key} name={`need_${key}`} label={NEED_AREAS[key]} options={NEED_LEVELS} value={value.needs?.[key]} />
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="text-[20px]">Risk assessment</h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            Private to you. It never lowers a match on its own — medium and high risks show as flags to discuss with the
            provider. Nothing here is shared unless you choose to share it.
          </p>
        </div>
        <div>
          {(Object.keys(RISK_AREAS) as (keyof typeof RISK_AREAS)[]).map((key) => (
            <Rating key={key} name={`risk_${key}`} label={RISK_AREAS[key]} options={LEVELS} value={value.risks?.[key]} />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="MAPPA" name="mappa">
            <Choice name="mappa" options={MAPPA} value={value.mappa} />
          </Field>
          <Field label="On probation or licence" name="probation">
            <Choice name="probation" options={{ yes: "Yes", no: "No" }} value={value.probation === undefined ? undefined : value.probation ? "yes" : "no"} />
          </Field>
        </div>
        <Field label="Risk summary" name="riskSummary" hint="Context, dates and who else is involved.">
          <textarea id="riskSummary" name="riskSummary" rows={3} defaultValue={value.riskSummary} className="field" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Triggers and early warning signs" name="triggers">
            <textarea id="triggers" name="triggers" rows={3} defaultValue={value.triggers} className="field" />
          </Field>
          <Field label="What helps" name="whatHelps" hint="Strategies that reduce risk or support recovery.">
            <textarea id="whatHelps" name="whatHelps" rows={3} defaultValue={value.whatHelps} className="field" />
          </Field>
        </div>
        <Field label={`${firstName}'s goals`} name="goals">
          <textarea id="goals" name="goals" rows={2} defaultValue={value.goals} className="field" />
        </Field>
      </section>

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">Save assessment</SubmitButton>
        <SubmitButton name="then" value="matches" className="btn-secondary" pendingLabel="Saving…">
          Save and see matches
        </SubmitButton>
      </div>
    </form>
  );
}
