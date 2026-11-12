/** ALL: everything. MODERATION: adverts and reports. NEWS: the News & charities section only. */
export type AdminPermission = "ALL" | "MODERATION" | "NEWS";
export const ADMIN_PERMISSIONS = ["ALL", "MODERATION", "NEWS"] as const;
export function hasAdminPermission(user: { role: string; adminPermissions: string[] } | null, permission: AdminPermission = "ALL") {
  return user?.role === "ADMIN" && (user.adminPermissions.includes("ALL") || user.adminPermissions.includes(permission));
}
