"use client";

import Link from "next/link";
import { useState } from "react";
import { BIRMINGHAM_WEEKLY_LHA, BIRMINGHAM_MONTHLY_UC_LHA, LHA_LOOKUP, UC_LHA_SOURCE, rentCapEstimate } from "@/lib/housing-costs";

const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);

export function HousingCostCalculator({ currentRates }: { currentRates: boolean }) {
  const [housing, setHousing] = useState("private");
  const [benefit, setBenefit] = useState<"UC" | "HB">("UC");
  const [rent, setRent] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [cap, setCap] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [category, setCategory] = useState("0");
  const exampleRates = BIRMINGHAM_WEEKLY_LHA.map((rate, index) => ({ label: rate.label, amount: benefit === "HB" ? rate.amount : BIRMINGHAM_MONTHLY_UC_LHA[index] }));
  const numeric = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : NaN;
  const result = housing === "private" && confirmed && rent && cap ? rentCapEstimate(numeric(rent), period, numeric(cap), benefit) : null;

  return <div className="grid items-start gap-6 lg:grid-cols-2">
    <section className="card space-y-5 p-5 sm:p-7" aria-label="Rent cap calculator">
      <h2 className="text-[23px]">Check your rent against the LHA cap</h2>
      <label className="block"><span className="label">Accommodation</span><select className="field mt-2" value={housing} onChange={(event) => setHousing(event.target.value)}><option value="private">Private rental / ordinary HMO</option><option value="supported">Supported, sheltered, refuge or council temporary housing</option><option value="social">Council / housing association housing</option></select></label>
      {housing !== "private" ? <div className="rounded-[12px] border border-line p-4 text-[15px] leading-relaxed">
        <h3 className="text-[18px]">This LHA calculation is not suitable for this housing</h3>
        <p className="mt-2">Supported housing with care, support or supervision, refuges and council-arranged temporary accommodation may need a Housing Benefit claim. Council and housing association rent uses different rules. Ask the provider and council which route applies and which charges are eligible.</p>
        <a className="mt-3 inline-block text-pine-dark underline" href="https://www.gov.uk/housing-and-universal-credit">Check the official housing-cost guidance →</a>
      </div> : <>
        <label className="block"><span className="label">Benefit route</span><select className="field mt-2" value={benefit} onChange={(event) => { setBenefit(event.target.value as "UC" | "HB"); setCap(""); setConfirmed(false); }}><option value="UC">Universal Credit — monthly cap</option><option value="HB">Housing Benefit — weekly cap</option></select></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Eligible rent (£)</span><input className="field mt-2" inputMode="decimal" placeholder="e.g. 150.00" value={rent} onChange={(event) => setRent(event.target.value)} aria-describedby="rent-help" /></label>
          <label><span className="label">Rent frequency</span><select className="field mt-2" value={period} onChange={(event) => setPeriod(event.target.value as "weekly" | "monthly")}><option value="weekly">Per week</option><option value="monthly">Per calendar month</option></select></label>
        </div>
        <p id="rent-help" className="text-[13px] text-ink-soft">Enter your share of eligible rent, excluding ineligible bills and charges. This tool does not assess which charges qualify.</p>
        <div className="rounded-[12px] border border-line p-4">
          <h3 className="text-[17px]">Find the right rate first</h3>
          <p className="mt-2 text-[14px] text-ink-soft">Use the property postcode and your bedroom entitlement, not just the city or the advert&apos;s bedroom count. Single people under 35 usually have the shared rate, but exceptions apply.</p>
          <a href={LHA_LOOKUP} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-3">Look up your official LHA rate ↗</a>
          {benefit === "UC" && <a href={UC_LHA_SOURCE} target="_blank" rel="noopener noreferrer" className="mt-3 block text-[14px] text-pine-dark underline">Then check the DWP monthly UC rate for that BRMA ↗</a>}
          {currentRates && <div className="mt-4 space-y-2">
            <label className="block"><span className="label">Birmingham BRMA example (2026/27)</span><select className="field mt-2" value={category} onChange={(event) => setCategory(event.target.value)}>{exampleRates.map((rate, index) => <option key={rate.label} value={index}>{rate.label} — {money(rate.amount)} / {benefit === "UC" ? "month" : "week"}</option>)}</select></label>
            <button type="button" className="text-[14px] text-pine-dark underline" onClick={() => { setCap(String(exampleRates[Number(category)].amount)); setConfirmed(false); }}>Use this example rate</button>
            <p className="text-[12px] text-ink-soft">Only use it after confirming your postcode is in Birmingham BRMA and this is your entitlement.</p>
          </div>}
        </div>
        <label className="block"><span className="label">Official {benefit === "UC" ? "monthly UC" : "weekly Housing Benefit"} LHA rate (£)</span><input className="field mt-2" inputMode="decimal" placeholder={benefit === "UC" ? "Enter the official monthly rate" : "Enter the official weekly rate"} value={cap} onChange={(event) => { setCap(event.target.value); setConfirmed(false); }} /></label>
        <label className="flex items-start gap-3 text-[14px]"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I checked the postcode, bedroom entitlement and {benefit === "UC" ? "monthly UC" : "weekly HB"} rate.</label>
        {confirmed && rent && cap && !result && <p role="alert" className="text-clay">Enter valid amounts between £0 and £100,000, with no more than two decimal places.</p>}
      </>}
    </section>
    <section className="card p-5 sm:p-7" aria-live="polite" aria-atomic="true">
      <span className="eyebrow">Your rent comparison</span>
      {result ? <>
        <h2 className="mt-3 text-[29px]">Up to {money(result.maximum)} / {result.period}</h2>
        <p className="mt-2 text-[15px] text-ink-soft">Rent-based ceiling before any benefit reductions. This is not your benefit award.</p>
        <dl className="mt-5 space-y-3 text-[15px]">
          <div className="flex justify-between gap-4"><dt>Eligible rent / {result.period}</dt><dd>{money(result.rent)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Entered LHA cap</dt><dd>{money(Number(cap))}</dd></div>
          <div className="flex justify-between gap-4 border-t border-line pt-3 font-semibold"><dt>Minimum rent gap / {result.period}</dt><dd>{money(result.shortfall)}</dd></div>
        </dl>
        <p className="mt-4 text-[13px] text-ink-soft">Your actual gap can be larger because of income, savings, the benefit cap, deductions or ineligible charges. Weekly rent is converted using 52 weeks / 12 months; this tool uses the official cap you entered.</p>
      </> : <><h2 className="mt-3 text-[23px]">Plan before you commit to rent</h2><p className="mt-3 text-ink-soft">Choose private rental, enter eligible rent and a checked LHA rate to see the ceiling and possible rent gap. No personal details are saved.</p></>}
      <Link href="/search?hb=1&where=Birmingham" className="btn-primary mt-6">Find Birmingham rooms accepting benefits</Link>
      <a href="https://www.gov.uk/benefits-calculators" className="mt-4 block text-[14px] text-pine-dark underline">Check your full benefit entitlement →</a>
    </section>
  </div>;
}
