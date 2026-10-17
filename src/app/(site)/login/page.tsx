import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";
import { FormSuccess } from "@/components/ui";
import { authHref } from "@/lib/auth-navigation";
import { brand } from "@/brand.config";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; changed?: string; reset?: string; verified?: string; oauth?: string; expired?: string }> }) {
  const query = await searchParams;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <div className="shell max-w-md py-16">
      <h1 className="text-[30px]">Sign in</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Welcome back to {brand.name}.</p>
      {(query.changed || query.reset) && <div className="mt-5"><FormSuccess message="Your password was updated. Sign in with your new password." /></div>}
      {query.verified && <div className="mt-5"><FormSuccess message="Your email is verified. You can now sign in." /></div>}
      {query.expired && <p className="mt-5 rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay">That sign-in took too long. Please sign in again.</p>}
      {query.oauth === "no-account" && <p className="mt-5 rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay">No {brand.name} account uses that Google email yet. Create an account first, then Google sign-in will work.</p>}
      {query.oauth === "failed" && <p className="mt-5 rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay">Google sign-in could not be completed. Please try again.</p>}
      <Suspense fallback={null}>
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>
      <p className="mt-6 text-[15px] text-ink-soft">
        No account yet? <Link href={authHref("/register", query.next)} className="text-pine-dark underline">Create one</Link>
      </p>
    </div>
  );
}
