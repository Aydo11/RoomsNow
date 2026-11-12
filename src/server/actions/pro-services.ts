"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { brand } from "@/brand.config";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin, requireCompany } from "@/lib/rbac";
import { planLimits } from "@/lib/billing";
import { sendEmail } from "@/lib/notify";
import { escapeHtml, renderEmail } from "@/lib/email-template";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { reference } from "@/server/form";
import { money } from "@/lib/format";
import { buildProPack, packFileName } from "@/lib/pro-pack-pdf";
import {
  PRO_SERVICES,
  DEMO_SLUG,
  EXPERT_PLANS,
  MEETING_TYPES,
  SESSION_HOURS,
  calendarLink,
  isMeetingType,
  londonTime,
  meetingWish,
  ukMeetingTime,
  canUseProServices,
  isEnquiryStatus,
  isProServiceKey,
  packSubject,
  sessionLabel,
  sessionPrice,
  type ProService,
} from "@/lib/pro-services";

const text = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
const APP_URL = (process.env.APP_URL ?? "https://www.roomsnow.co.uk").replace(/\/$/, "");

type Expert = { name: string; role: string; specialism: string; hourlyRate: number };

/** The info pack for one service, as HTML and plain text. Same content goes to the provider and to RoomsNow. */
function pack(service: ProService, ref: string, opts: { expert?: Expert | null; hours?: number | null; business: boolean; intro: string }) {
  const list = (items: string[]) => `<ul style="margin:0 0 16px; padding-left:20px;">${items.map((i) => `<li style="margin:0 0 6px;">${escapeHtml(i)}</li>`).join("")}</ul>`;
  const h = (t: string) => `<p style="margin:18px 0 8px; font-weight:bold; color:#171F2E;">${escapeHtml(t)}</p>`;
  const prices = [...service.prices];
  if (opts.expert) {
    const hours = opts.hours ?? 1;
    prices.unshift({
      label: `${opts.expert.name}, ${opts.expert.role}`,
      price: `${money(opts.expert.hourlyRate)}/hour`,
      detail: `${opts.expert.specialism}. ${sessionLabel(hours)}: ${money(sessionPrice(opts.expert.hourlyRate, hours, opts.business))}${opts.business ? " with your Business 10% discount" : ""}.`,
    });
  }
  const priceLines = prices.map((p) => `${p.label}: ${p.price} (${p.detail}${p.includes ? ` Includes: ${p.includes.join("; ")}.` : ""})`);
  const demoUrl = `${APP_URL}/demos/${DEMO_SLUG[service.key]}`;
  const closing = `If you have a question or want to go ahead, reply to this email and keep reference ${ref} in the subject so we can pick up your enquiry. A copy of this pack has been sent to RoomsNow for our records.`;

  const html = [
    `<p style="margin:0 0 14px;">${escapeHtml(opts.intro)}</p>`,
    `<p style="margin:0 0 14px; font-size:18px; font-weight:bold; color:#171F2E;">${escapeHtml(service.headline)}</p>`,
    `<p style="margin:0 0 14px;">${escapeHtml(service.helps)}</p>`,
    `<p style="margin:0 0 14px;"><a href="${demoUrl}" style="color:#1666AA; font-weight:bold;">&#9654; Watch the 16-second demo</a> &nbsp;·&nbsp; The full information pack is attached as a PDF.</p>`,
    h("What you get"),
    list(service.outcomes),
    h("Prices (plus VAT)"),
    list(priceLines),
    `<p style="margin:0 0 14px; font-size:14px;">${escapeHtml(service.terms)}</p>`,
    h("Next steps"),
    `<ol style="margin:0 0 16px; padding-left:20px;">${service.nextSteps.map((s) => `<li style="margin:0 0 6px;">${escapeHtml(s)}</li>`).join("")}</ol>`,
    `<p style="margin:0;">${escapeHtml(closing)}</p>`,
  ].join("");

  const plain = [
    opts.intro,
    "",
    service.headline,
    service.helps,
    `Watch the 16-second demo: ${demoUrl}`,
    "The full information pack is attached as a PDF.",
    "",
    "WHAT YOU GET",
    ...service.outcomes.map((o) => `- ${o}`),
    "",
    "PRICES (PLUS VAT)",
    ...priceLines.map((p) => `- ${p}`),
    service.terms,
    "",
    "NEXT STEPS",
    ...service.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    "",
    closing,
    `Reference: ${ref}`,
  ].join("\n");
  return { html, plain };
}

