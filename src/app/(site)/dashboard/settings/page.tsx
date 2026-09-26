import { requireUser } from "@/lib/rbac";
import { serviceProviderNav } from "../../service-provider/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccountSettings } from "@/components/account-settings";
import { SoundSetting } from "@/components/sound-setting";
import { AppSettings } from "@/components/app-install";
import { vapidPublicKey } from "@/lib/web-push";
import { userNav } from "../nav";
import { referrerNav } from "../../referrals/nav";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const nav = user.role === "SERVICE_PROVIDER" ? await serviceProviderNav(user.id) : user.role === "REFERRER" || user.role === "ADMIN" ? await referrerNav(user.id) : await userNav(user.id);

  return (
    <DashboardShell title="Settings" nav={nav} active="/dashboard/settings">
      <div className="card p-6">
        <h2 className="text-[20px]">Account</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-ink-faint">Email</dt>
            <dd className="text-[15px]">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-faint">Phone</dt>
            <dd className="text-[15px]">{user.phone ?? "Not given"}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-faint">Account type</dt>
            <dd className="text-[15px] capitalize">{user.role.toLowerCase()}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-faint">Preferred contact</dt>
            <dd className="text-[15px] capitalize">{user.contactMethod.toLowerCase()}</dd>
          </div>
        </dl>
      </div>

      <AccountSettings />
      <AppSettings vapidKey={vapidPublicKey()} />
      <SoundSetting />
    </DashboardShell>
  );
}
