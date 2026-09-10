"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMembershipAction, changePlanAction, openBillingPortalAction } from "@/server/actions/billing";
import { money } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import type { MembershipTier } from "@prisma/client";

type Plan = {
  tier: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  maxListings: number;
  maxRooms: number;
  maxStaff: number;
  featuredCredits: number;
  analytics: boolean;
  priorityPlacement: boolean;
};

export function PlanPicker({
  plans,
  currentTier,
  paidTier,
  cancelling,
  billingLive,
  paymentsEnabled,
}: {
  plans: Plan[];
  currentTier: string;
  paidTier?: string | null;
  cancelling: boolean;
  billingLive: boolean;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const limit = (value: number) => (value === -1 ? "Unlimited" : value);

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.tier === currentTier;
          return (
            <li key={plan.tier} className={clsx("card flex flex-col p-6", current && "ring-2 ring-pine")}>
              <h3 className="text-[20px]">{plan.name}</h3>
              <p className="mt-1 font-display text-[28px] leading-none">
                {plan.priceMonthly === 0 ? "Free" : money(plan.priceMonthly)}
                {plan.priceMonthly > 0 && <span className="text-[14px] text-ink-soft"> / month</span>}
              </p>
              {plan.description && <p className="mt-2 text-[14px] text-ink-soft">{plan.description}</p>}

              <ul className="mt-4 flex-1 space-y-1.5 text-[14px] text-ink-soft">
                <li>{limit(plan.maxListings)} live adverts</li>
                <li>{plan.maxRooms === -1 ? "Unlimited rooms across your properties" : `${limit(plan.maxRooms)} rooms`}</li>
                <li>{limit(plan.maxStaff)} staff accounts</li>
                <li>{plan.priceMonthly > 0 ? "Public advert maps with nearby amenities" : "No public advert maps"}</li>
                <li>{plan.featuredCredits} promoted slots included</li>
                <li>{plan.analytics ? "Analytics included" : "No analytics"}</li>
                <li>{plan.priorityPlacement ? "Priority placement in search" : "Standard placement"}</li>
              </ul>

              {current ? (
                <p className="mt-5 text-[14px] text-pine-dark">Your current plan</p>
              ) : (
                <button
                  className="btn-primary mt-5"
                  disabled={pending || !paymentsEnabled}
                  onClick={() =>
                    startTransition(async () => {
                      await changePlanAction(plan.tier as MembershipTier);
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

      {paidTier && paidTier !== "FREE" && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-[15px] text-ink-soft">
            {cancelling
              ? "Your paid subscription is set to end when the current period finishes."
              : "Cancelling keeps your paid subscription running until the end of the period you've paid for."}
          </p>
          {!cancelling && (
            <div className="flex flex-wrap gap-2">
              {billingLive && <button className="btn-secondary" disabled={pending} onClick={() => startTransition(() => openBillingPortalAction())}>Payment details</button>}
              <button className="btn-ghost text-clay-dark" disabled={pending} onClick={() => startTransition(async () => { await cancelMembershipAction(true); router.refresh(); })}>Cancel membership</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
