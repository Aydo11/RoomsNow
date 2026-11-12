import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { dateTime, money } from "@/lib/format";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { adminNav } from "../nav";
import { confirmProMeetingAction, saveProExpertAction, updateProEnquiryAction } from "@/server/actions/pro-services";
import { ENQUIRY_STATUSES, MEETING_TYPES, PRO_SERVICES, sessionLabel, ukMeetingTime } from "@/lib/pro-services";

export const metadata = { title: "Pro Services" };
export const dynamic = "force-dynamic";

type Expert = { id: string; name: string; role: string; specialism: string; bio: string; hourlyRate: number; active: boolean; sortOrder: number };

function ExpertForm({ expert }: { expert?: Expert }) {
  const p = expert?.id ?? "new";
  return (
    <form action={saveProExpertAction} className="grid gap-3 sm:grid-cols-4">
      {expert && <input type="hidden" name="id" value={expert.id} />}
      <label className="block"><span className="label">Name</span><input id={`${p}-name`} name="name" required maxLength={80} defaultValue={expert?.name} className="field" /></label>
      <label className="block"><span className="label">Role</span><input id={`${p}-role`} name="role" required maxLength={80} defaultValue={expert?.role} className="field" placeholder="Operations Manager" /></label>
      <label className="block"><span className="label">Specialism</span><input id={`${p}-spec`} name="specialism" required maxLength={160} defaultValue={expert?.specialism} className="field" placeholder="Licensing and compliance" /></label>
      <label className="block"><span className="label">Hourly rate (£)</span><input id={`${p}-rate`} name="hourlyRate" type="number" min={10} max={1000} step="1" required defaultValue={expert ? expert.hourlyRate / 100 : 150} className="field" /></label>
      <label className="block sm:col-span-3"><span className="label">Short bio</span><textarea id={`${p}-bio`} name="bio" rows={2} maxLength={800} defaultValue={expert?.bio} className="field" /></label>
      <div className="flex flex-col justify-end gap-2">
        <label className="flex items-center gap-2 text-[14px]"><input id={`${p}-active`} type="checkbox" name="active" defaultChecked={expert?.active ?? true} /> Show to providers</label>
        <label className="flex items-center gap-2 text-[14px]">Order <input id={`${p}-order`} name="sortOrder" type="number" defaultValue={expert?.sortOrder ?? 0} className="field h-9 w-20 py-1" /></label>
      </div>
      <div className="sm:col-span-4"><SubmitButton className={expert ? "btn-secondary" : "btn-primary"}>{expert ? "Save changes" : "Add manager"}</SubmitButton></div>
    </form>
  );
}

