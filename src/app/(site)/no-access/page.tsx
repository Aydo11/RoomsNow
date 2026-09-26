import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Not available on your account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const AREAS: Record<string, { title: string; body: string; action?: [string, string] }> = {
  admin: { title: "This is the RoomsNow team area", body: "Only RoomsNow staff with the right permission can open this page." },
  referrals: {
    title: "Referrals are for professional accounts",
    body: "Support workers, housing officers and other professionals use a referrer account to refer people to accommodation.",
    action: ["Create a referrer account", "/register?type=REFERRER"],
  },
  "provider-admin": { title: "Pick a company first", body: "Admins act for a provider company from the admin area.", action: ["Go to companies", "/admin/companies"] },
  service: {
    title: "This area is for trades and suppliers",
    body: "Service businesses manage their profile, adverts and quote requests here. If you offer services to housing providers, create a business account.",
    action: ["Advertise your services", "/advertise-services"],
  },
};

function homeFor(role: string | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "PROVIDER") return "/provider";
  if (role === "REFERRER") return "/referrals";
  if (role === "SERVICE_PROVIDER") return "/service-provider";
  return "/dashboard";
}

export default async function NoAccessPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  const user = await getCurrentUser();
  const copy = AREAS[area ?? ""] ?? { title: "This page isn't available on your account", body: "It belongs to a different type of RoomsNow account." };
  return (
    <div className="shell max-w-xl py-20 text-center">
      <span aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pine-light text-pine-dark">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
      </span>
      <h1 className="mt-4 text-balance text-[26px] leading-tight">{copy.title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{copy.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href={user ? homeFor(user.role) : "/"} className="btn-primary">{user ? "Go to your dashboard" : "Go to the home page"}</Link>
        {copy.action && area !== "provider-admin" && user?.role !== "SERVICE_PROVIDER" && <Link href={copy.action[1]} className="btn-secondary">{copy.action[0]}</Link>}
        {copy.action && area === "provider-admin" && <Link href={copy.action[1]} className="btn-secondary">{copy.action[0]}</Link>}
      </div>
    </div>
  );
}
