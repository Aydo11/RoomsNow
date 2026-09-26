import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";

export const metadata = { title: "Set up your organisation" };

export default async function CreateCompanyPage() {
  const user = await requireUser("/provider/create");
  if (user.role === "SERVICE_PROVIDER") redirect("/service-provider");
  return (
    <div className="shell max-w-xl py-16">
      <h1 className="text-[30px]">You don&apos;t have a provider account yet</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
        Advertising accommodation needs an organisation account. Create one and you&apos;ll be able
        to post adverts, manage rooms and receive referrals.
      </p>
      <Link href="/register?type=PROVIDER" className="btn-primary mt-6">Create a provider account</Link>
    </div>
  );
}
