import Link from "next/link";
import { ResendVerificationForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Verify your email" };
export const dynamic = "force-dynamic";

function homeFor(role: string) {
  return role === "ADMIN"
    ? "/admin"
    : role === "PROVIDER"
      ? "/provider"
      : role === "REFERRER"
        ? "/referrals"
        : role === "SERVICE_PROVIDER"
          ? "/service-provider"
          : "/dashboard";
}

function Tick() {
  return (
    <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-pine/10 text-pine">
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const confirmed = query.result === "success" || query.result === "already";
  const user = confirmed ? await getCurrentUser() : null;

  if (confirmed) {
    return (
      <div className="shell max-w-xl py-14">
        <div className="card p-6 sm:p-8">
          <Tick />
          <p className="eyebrow mt-5">Secure account</p>
          <h1 className="mt-2 text-[30px]">{query.result === "already" ? "Your email is already verified" : "Email verified"}</h1>
          {user ? (
            <>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Thank you{user.firstName ? `, ${user.firstName}` : ""}. Your email address is confirmed and{" "}
                <strong className="text-ink">you&apos;re now signed in</strong>. There&apos;s no need to log in again.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={homeFor(user.role)} className="btn-primary">Go to my dashboard</Link>
                {user.role === "USER" && <Link href="/search" className="btn-secondary">Find a room</Link>}
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Your email address is confirmed. <strong className="text-ink">Please log back in</strong> with the email
                and password you signed up with to carry on.
              </p>
              <Link href="/login?verified=1" className="btn-primary mt-6">Log back in</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shell max-w-xl py-14">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Secure account</p>
        <h1 className="mt-2 text-[30px]">Check your email</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          {query.result === "expired" || query.result === "invalid"
            ? "That verification link is invalid or has expired. Request a fresh one below."
            : "We sent a 24-hour verification link. Press the button in the email and we'll confirm your address and sign you in straight away."}
        </p>
        <ResendVerificationForm initialEmail={query.email ?? ""} />
      </div>
    </div>
  );
}
