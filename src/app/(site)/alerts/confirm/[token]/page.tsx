import Link from "next/link";
import { db } from "@/lib/db";

export const metadata = { title: "Room alerts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The link in the first alert message. Confirms the address and starts alerts. */
export default async function ConfirmRoomAlertPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const alert = /^[A-Za-z0-9_-]{20,64}$/.test(token) ? await db.roomAlert.findUnique({ where: { token } }) : null;
  if (alert && !alert.confirmedAt) await db.roomAlert.update({ where: { id: alert.id }, data: { confirmedAt: new Date() } });

  return (
    <div className="shell py-14">
      <div className="card mx-auto max-w-[520px] p-7 text-center">
        {alert ? (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-pine-light text-pine-dark" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className="mt-4 text-[26px] font-bold">Your room alerts are on</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              We&apos;ll tell you when a room comes up in {alert.where || "the UK"}. Every message has a link to stop them.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link href={`/search${alert.where ? `?where=${encodeURIComponent(alert.where)}` : ""}`} className="btn-primary">
                See rooms free now
              </Link>
              <Link href="/register?type=USER" className="btn-secondary">
                Create a free account to save rooms and message providers
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-bold">This link has expired</h1>
            <p className="mt-2 text-[15px] text-ink-soft">Set up your room alert again and we&apos;ll send a new link.</p>
            <Link href="/search" className="btn-primary mt-6">
              Search rooms
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
