import { authHref } from "@/lib/auth-navigation";
import { Suspense } from "react";
import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; type?: string }> }) {
  const { next, type } = await searchParams;
  const isRoomSeeker = !["PROVIDER", "REFERRER", "SERVICE_PROVIDER"].includes(type ?? "USER");
  // Keep people on track if they already have an account (e.g. from an advert's WhatsApp button).
  const loginHref = authHref("/login", next);
  return (
    <div className="shell max-w-lg py-8 sm:py-14">
      <h1 className="text-[32px]">Create an account</h1>
      <p className="mt-2 max-w-[56ch] text-[16px] leading-relaxed text-ink-soft">
        {isRoomSeeker
          ? "Save rooms, message providers and choose new-room alerts. Your account is free; start with email and password."
          : "Choose what you want to do, then add your details below."}
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
