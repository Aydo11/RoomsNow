import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = { title: "Stop room alerts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function stopAlert(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (/^[A-Za-z0-9_-]{20,64}$/.test(token)) await db.roomAlert.deleteMany({ where: { token } });
  redirect("/alerts/stop/done");
}

/**
 * Stop link from an alert. Uses a button rather than stopping on page load,
 * so email link-checkers that open every link can't switch alerts off.
 */
export default async function StopRoomAlertPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const done = token === "done";
  const alert = !done && /^[A-Za-z0-9_-]{20,64}$/.test(token) ? await db.roomAlert.findUnique({ where: { token }, select: { where: true } }) : null;

  return (
    <div className="shell py-14">
      <div className="card mx-auto max-w-[520px] p-7 text-center">
        {done || !alert ? (
          <>
            <h1 className="text-[24px] font-bold">Room alerts stopped</h1>
            <p className="mt-2 text-[15px] text-ink-soft">You won&apos;t get any more room alerts from us.</p>
            <Link href="/search" className="btn-secondary mt-6">
              Search rooms
            </Link>
          </>
        ) : (
          <form action={stopAlert}>
            <h1 className="text-[24px] font-bold">Stop room alerts?</h1>
            <p className="mt-2 text-[15px] text-ink-soft">You&apos;ll stop hearing about new rooms in {alert.where || "the UK"}.</p>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn-primary mt-6">
              Stop my alerts
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
