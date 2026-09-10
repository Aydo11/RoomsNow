import { AccountStatus, Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * CSV export of the Users list, respecting whatever search/role/status
 * filter is active on /admin/users — mirrors that page's query exactly,
 * minus pagination, so "export" always matches what's on screen.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const roleParam = searchParams.get("role");
  const role = roleParam && Object.values(Role).includes(roleParam as Role) ? (roleParam as Role) : undefined;
  const statusParam = searchParams.get("status");
  const status = statusParam && Object.values(AccountStatus).includes(statusParam as AccountStatus) ? (statusParam as AccountStatus) : undefined;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(statusParam === "DELETED" ? { deletedAt: { not: null } } : status ? { status, deletedAt: null } : {}),
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
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  await audit({
    actorId: admin.id,
    action: "admin.users_exported",
    metadata: { count: users.length, q, role, status: statusParam || undefined },
  });

  const columns = ["Name", "Email", "Phone", "Role", "Status", "Joined"];
  const rows = users.map((user) => [
    `${user.firstName} ${user.lastName}`.trim(),
    user.email,
    user.phone ?? "",
    user.role,
    user.deletedAt ? "DELETED" : user.status,
    user.createdAt.toISOString().slice(0, 10),
  ]);

  return csvResponse(`roomsnow-users-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows);
}