/** A provider asks about a Pro Service: store it, email them the pack and copy RoomsNow, all under one reference. */
export async function proServiceEnquiryAction(form: FormData) {
  const { user, companyId } = await requireCompany();
  const serviceKey = String(form.get("service") ?? "");
  if (!isProServiceKey(serviceKey)) redirect("/provider/pro-services?error=service");
  const service = PRO_SERVICES[serviceKey];
  const back = (q: string) => redirect(`/provider/pro-services?${q}#${serviceKey.toLowerCase()}`);

  const limits = await planLimits(companyId);
  if (!canUseProServices(limits.membership.tier)) back("error=plan");
  if (!(await rateLimit(`pro-enquiry:${user.id}`, LIMITS.proEnquiry)).ok) back("error=busy");

  let expert: (Expert & { id: string }) | null = null;
  let hours: number | null = null;
  const planInput = String(form.get("plan") ?? "");
  const plan = serviceKey === "EXPERT" && EXPERT_PLANS.includes(planInput) ? planInput : null;
  if (serviceKey === "EXPERT") {
    const expertId = String(form.get("expertId") ?? "");
    expert = expertId ? await db.proExpert.findFirst({ where: { id: expertId, active: true }, select: { id: true, name: true, role: true, specialism: true, hourlyRate: true } }) : null;
    const h = Number(form.get("hours"));
    hours = (SESSION_HOURS as readonly number[]).includes(h) ? h : 1;
  }

  // Optional call or meeting request.
  const meetingInput = String(form.get("meetingType") ?? "");
  const meetingType = isMeetingType(meetingInput) ? meetingInput : null;
  const meetingDate = String(form.get("meetingDate") ?? "");
  const wish = meetingType && meetingDate ? meetingWish(meetingDate, String(form.get("meetingWindow") ?? "")) : null;
  if (meetingType && meetingDate && !wish) back("error=meeting");
  const meetingLine = meetingType ? `${MEETING_TYPES[meetingType]}${wish ? ` on ${wish}` : ", any weekday that suits"}` : null;

  const company = user.staffOf.find((s) => s.companyId === companyId)?.company;
  const contactName = `${user.firstName} ${user.lastName}`.trim();
  const ref = reference("PS");
  const enquiry = await db.proServiceEnquiry.create({
    data: {
      reference: ref,
      service: serviceKey,
      expertId: expert?.id ?? null,
      expertName: expert?.name ?? null,
      hours,
      companyId,
      companyName: company?.name ?? "Unknown provider",
      userId: user.id,
      contactName,
      contactEmail: user.email,
      phone: text(form, "phone", 30) || null,
      meetingType,
      meetingWish: meetingType ? (wish ?? "Any weekday") : null,
      message: [plan && `Option: ${plan}`, text(form, "message", 1500)].filter(Boolean).join("\n") || null,
    },
  });

  const business = limits.membership.tier === "BUSINESS";
  const toProvider = pack(service, ref, { expert, hours, business, intro: `Hi ${user.firstName}, thanks for asking about ${service.name}. Here is everything you need to decide, with prices and next steps.${meetingLine ? ` You asked for a ${meetingLine.charAt(0).toLowerCase()}${meetingLine.slice(1)}. We'll email you to confirm the time.` : ""}` });
  const details = [
    `Provider: ${enquiry.companyName} (${limits.membership.name} plan)`,
    `Contact: ${contactName}, ${user.email}${enquiry.phone ? `, ${enquiry.phone}` : ""}`,
    expert ? `Expert: ${expert.name}, ${sessionLabel(hours ?? 1)}` : "",
    meetingLine ? `Wants: ${meetingLine}. Confirm it on the admin page.` : "",
    enquiry.message ? `Their message: ${enquiry.message}` : "Their message: none",
    `Admin: ${APP_URL}/admin/pro-services`,
  ].filter(Boolean);
  const toRoomsNow = pack(service, ref, { expert, hours, business, intro: `New Pro Services enquiry. Reply to this email to answer the provider directly.\n${details.join("\n")}` });

  // The detailed PDF guide, stamped with the reference so the email trail and the document match.
  const attachments = [{ filename: packFileName(serviceKey).replace(".pdf", `-${ref}.pdf`), content: buildProPack(serviceKey, { reference: ref, preparedFor: enquiry.companyName, siteUrl: APP_URL }) }];

  let sent = false;
  try {
    await sendEmail({
      to: user.email,
      subject: packSubject(service, ref),
      text: toProvider.plain,
      html: renderEmail({ preheader: service.headline, heading: escapeHtml(service.name), bodyHtml: toProvider.html, note: `Reference ${ref}. Prices are plus VAT.` }),
      replyTo: brand.supportEmail,
      attachments,
    });
    sent = true;
    await sendEmail({
      to: brand.supportEmail,
      subject: `New enquiry: ${service.name}, ${enquiry.companyName} [${ref}]`,
      text: toRoomsNow.plain,
      html: renderEmail({
        preheader: `${enquiry.companyName} asked about ${service.name}`,
        heading: escapeHtml(`New enquiry: ${service.name}`),
        bodyHtml: `<p style="margin:0 0 14px; white-space:pre-line;">${escapeHtml(details.join("\n"))}</p><hr style="border:0; border-top:1px solid #D9E2EC; margin:18px 0;" />${toProvider.html}`,
      }),
      replyTo: user.email,
      attachments,
    });
  } catch (error) {
    console.error("[pro-services] pack email failed", ref, error);
  }
  if (sent) await db.proServiceEnquiry.update({ where: { id: enquiry.id }, data: { packSentAt: new Date() } });
  await audit({ actorId: user.id, action: "pro_services.enquiry", targetType: "ProServiceEnquiry", targetId: enquiry.id, metadata: { service: serviceKey, reference: ref, emailed: sent } });
  revalidatePath("/admin/pro-services");
  back(sent ? `sent=${ref}` : `queued=${ref}`);
}

/** Admin: move an enquiry along and keep a note. */
export async function updateProEnquiryAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!isEnquiryStatus(status)) return;
  await db.proServiceEnquiry.update({ where: { id }, data: { status, adminNote: text(form, "adminNote", 2000) || null } });
  await audit({ actorId: admin.id, action: "pro_services.enquiry_update", targetType: "ProServiceEnquiry", targetId: id, metadata: { status } });
  revalidatePath("/admin/pro-services");
}

