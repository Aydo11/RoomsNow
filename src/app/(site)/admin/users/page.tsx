import Link from "next/link";
import { AccountStatus, Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { AccountToggle } from "@/components/admin-controls";
import { AdminFilters, AdminFilterField } from "@/components/admin-filters";
import { adminNav } from "../nav";
import { shortDate } from "@/lib/format";
import { AdminPagination, ADMIN_PAGE_SIZE, pageNumber } from "@/components/admin-pagination";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim();
  const role = Object.values(Role).includes(query.role as Role) ? query.role as Role : undefined;
  const status = Object.values(AccountStatus).includes(query.status as AccountStatus) ? query.status as AccountStatus : undefined;
  const page = pageNumber(query.page);
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(query.status === "DELETED" ? { deletedAt: { not: null } } : status ? { status, deletedAt: null } : {}),
    ...(q ? { OR: [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  const [nav, users, total] = await Promise.all([
    adminNav(),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  const exportQuery = new URLSearchParams();
  if (q) exportQuery.set("q", q);
  if (role) exportQuery.set("role", role);
  if (query.status) exportQuery.set("status", query.status);
  const exportQs = exportQuery.toString() ? `?${exportQuery.toString()}` : "";

  return (
    <DashboardShell
      title="Users"
      subtitle="Compact account management, 25 records per page."
      nav={nav}
      active="/admin/users"
      action={
        <div className="flex gap-2">
          <Link href={`/api/admin/users/export${exportQs}`} className="btn-secondary" prefetch={false}>
            Export CSV
          </Link>
          <Link href={`/admin/users/print${exportQs}`} className="btn-secondary" prefetch={false}>
            Export PDF
          </Link>
        </div>
      }
    >
      <AdminFilters>
        <AdminFilterField label="Search" wide><input className="field" name="q" defaultValue={q} placeholder="Name or email" /></AdminFilterField>
        <AdminFilterField label="Role"><select className="field" name="role" defaultValue={role ?? ""}><option value="">All roles</option>{Object.values(Role).map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}</select></AdminFilterField>
        <AdminFilterField label="Account status"><select className="field" name="status" defaultValue={query.status ?? ""}><option value="">All statuses</option>{Object.values(AccountStatus).map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}<option value="DELETED">deleted</option></select></AdminFilterField>
      </AdminFilters>
      <div className="mt-4">
        <DataTable compact head={["Name", "Email", "Role", "Status", "Joined", ""]}>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-3">
                {user.firstName} {user.lastName}
              </td>
              <td className="px-4 py-3 text-ink-soft">{user.email}</td>
              <td className="px-4 py-3 capitalize">{user.role.toLowerCase()}</td>
              <td className="px-4 py-3 capitalize text-ink-soft">
                {user.deletedAt ? "deleted" : user.status.toLowerCase()}
              </td>
              <td className="px-4 py-3 text-ink-soft">{shortDate(user.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                {!user.deletedAt && user.role !== "ADMIN" && <AccountToggle kind="user" id={user.id} status={user.status} />}
              </td>
            </tr>
          ))}
        </DataTable>
        <AdminPagination page={page} total={total} query={{ q, role, status: query.status }} />
      </div>
    </DashboardShell>
  );
}
