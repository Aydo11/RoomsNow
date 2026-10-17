import Link from "next/link";
import { redirect } from "next/navigation";
import { pendingTwoStep } from "@/lib/session";
import { TwoStepLoginForm } from "@/components/two-step-forms";

export const metadata = { title: "Enter your code", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TwoStepLoginPage() {
  if (!(await pendingTwoStep())) redirect("/login?expired=1");
  return (
    <div className="shell max-w-md py-16">
      <h1 className="text-[30px]">Enter your code</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Open your authenticator app and type the 6-digit code for RoomsNow.</p>
      <TwoStepLoginForm />
      <p className="mt-6 text-[14px] text-ink-soft">
        Not you, or need to start again? <Link href="/login" className="text-pine-dark underline">Back to sign in</Link>
      </p>
    </div>
  );
}