/** Admin: add or edit a manager who sells expert time. */
export async function saveProExpertAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const rate = Math.round(Number(form.get("hourlyRate")) * 100);
  const data = {
    name: text(form, "name", 80),
    role: text(form, "role", 80),
    specialism: text(form, "specialism", 160),
    bio: text(form, "bio", 800),
    hourlyRate: rate,
    active: form.get("active") === "on",
    sortOrder: Number(form.get("sortOrder")) || 0,
  };
  if (!data.name || !data.role || !data.specialism || !Number.isFinite(rate) || rate < 1000 || rate > 100000) redirect("/admin/pro-services?error=expert#experts");
  const saved = id ? await db.proExpert.update({ where: { id }, data }) : await db.proExpert.create({ data });
  await audit({ actorId: admin.id, action: id ? "pro_services.expert_update" : "pro_services.expert_create", targetType: "ProExpert", targetId: saved.id });
  revalidatePath("/admin/pro-services");
  revalidatePath("/provider/pro-services");
  redirect("/admin/pro-services?saved=1#experts");
}

/** Admin: confirm a call or meeting time. Emails the provider (with an add-to-calendar link) and copies RoomsNow on the same reference. */
export async function confirmProMeetingAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const typeInput = String(form.get("meetingType") ?? "");
  const at = londonTime(String(form.get("meetingAt") ?? ""));
  const link = text(form, "meetingLink", 300);
  const safeLink = !link || /^https:\/\/[^\s]+$/.test(link) || /^[+\d][\d\s()-]{6,}$/.test(link) || !/^\w+:/.test(link);
  if (!isMeetingType(typeInput) || !at || at.getTime() < Date.now() - 3_600_000 || !safeLink) redirect(`/admin/pro-services?error=meeting#e-${id}`);
  const enquiry = await db.proServiceEnquiry.update({
    where: { id },
    data: { meetingType: typeInput, meetingAt: at, meetingLink: link || null },
  });
  if (enquiry.status === "NEW") await db.proServiceEnquiry.update({ where: { id }, data: { status: "CONTACTED" } });

  const service = PRO_SERVICES[enquiry.service as keyof typeof PRO_SERVICES];
  const what = `${MEETING_TYPES[typeInput]}: ${service?.name ?? "Pro Services"}`;
  const when = ukMeetingTime(at);
  const how = typeInput === "VIDEO" ? (link ? `Join here: ${link}` : "We'll send the video link before the call.") : typeInput === "PHONE" ? (link ? `We'll call you on ${link}, or call us on the number above.` : `We'll call ${enquiry.phone ?? "the number on your account"}.`) : link ? `Where: ${link}` : "We'll confirm the address by email.";
  const cal = calendarLink(`RoomsNow: ${what}`, at, 60, `${how}\nReference ${enquiry.reference}`);
  const body = [`Hi ${enquiry.contactName.split(" ")[0]},`, `Your ${what.toLowerCase()} is booked for ${when} (UK time).`, how, `Need a different time? Reply to this email and keep reference ${enquiry.reference} in the subject.`];

  try {
    await sendEmail({
      to: enquiry.contactEmail,
      subject: `Booked: ${what}, ${when} [${enquiry.reference}]`,
      text: [...body, `Add to calendar: ${cal}`].join("\n\n"),
      html: renderEmail({
        preheader: `${when}, UK time`,
        heading: escapeHtml(`Your ${MEETING_TYPES[typeInput].toLowerCase()} is booked`),
        bodyHtml: body.map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p)}</p>`).join(""),
        ctaLabel: "Add to calendar",
        ctaUrl: cal,
        note: `Reference ${enquiry.reference}`,
      }),
      replyTo: brand.supportEmail,
    });
    await sendEmail({
      to: brand.supportEmail,
      subject: `Booked: ${what}, ${enquiry.companyName}, ${when} [${enquiry.reference}]`,
      text: [`Confirmed by ${admin.firstName}.`, ...body].join("\n\n"),
      replyTo: enquiry.contactEmail,
    });
  } catch (error) {
    console.error("[pro-services] meeting email failed", enquiry.reference, error);
    redirect(`/admin/pro-services?error=meeting-email#e-${id}`);
  }
  await audit({ actorId: admin.id, action: "pro_services.meeting_confirm", targetType: "ProServiceEnquiry", targetId: id, metadata: { at: at.toISOString(), type: typeInput } });
  revalidatePath("/admin/pro-services");
  revalidatePath("/provider/pro-services");
  redirect(`/admin/pro-services?booked=1#e-${id}`);
}
