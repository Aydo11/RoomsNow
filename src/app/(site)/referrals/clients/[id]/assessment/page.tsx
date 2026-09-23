import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { AssessmentForm } from "@/components/assessment-form";
import { parseAssessment } from "@/lib/assessment";
import { shortDate } from "@/lib/format";
import { referrerNav } from "../../../nav";

export const metadata = { title: "Needs and risk assessment" };
export const dynamic = "force-dynamic";

export default async function ClientAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireReferrer()]);
  const client = await db.client.findFirst({
    where: { id, referrerId: user.id },
    select: { id: true, firstName: true, lastName: true, assessment: true, assessedAt: true, deletedAt: true },
  });
  if (!client) notFound();
  if (client.deletedAt) redirect(`/referrals/clients/${client.id}`);
  const nav = await referrerNav(user.id);

  return (
    <DashboardShell
      title={`Needs and risk assessment — ${client.firstName} ${client.lastName}`}
      subtitle={`Optional. Fill in as much or as little as you know — the more you add, the better the matches.${client.assessedAt ? ` Last updated ${shortDate(client.assessedAt)}.` : ""}`}
      nav={nav}
      active="/referrals/clients"
      action={
        <Link href={`/referrals/clients/${client.id}`} className="btn-secondary">
          Back to {client.firstName}
        </Link>
      }
    >
      <div className="max-w-4xl">
        <AssessmentForm clientId={client.id} firstName={client.firstName} value={parseAssessment(client.assessment)} />
      </div>
    </DashboardShell>
  );
}
