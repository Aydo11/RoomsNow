import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <div className="shell max-w-md py-16">
      <Link href="/login" className="text-[14px] text-ink-soft hover:text-ink">← Back to sign in</Link>
      <h1 className="mt-4 text-[30px]">Choose a new password</h1>
      {token ? <ResetPasswordForm token={token} /> : <p className="mt-5 rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay-dark">This reset link is incomplete. Request a new one from the sign-in page.</p>}
    </div>
  );
}
