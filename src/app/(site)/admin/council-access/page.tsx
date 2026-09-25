import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { CouncilAccessForm } from "@/components/council-access-form";
import { revokeCouncilAccessAction } from "@/server/actions/council";
import { shortDate } from "@/lib/format";
import { adminNav } from "../nav";

export const metadata = { title: "Council access" };
export const dynamic = "force-dynamic";

/** Who can see the council view, and for which areas. */
export default async function AdminCouncilAccessPage() {
  await requireAdmin();
  const [nav, grants] = await Promise.all([
    adminNav(),
    db.councilAccess.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
  ]);

  return (
    <DashboardShell
      title="Council access"
      subtitle="Give council officers a read-only view of live vacancies, placement times and outcomes for their areas. They only ever see counts, never people."
      nav={nav}
      active="/admin/council-access"
    >
      <CouncilAccessForm />
      <div className="mt-6">
        {grants.length === 0 ? (
          <p className="text-[14px] text-ink-soft">Nobody has the council view yet.</p>
        ) : (
          <DataTable head={["Person", "Council", "Areas", "Given", ""]} compact>
            {grants.map((grant) => (
              <tr key={grant.id} className="border-t border-line">
                <td className="px-4 py-2.5">
                  {grant.user.firstName} {grant.user.lastName}
                  <span className="block text-[12px] text-ink-faint">{grant.user.email}</span>
                </td>
                <td className="px-4 py-2.5">{grant.councilName}</td>
                <td className="px-4 py-2.5">{grant.areas.join(", ")}</td>
                <td className="px-4 py-2.5">{shortDate(grant.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <Link href={`/council?id=${grant.id}`} className="btn-ghost">
                      Preview
                    </Link>
                    <form action={revokeCouncilAccessAction}>
                      <input type="hidden" name="id" value={grant.id} />
                      <button type="submit" className="btn-ghost text-clay">
                        Remove
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </DashboardShell>
  );
}
