import { Suspense } from "react";
import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Keep people on track if they already have an account (e.g. from an advert's WhatsApp button).
  const loginHref = next && next.startsWith("/") && !next.startsWith("//") ? `/login?next=${encodeURIComponent(next)}` : "/login";
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
        Already registered? <Link href={loginHref} className="text-pine-dark underline">Sign in</Link>
      </p>
    </div>
  );
}
