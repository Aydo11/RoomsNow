"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fieldErrors, type FormState } from "@/lib/validation";
import { text } from "../form";
import { encodeFeedback } from "@/lib/feedback";

const feedbackSchema = z.object({
  category: z.enum(["BUG", "FEATURE", "EXPERIENCE", "CONTENT", "OTHER"]),
  title: z.string().trim().min(4, "Give your feedback a short title.").max(100),
  message: z.string().trim().min(10, "Tell us a little more so we can act on it.").max(3000),
  pageUrl: z.string().trim().max(500).refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ["roomsnow.co.uk", "www.roomsnow.co.uk"].includes(url.hostname) && ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }, "Enter a valid RoomsNow page address.").optional().or(z.literal("")),
});

export async function createFeedbackAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/feedback");
  const throttle = await rateLimit(`feedback:${user.id}`, LIMITS.feedback);
  if (!throttle.ok) return { ok: false, errors: { form: "You've sent several items recently. Please give the team time to review them." } };
  const parsed = feedbackSchema.safeParse({ category: text(formData, "category"), title: text(formData, "title"), message: text(formData, "message"), pageUrl: text(formData, "pageUrl") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const feedback = await db.report.create({ data: { reporterId: user.id, targetType: "USER", targetId: user.id, reason: "OTHER", detail: encodeFeedback(parsed.data.category, parsed.data.title, parsed.data.message, parsed.data.pageUrl || undefined) } });
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  await Promise.all(admins.map((admin) => notify({ userId: admin.id, type: "SYSTEM", title: "New site feedback", body: parsed.data.title, href: "/admin/feedback" })));
  await audit({ actorId: user.id, action: "feedback.created", targetType: "Feedback", targetId: feedback.id, metadata: { category: parsed.data.category } });
  revalidatePath("/admin/feedback");
  return { ok: true, message: "Thanks — your feedback is now with the RoomsNow team." };
}
