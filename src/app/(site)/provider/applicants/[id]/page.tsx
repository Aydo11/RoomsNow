import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany, assertApplicantAccess } from "@/lib/rbac";
import { ACCOMMODATION_TYPES, GENDER_ARRANGEMENTS, supportLabel } from "@/lib/taxonomy";
import { ageFrom, shortDate } from "@/lib/format";

export const metadata = { title: "Applicant profile" };
export const dynamic = "force-dynamic";

export default async function ApplicantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireCompany();
  await assertApplicantAccess(user, id);

  const applicant = await db.user.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!applicant || applicant.status !== "ACTIVE") notFound();

  const requests = await db.accommodationRequest.findMany({
    where: { applicantId: id, listing: { companyId: { in: user.staffOf.map((s) => s.companyId) } } },
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { id: true, title: true } } },
  });

  const profile = applicant.profile;
  const initials = `${applicant.firstName[0] ?? ""}${applicant.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="shell max-w-3xl py-10">
      <Link href="/provider/requests" className="text-[14px] text-pine-dark hover:underline">← Back to requests</Link>

      <div className="card mt-4 p-6">
        <div className="flex items-center gap-4">
          {profile?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt="" className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-raise" />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full bg-paper-sunk text-[18px] font-semibold uppercase text-ink-soft">
              {initials || "?"}
            </span>
          )}
          <div>
            <h1 className="text-[24px]">{applicant.firstName} {applicant.lastName}</h1>
            <p className="mt-0.5 text-[14px] text-ink-soft">
              {profile?.dateOfBirth ? `${ageFrom(profile.dateOfBirth)} years old · ` : ""}
              {applicant.locationLabel ?? "Location not given"}
            </p>
          </div>
        </div>

        {profile?.about && (
          <section className="mt-6">
            <h2 className="text-[16px] font-semibold">About</h2>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{profile.about}</p>
          </section>
        )}

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          {profile?.accommodationNeeds && (
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-ink-faint">Accommodation needs</dt>
              <dd className="mt-0.5 whitespace-pre-line text-[15px]">{profile.accommodationNeeds}</dd>
            </div>
          )}
          {profile?.supportNeeds && (
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-ink-faint">Support needs</dt>
              <dd className="mt-0.5 whitespace-pre-line text-[15px]">{profile.supportNeeds}</dd>
            </div>
          )}
          {profile && profile.supportTypes.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-ink-faint">Support categories</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {profile.supportTypes.map((slug) => <span key={slug} className="chip">{supportLabel(slug)}</span>)}
              </dd>
            </div>
          )}
          {profile && profile.preferredTypes.length > 0 && (
            <div>
              <dt className="text-[13px] text-ink-faint">Preferred accommodation</dt>
              <dd className="mt-0.5 text-[15px]">{profile.preferredTypes.map((t) => ACCOMMODATION_TYPES[t]).join(", ")}</dd>
            </div>
          )}
          {profile?.genderArrangement && (
            <div>
              <dt className="text-[13px] text-ink-faint">Household preference</dt>
              <dd className="mt-0.5 text-[15px]">{GENDER_ARRANGEMENTS[profile.genderArrangement]}</dd>
            </div>
          )}
          {profile?.accessibilityNeeds && (
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-ink-faint">Access needs</dt>
              <dd className="mt-0.5 text-[15px]">{profile.accessibilityNeeds}</dd>
            </div>
          )}
          {profile?.otherRequirements && (
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-ink-faint">Anything else</dt>
              <dd className="mt-0.5 whitespace-pre-line text-[15px]">{profile.otherRequirements}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          <Link href="/messages" className="btn-secondary">Message</Link>
        </div>
      </div>

      {requests.length > 0 && (
        <div className="card mt-5 p-6">
          <h2 className="text-[16px] font-semibold">Requests to you</h2>
          <ul className="mt-3 space-y-2">
            {requests.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-3 text-[14px]">
                <span>{request.listing.title} · {shortDate(request.createdAt)}</span>
                <span className="chip">{request.status.replace(/_/g, " ").toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
