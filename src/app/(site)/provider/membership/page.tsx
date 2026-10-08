import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { billingAvailable, billingIsLive, planLimits } from "@/lib/billing";
import { FormSuccess } from "@/components/ui";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { PlanPicker } from "@/components/plan-picker";
import { SuccessCelebration } from "@/components/success-celebration";
import { providerNav } from "../nav";
import { money, shortDate } from "@/lib/format";
import { cancelWhatsappAddonAction, startWhatsappAddonAction } from "@/server/actions/billing";
import { WHATSAPP_ADDON_PRICE, whatsappAccess } from "@/lib/whatsapp-access";

export const metadata = { title: "Membership" };
export const dynamic = "force-dynamic";

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ billing?: string; whatsapp?: string }> }) {
  const { companyId } = await requireCompany();
  const query = await searchParams;
  const billingLive = billingIsLive();
  const paymentsEnabled = billingAvailable();
  const [nav, limits, plans, payments, addon] = await Promise.all([
    providerNav(companyId),
    planLimits(companyId),
    db.membership.findMany({
      where: { audience: "PROVIDER" },
      orderBy: { priceMonthly: "asc" },
    }),
    db.payment.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { whatsappAddonStatus: true, whatsappAddonPeriodEnd: true, whatsappAddonCancelAtPeriodEnd: true, whatsappEnabled: true },
    }),
  ]);
  const whatsapp = whatsappAccess(limits.membership.tier, addon.whatsappAddonStatus);

  const limit = (value: number) => (value === -1 ? "Unlimited" : value.toString());

  return (
    <DashboardShell
      title="Membership"
      subtitle={billingLive ? "Upgrade securely with Stripe. You can manage payment details and cancellation here." : "Payments will be available after Stripe is configured."}
      nav={nav}
      active="/provider/membership"
    >
      {query.billing === "complete" && <SuccessCelebration kind="membership" clearQueryParam="billing" />}
      {query.billing === "complete" && <div className="mb-5"><FormSuccess message="Payment completed. Your membership will update as soon as Stripe confirms it." /></div>}
      {limits.grant && (
        <div className="mb-5">
          <FormSuccess
            message={`RoomsNow has granted your organisation complimentary ${limits.grant.membership.name} access${
              limits.grant.expiresAt ? ` until ${shortDate(limits.grant.expiresAt)}` : ""
            }. Your billing history remains separate.`}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Current plan"
          value={limits.membership.name}
          hint={
            limits.source === "ADMIN_GRANT"
              ? limits.grant?.expiresAt
                ? `Admin access ends ${shortDate(limits.grant.expiresAt)}`
                : "Complimentary admin access"
              : limits.subscription?.currentPeriodEnd
              ? `Renews ${shortDate(limits.subscription.currentPeriodEnd)}`
              : "No renewal date"
          }
        />
        <StatCard
          label="Adverts"
          value={`${limits.used.listings} / ${limit(limits.membership.maxListings)}`}
        />
        <StatCard className="col-span-2 sm:col-span-1" label="Rooms" value={`${limits.used.rooms} / ${limit(limits.membership.maxRooms)}`} />
      </div>

      <section className="mt-8">
        <h2 className="text-[20px]">Plans</h2>
        <div className="mt-3">
          <PlanPicker
            currentTier={limits.membership.tier}
            paidTier={
              limits.subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(limits.subscription.status)
                ? limits.subscription.membership.tier
                : null
            }
            cancelling={limits.subscription?.cancelAtPeriodEnd ?? false}
            billingLive={billingLive}
            paymentsEnabled={paymentsEnabled}
            plans={plans.map((plan) => ({
              tier: plan.tier,
              name: plan.name,
              description: plan.description,
              priceMonthly: plan.priceMonthly,
              maxListings: plan.maxListings,
              maxRooms: plan.maxRooms,
              maxStaff: plan.maxStaff,
              featuredCredits: plan.featuredCredits,
              includedBoosts: plan.includedBoosts,
              analytics: plan.analytics,
              priorityPlacement: plan.priorityPlacement,
            }))}
          />
        </div>
      </section>

      <section id="whatsapp-addon" className="mt-8 scroll-mt-24">
        <h2 className="text-[20px]">Add-ons</h2>
        {query.whatsapp === "complete" && (
          <div className="mt-3"><FormSuccess message="WhatsApp add-on set up. Add your business WhatsApp number in Company profile to show the button on your adverts." /></div>
        )}
        <div className="card mt-3 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e8f7ef] text-[#087f45]" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 21l1.7-5.4A8.5 8.5 0 1 1 21 11.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 7.5c0 4 3 7 7 7l1-2-2-1-1 1c-1.5-.5-2.5-1.5-3-3l1-1-1-2-2 1Z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-[17px] font-semibold text-ink">
              WhatsApp enquiries
              <span className="text-[14px] font-normal text-ink-soft">
                {whatsapp.reason === "INCLUDED" ? "Included in Business" : `${money(WHATSAPP_ADDON_PRICE)} / month on Professional`}
              </span>
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
              A green WhatsApp button on your adverts, so people can message you straight from their phone. Their message includes the advert title and link.
            </p>
            <p className="mt-1.5 text-[13px] text-ink-soft">
              {whatsapp.reason === "INCLUDED"
                ? addon.whatsappEnabled ? "Switched on." : "Included. Add your number in Company profile to switch it on."
                : whatsapp.reason === "ADDON"
                  ? addon.whatsappAddonCancelAtPeriodEnd
                    ? `Cancelled. It stays on until ${addon.whatsappAddonPeriodEnd ? shortDate(addon.whatsappAddonPeriodEnd) : "the end of this billing period"}.`
                    : `Active${addon.whatsappAddonPeriodEnd ? `, renews ${shortDate(addon.whatsappAddonPeriodEnd)}` : ""}.`
                  : whatsapp.reason === "NEEDS_ADDON"
                    ? "Not added yet."
                    : "Not available on Free. Choose Professional and add it, or choose Business where it's included."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {whatsapp.reason === "NEEDS_ADDON" && (
              <form action={startWhatsappAddonAction}>
                <button className="btn-primary" disabled={!paymentsEnabled}>Add for {money(WHATSAPP_ADDON_PRICE)}/month</button>
              </form>
            )}
            {(whatsapp.reason === "INCLUDED" || whatsapp.reason === "ADDON") && (
              <a href="/provider/settings#whatsapp-enquiries" className="btn-secondary">WhatsApp settings</a>
            )}
            {whatsapp.reason === "ADDON" && !addon.whatsappAddonCancelAtPeriodEnd && (
              <form action={cancelWhatsappAddonAction}>
                <button className="btn-ghost">Cancel add-on</button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[20px]">Billing history</h2>
        <div className="mt-3">
          {payments.length === 0 ? (
            <p className="card p-5 text-[15px] text-ink-soft">Nothing billed yet.</p>
          ) : (
            <DataTable head={["Date", "Description", "Amount", "Status"]}>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">{shortDate(payment.createdAt)}</td>
                  <td className="px-4 py-3">{payment.description ?? payment.kind.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{money(payment.amount)}</td>
                  <td className="px-4 py-3 capitalize text-ink-soft">{payment.status.toLowerCase()}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
