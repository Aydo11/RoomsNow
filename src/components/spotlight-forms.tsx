"use client";

import { useActionState, useState } from "react";
import { addSpotlightAction, buySpotlightAction } from "@/server/actions/spotlight";
import { formatPounds, SPOTLIGHT_LIMITS, SPOTLIGHT_PACKAGES, type SpotlightPackage } from "@/lib/spotlight";
import { SpotlightCard } from "./home-spotlight";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

function TextFields({ errors, headline, body, setHeadline, setBody }: { errors?: Record<string, string>; headline: string; body: string; setHeadline: (v: string) => void; setBody: (v: string) => void }) {
  return (
    <>
      <Field label="Headline" name="headline" error={errors?.headline} hint={`${headline.length}/${SPOTLIGHT_LIMITS.headline} characters`} required>
        <input id="headline" name="headline" className="field" maxLength={SPOTLIGHT_LIMITS.headline} required value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Gas safety certificates across Birmingham, next-day visits" />
      </Field>
      <Field label="Short description" name="body" error={errors?.body} hint={`${body.length}/${SPOTLIGHT_LIMITS.body} characters. No links: the spotlight opens your RoomsNow profile.`} required>
        <textarea id="body" name="body" className="field min-h-[96px]" maxLength={SPOTLIGHT_LIMITS.body} required value={body} onChange={(e) => setBody(e.target.value)} placeholder="What you offer and who it's for." />
      </Field>
    </>
  );
}

/** Organisation buys a spotlight: write it, see exactly how it will look, pay. */
export function BuySpotlightForm({ orgName, logoUrl }: { orgName: string; logoUrl: string | null }) {
  const [state, action] = useActionState(buySpotlightAction, { ok: false });
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [pkg, setPkg] = useState<SpotlightPackage>("MONTH");
  return (
    <form action={action} className="space-y-5">
      <FormError message={state.errors?.form} />
      <TextFields errors={state.errors} headline={headline} body={body} setHeadline={setHeadline} setBody={setBody} />
      <fieldset>
        <legend className="label">How long</legend>
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          {(Object.keys(SPOTLIGHT_PACKAGES) as SpotlightPackage[]).map((key) => (
            <label key={key} className={`flex cursor-pointer items-center justify-between gap-3 rounded-card border p-4 ${pkg === key ? "border-pine bg-pine-light/50" : "border-line bg-white"}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="package" value={key} checked={pkg === key} onChange={() => setPkg(key)} />
                <span className="font-semibold">{SPOTLIGHT_PACKAGES[key].label}</span>
              </span>
              <span className="font-bold tabular-nums">{formatPounds(SPOTLIGHT_PACKAGES[key].amount)}</span>
            </label>
          ))}
        </div>
        {state.errors?.package && <p className="mt-1 text-[13px] text-clay" role="alert">{state.errors.package}</p>}
      </fieldset>
      <div>
        <p className="label">Preview</p>
        <SpotlightCard preview item={{ id: "preview", orgName, logoUrl, href: "#", headline, body }} />
      </div>
      <SubmitButton className="btn-primary w-full sm:w-auto" pendingLabel="Opening secure payment…">
        Pay {formatPounds(SPOTLIGHT_PACKAGES[pkg].amount)} and go live
      </SubmitButton>
      <p className="text-[13px] text-ink-faint">Paid securely by card through Stripe. Your spotlight goes live as soon as payment clears and is always labelled as sponsored.</p>
    </form>
  );
}

/** Admin places any approved service business in the spotlight for free. */
export function AddSpotlightForm({ orgs }: { orgs: Array<{ value: string; label: string; group: string }> }) {
  const [state, action] = useActionState(addSpotlightAction, { ok: false });
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const groups = [...new Set(orgs.map((org) => org.group))];
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-lg">Add a service</h2>
      <FormSuccess message={state.ok ? state.message : undefined} />
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Service business" name="org" error={state.errors?.org} required>
          <select id="org" name="org" className="field" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {orgs.filter((org) => org.group === group).map((org) => <option key={org.value} value={org.value}>{org.label}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Days" name="days" error={state.errors?.days} required>
          <input id="days" name="days" type="number" min={1} max={365} defaultValue={30} className="field" required />
        </Field>
      </div>
      <TextFields errors={state.errors} headline={headline} body={body} setHeadline={setHeadline} setBody={setBody} />
      <SubmitButton pendingLabel="Adding…">Add to spotlight (free)</SubmitButton>
    </form>
  );
}
