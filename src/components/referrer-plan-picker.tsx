"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelReferrerMembershipAction,
  changeReferrerPlanAction,
  openReferrerBillingPortalAction,
} from "@/server/actions/referrer-billing";
import { money } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import type { MembershipTier } from "@prisma/client";

type Plan = {
  tier: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  maxClients: number;
  maxSharesPerClient: number;
  priorityRouting: boolean;
};

export function ReferrerPlanPicker({
  plans,
  currentTier,
  cancelling,
  billingLive,
  paymentsEnabled,
}: {
  plans: Plan[];
  currentTier: string;
  cancelling: boolean;
  billingLive: boolean;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const limit = (value: number) => (value === -1 ? "Unlimited" : value);

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const current = plan.tier === currentTier;
          return (
            <li key={plan.tier} className={clsx("card flex flex-col p-6 transition-shadow", current && "ring-2 ring-pine")}>
              <h3 className="text-[20px]">{plan.name}</h3>
              <p className="mt-1 font-display text-[28px] leading-none">
                {plan.priceMonthly === 0 ? "Free" : money(plan.priceMonthly)}
                {plan.priceMonthly > 0 && <span className="text-[14px] text-ink-soft"> / month</span>}
              </p>
              {plan.description && <p className="mt-2 text-[14px] text-ink-soft">{plan.description}</p>}

              <ul className="mt-4 flex-1 space-y-1.5 text-[14px] text-ink-soft">
                <li>{limit(plan.maxClients)} active clients</li>
                <li>
                  Share each profile with {limit(plan.maxSharesPerClient)}{" "}
                  {plan.maxSharesPerClient === 1 ? "provider" : "providers"} at once
                </li>
                <li>{plan.priorityRouting ? "Priority routing badge on referrals" : "Standard routing"}</li>
              </ul>

              {current ? (
                <p className="mt-5 text-[14px] text-pine-dark">Your current plan</p>
              ) : (
                <button
                  className="btn-primary mt-5 transition-transform active:scale-[0.98]"
                  disabled={pending || !paymentsEnabled}
                  onClick={() =>
                    startTransition(async () => {
                      await changeReferrerPlanAction(plan.tier as MembershipTier);
                      router.refresh();
                    })
                  }
                >
                  {!paymentsEnabled ? "Payments unavailable" : plan.priceMonthly === 0 ? "Move to Free" : `Choose ${plan.name}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {currentTier !== "REFERRER_FREE" && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-[15px] text-ink-soft">
            {cancelling
              ? "Your plan is set to end when the current period finishes."
              : "Cancelling keeps your plan running until the end of the period you've paid for."}
          </p>
          {!cancelling && (
            <div className="flex flex-wrap gap-2">
              {billingLive && (
                <button className="btn-secondary" disabled={pending} onClick={() => startTransition(() => openReferrerBillingPortalAction())}>
                  Payment details
                </button>
              )}
              <button
                className="btn-ghost text-clay"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await cancelReferrerMembershipAction(true);
                    router.refresh();
                  })
                }
              >
                Cancel membership
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
