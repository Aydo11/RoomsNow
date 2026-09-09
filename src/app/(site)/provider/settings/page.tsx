import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { CompanyForm, VerificationForm } from "@/components/company-forms";
import { providerNav } from "../nav";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Company profile" };
export const dynamic = "force-dynamic";

export default async function ProviderSettingsPage() {
  const { companyId } = await requireCompany();
  const [nav, company, verification] = await Promise.all([
    providerNav(companyId),
    db.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { staff: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
    }),
    db.verificationRequest.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <DashboardShell
      title="Company profile"
      subtitle="This is what people see on your provider page."
      nav={nav}
      active="/provider/settings"
    >
      <CompanyForm
        company={{
          name: company.name,
          tradingName: company.tradingName ?? "",
          registrationNumber: company.registrationNumber ?? "",
          email: company.email,
          phone: company.phone ?? "",
          website: company.website ?? "",
          addressLine1: company.addressLine1 ?? "",
          addressLine2: company.addressLine2 ?? "",
          city: company.city ?? "",
          postcode: company.postcode ?? "",
          orgType: company.orgType,
          about: company.about ?? "",
          operatingAreas: company.operatingAreas,
          supportTypes: company.supportTypes,
          logoUrl: company.logoUrl,
          bannerUrl: company.bannerUrl,
          socialLinks: Array.isArray(company.socialLinks)
            ? (company.socialLinks as { platform: string; url: string }[])
            : [],
        }}
      />

      <section className="card mt-6 p-6">
        <h2 className="text-[20px]">Provider due diligence and verification</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
          Submit evidence of your legal identity, insurance, governance and safeguarding arrangements.
          Our team records each check before adding a verified badge. The badge is a RoomsNow identity
          and evidence check, not a regulator&apos;s inspection, licence or endorsement.
        </p>

        {company.verification === "APPROVED" ? (
          <p className="mt-3 text-[15px] text-pine-dark">
            Verified{company.verifiedAt ? ` on ${shortDate(company.verifiedAt)}` : ""}.
          </p>
        ) : verification?.status === "PENDING" ? (
          <p className="mt-3 text-[15px] text-ink-soft">
            Submitted {shortDate(verification.createdAt)} — waiting on our review.
          </p>
        ) : (
          <div className="mt-4">
            {verification?.status === "REJECTED" && verification.reviewNote && (
              <p className="mb-4 rounded-[10px] bg-clay-light px-4 py-3 text-[14px] text-clay-dark">
                Last request wasn&apos;t approved: {verification.reviewNote}
              </p>
            )}
            <VerificationForm />
          </div>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="text-[20px]">Team</h2>
        <ul className="mt-3 divide-y divide-line">
          {company.staff.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-[15px]">
                  {member.user.firstName} {member.user.lastName}
                </p>
                <p className="text-[13px] text-ink-faint">{member.user.email}</p>
              </div>
              <span className="chip capitalize">{member.staffRole.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
