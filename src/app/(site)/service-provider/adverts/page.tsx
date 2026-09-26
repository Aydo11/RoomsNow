import Link from "next/link";
import { db } from "@/lib/db";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { AdvertStatusPill, BoostedLabel } from "@/components/service-ui";
import { EmptyState } from "@/components/ui";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { categoryLabel, COUNTED_ADVERT_STATUSES, priceLabel, SERVICE_PLANS, servicePlanFor } from "@/lib/service-marketplace";
import { shortDate } from "@/lib/format";
import { serviceProviderNav } from "../nav";

export const metadata = { title: "My adverts" };
export const dynamic = "force-dynamic";

export default async function ServiceAdvertsPage() {
  const { user, business } = await requireServiceBusiness();
  const now = new Date();
  const [nav, adverts] = await Promise.all([
    serviceProviderNav(user.id),
    db.serviceAdvert.findMany({
      where: { businessId: business.id },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: { boosts: { where: { endsAt: { gt: now } }, select: { endsAt: true }, orderBy: { endsAt: "desc" }, take: 1 } },
    }),
  ]);
  const plan = servicePlanFor(business.subscription);
  const live = adverts.filter((a) => COUNTED_ADVERT_STATUSES.includes(a.status)).length;
  const max = plan?.maxAdverts ?? SERVICE_PLANS.STANDARD.maxAdverts;

  return (
    <DashboardShell
      title="My adverts"
      subtitle={plan ? `${live} of ${max} advert slots in use on ${plan.name}. Drafts and archived adverts don't count.` : "Choose a plan to send adverts for review. You can write drafts now."}
      nav={nav}
      active="/service-provider/adverts"
      action={<Link href="/service-provider/adverts/new" className="btn-primary">New advert</Link>}
    >
      {adverts.length === 0 ? (
        <EmptyState title="No adverts yet" body="Create an advert for each service you offer. Our team checks every advert before providers can see it." actionHref="/service-provider/adverts/new" actionLabel="Create an advert" />
      ) : (
        <DataTable head={["Advert", "Status", "Price", "Views", "Enquiries", "Updated"]}>
          {adverts.map((advert) => (
            <tr key={advert.id}>
              <td className="px-4 py-3">
                <Link href={`/service-provider/adverts/${advert.id}`} className="font-medium text-ink hover:underline">{advert.title}</Link>
                <span className="mt-0.5 flex items-center gap-2 text-[13px] text-ink-faint">
                  {categoryLabel(advert.category)}
                  {advert.boosts[0] && <BoostedLabel />}
                </span>
              </td>
              <td className="px-4 py-3"><AdvertStatusPill status={advert.status} /></td>
              <td className="px-4 py-3 text-ink-soft">{priceLabel(advert)}</td>
              <td className="px-4 py-3 tabular-nums">{advert.views}</td>
              <td className="px-4 py-3 tabular-nums">{advert.enquiries}</td>
              <td className="px-4 py-3 text-ink-soft">{shortDate(advert.updatedAt)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </DashboardShell>
  );
}
