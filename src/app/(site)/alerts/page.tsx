import { RoomAlertForm } from "@/components/room-alert-form";
import { whatsappEnabled } from "@/lib/notify";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "Room Alerts on WhatsApp & Email",
  description: "Get a message as soon as a supported or HMO room comes up in your area. Free, no account needed, stop any time.",
  path: "/alerts",
});

export default async function RoomAlertsPage({ searchParams }: { searchParams: Promise<{ where?: string }> }) {
  const { where } = await searchParams;
  const whatsapp = whatsappEnabled();
  return (
    <main className="shell grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_440px] lg:items-start">
      <div>
        <span className="eyebrow">Free room alerts</span>
        <h1 className="mt-3 max-w-[18ch] text-[34px] leading-tight sm:text-[48px]">Be first to hear when a room comes up</h1>
        <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-ink-soft">
          Rooms go fast. Tell us where you need to live and we&apos;ll {whatsapp ? "message you on WhatsApp" : "email you"} the moment a new room is listed there, so you can ask about it straight away.
        </p>
        <ul className="mt-6 space-y-2 text-[16px]">
          <li>✅ Free, no account needed</li>
          <li>✅ Only rooms in the area you choose</li>
          <li>✅ Up to 3 alerts a day, stop any time</li>
        </ul>
      </div>
      <RoomAlertForm where={where?.slice(0, 60) ?? ""} whatsapp={whatsapp} />
    </main>
  );
}
