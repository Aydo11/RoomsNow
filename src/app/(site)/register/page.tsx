import { Suspense } from "react";
import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <div className="shell max-w-2xl py-14">
      <h1 className="text-[32px]">Create an account</h1>
      <p className="mt-2 max-w-[56ch] text-[16px] leading-relaxed text-ink-soft">
        We only ask for what we need to get you started. You can add the rest later, and you choose
        what other people can see.
      </p>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
      <p className="mt-6 text-[15px] text-ink-soft">
        Already registered? <Link href="/login" className="text-pine-dark underline">Sign in</Link>
      </p>
    </div>
  );
}
