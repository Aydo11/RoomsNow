import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="shell max-w-md py-16">
      <Link href="/login" className="text-[14px] text-ink-soft hover:text-ink">← Back to sign in</Link>
      <h1 className="mt-4 text-[30px]">Reset your password</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">Enter your email and we&apos;ll send a secure link that works for one hour.</p>
      <ForgotPasswordForm />
    </div>
  );
}
