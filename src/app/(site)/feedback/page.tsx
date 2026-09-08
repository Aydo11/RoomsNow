import { FeedbackForm } from "@/components/feedback-form";
import { requireUser } from "@/lib/rbac";

export const metadata = { title: "Send feedback" };

export default async function FeedbackPage() {
  await requireUser("/feedback");
  return <div className="shell max-w-3xl py-12 sm:py-16"><span className="eyebrow">HELP IMPROVE ROOMSNOW</span><h1 className="mt-3 text-[34px] leading-tight sm:text-[42px]">Tell us what would make RoomsNow better</h1><p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-soft">Report something that is not working, suggest a feature or tell the team where the service feels unclear. Administrators and the development team can review every submission.</p><div className="mt-7"><FeedbackForm /></div></div>;
}