/** Pro Services enquiries (each one already emailed to the provider and to info@) and the managers who sell their time. */
export default async function AdminProServicesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; booked?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const [nav, enquiries, experts, open, won] = await Promise.all([
    adminNav(),
    db.proServiceEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.proExpert.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.proServiceEnquiry.count({ where: { status: { in: ["NEW", "CONTACTED"] } } }),
    db.proServiceEnquiry.count({ where: { status: "WON" } }),
  ]);

  return (
    <DashboardShell
      title="Pro Services"
      subtitle="Each enquiry emails the provider their pack and copies info@roomsnow.co.uk with the same reference. Reply from that email to keep the trail together, then update the status here."
      nav={nav}
      active="/admin/pro-services"
      action={<a href="/provider/pro-services" className="btn-secondary">View the provider page</a>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open enquiries" value={open} />
        <StatCard label="Won" value={won} />
        <StatCard label="Managers selling time" value={experts.filter((e) => e.active).length} />
      </div>

      <section className="mt-8">
        <h2 className="text-[20px]">Enquiries</h2>
        {query.booked && <div className="mt-3"><FormSuccess message="Booked. The provider has been emailed the time with an add-to-calendar link, and info@ has a copy." /></div>}
        {query.error === "meeting" && <div className="mt-3"><FormError message="Choose the call type and a time that isn't in the past. A link must start with https://, or enter a phone number or address." /></div>}
        {query.error === "meeting-email" && <div className="mt-3"><FormError message="The time was saved but the confirmation email didn't send. Please email the provider yourself." /></div>}
        <div className="mt-3">
          {enquiries.length === 0 ? (
            <p className="card p-5 text-[15px] text-ink-soft">No enquiries yet.</p>
          ) : (
            <DataTable head={["Received", "Provider", "Service", "Message", "Status and note"]}>
              {enquiries.map((e) => (
                <tr key={e.id} id={`e-${e.id}`} className="scroll-mt-24 align-top">
                  <td className="px-4 py-3 text-[13px]">
                    {dateTime(e.createdAt)}
                    <span className="block font-mono text-ink-soft">{e.reference}</span>
                    <span className="block text-ink-faint">{e.packSentAt ? "Pack emailed" : "Email not sent"}</span>
                  </td>
                  <td className="px-4 py-3 text-[14px]">
                    <strong>{e.companyName}</strong>
                    <span className="block">{e.contactName}</span>
                    <a className="block text-pine-dark underline" href={`mailto:${e.contactEmail}?subject=${encodeURIComponent(`Re: ${PRO_SERVICES[e.service as keyof typeof PRO_SERVICES]?.name ?? e.service} [${e.reference}]`)}`}>{e.contactEmail}</a>
                    {e.phone && <span className="block">{e.phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-[14px]">
                    {PRO_SERVICES[e.service as keyof typeof PRO_SERVICES]?.name ?? e.service}
                    {e.expertName && <span className="block text-ink-soft">{e.expertName}{e.hours ? `, ${sessionLabel(e.hours)}` : ""}</span>}
                    {e.meetingAt ? (
                      <span className="mt-2 block rounded-[8px] bg-[#DDF2E8] px-2 py-1 text-[13px] font-semibold text-[#1D6E49]">
                        Booked: {MEETING_TYPES[e.meetingType as keyof typeof MEETING_TYPES] ?? "Call"}, {ukMeetingTime(e.meetingAt)}{e.meetingLink ? ` · ${e.meetingLink}` : ""}
                      </span>
                    ) : e.meetingType ? (
                      <span className="mt-2 block rounded-[8px] bg-[#FDEFD3] px-2 py-1 text-[13px] font-semibold text-[#8A5A00]">
                        Wants: {MEETING_TYPES[e.meetingType as keyof typeof MEETING_TYPES] ?? e.meetingType}, {e.meetingWish}
                      </span>
                    ) : null}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[13px] font-semibold text-pine-dark">{e.meetingAt ? "Change time" : "Book a call or meeting"}</summary>
                      <form action={confirmProMeetingAction} className="mt-2 grid min-w-[220px] gap-2">
                        <input type="hidden" name="id" value={e.id} />
                        <select id={`mt-${e.id}`} name="meetingType" defaultValue={e.meetingType ?? "PHONE"} aria-label="Call type" className="field h-9 py-1 text-[14px]">
                          {Object.entries(MEETING_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input id={`ma-${e.id}`} name="meetingAt" type="datetime-local" required aria-label="Date and time (UK)" className="field h-9 py-1 text-[14px]" />
                        <input id={`ml-${e.id}`} name="meetingLink" maxLength={300} defaultValue={e.meetingLink ?? ""} aria-label="Video link, phone number or address" placeholder="Video link, number or address" className="field h-9 py-1 text-[14px]" />
                        <SubmitButton className="btn-primary">Confirm and email</SubmitButton>
                      </form>
                    </details>
                  </td>
                  <td className="max-w-[280px] whitespace-pre-line px-4 py-3 text-[14px] text-ink-soft">{e.message ?? "—"}</td>
                  <td className="px-4 py-3">
                    <form action={updateProEnquiryAction} className="grid min-w-[200px] gap-2">
                      <input type="hidden" name="id" value={e.id} />
                      <select id={`status-${e.id}`} name="status" defaultValue={e.status} aria-label="Status" className="field h-9 py-1 text-[14px]">
                        {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                      </select>
                      <textarea id={`note-${e.id}`} name="adminNote" rows={2} maxLength={2000} defaultValue={e.adminNote ?? ""} aria-label="Note" placeholder="Note" className="field text-[14px]" />
                      <SubmitButton className="btn-secondary">Save</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </section>

      <section id="experts" className="mt-10 scroll-mt-24">
        <h2 className="text-[20px]">Managers selling their time</h2>
        <p className="mt-1 text-[14px] text-ink-soft">Providers see these on the Pro Services page with prices for 1 hour, 2 hours and a half day. Business members get 10% off automatically.</p>
        {query.saved && <div className="mt-3"><FormSuccess message="Saved." /></div>}
        {query.error === "expert" && <div className="mt-3"><FormError message="Add a name, role, specialism and an hourly rate between £10 and £1,000." /></div>}
        <div className="mt-4 space-y-4">
          {experts.map((e) => (
            <div key={e.id} className="card p-5">
              <p className="mb-3 text-[15px] font-semibold">{e.name} · {money(e.hourlyRate)}/hour {e.active ? "" : "(hidden)"}</p>
              <ExpertForm expert={e} />
            </div>
          ))}
          <div className="card p-5">
            <p className="mb-3 text-[15px] font-semibold">Add a manager</p>
            <ExpertForm />
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
