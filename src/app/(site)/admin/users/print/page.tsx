import { AccountStatus, Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { shortDate } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Users — printable report" };
export const dynamic = "force-dynamic";

/**
 * A bare, chrome-free report of the full (unpaginated) filtered Users list,
 * meant to be exported to PDF via the browser's own Print → Save as PDF —
 * no PDF library needed. Mirrors the /admin/users filters exactly.
 */
export default async function AdminUsersPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim();
  const role = Object.values(Role).includes(query.role as Role) ? (query.role as Role) : undefined;
  const status = Object.values(AccountStatus).includes(query.status as AccountStatus) ? (query.status as AccountStatus) : undefined;
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(query.status === "DELETED" ? { deletedAt: { not: null } } : status ? { status, deletedAt: null } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20000,
    select: { firstName: true, lastName: true, email: true, phone: true, role: true, status: true, deletedAt: true, createdAt: true },
  });

  const filters = [q && `Search: "${q}"`, role && `Role: ${role.toLowerCase()}`, query.status && `Status: ${query.status.toLowerCase()}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[22px]">Users — printable report</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            Use your browser&apos;s Print dialog and choose &ldquo;Save as PDF&rdquo; to export this as a PDF.
          </p>
        </div>
        <PrintButton />
      </div>
      <h1 className="mb-1 hidden text-[16px] font-semibold print:block">RoomsNow — Users export</h1>
      <p className="mb-4 text-[12px] text-ink-faint">
        {users.length} record{users.length === 1 ? "" : "s"} · Generated {shortDate(new Date())}
        {filters ? ` · ${filters}` : ""}
      </p>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-2 pr-3 font-semibold">Name</th>
            <th className="py-2 pr-3 font-semibold">Email</th>
            <th className="py-2 pr-3 font-semibold">Phone</th>
            <th className="py-2 pr-3 font-semibold">Role</th>
            <th className="py-2 pr-3 font-semibold">Status</th>
            <th className="py-2 font-semibold">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email} className="break-inside-avoid border-b border-line">
              <td className="py-1.5 pr-3">
                {user.firstName} {user.lastName}
              </td>
              <td className="py-1.5 pr-3">{user.email}</td>
              <td className="py-1.5 pr-3">{user.phone ?? "—"}</td>
              <td className="py-1.5 pr-3 capitalize">{user.role.toLowerCase()}</td>
              <td className="py-1.5 pr-3 capitalize">{user.deletedAt ? "deleted" : user.status.toLowerCase()}</td>
              <td className="py-1.5">{shortDate(user.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <p className="py-6 text-[13px] text-ink-faint">No users matched this filter.</p>}
    </div>
  );
}
