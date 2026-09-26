import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

/** Bottom navigation. Mobile is where most people looking for a room will be. */
export async function MobileTabs() {
  const user = await getCurrentUser();
  const unreadMessages = user
    ? await db.conversationParticipant.count({
        where: {
          userId: user.id,
          conversation: { messages: { some: { senderId: { not: user.id }, readAt: null } } },
        },
      })
    : 0;

  const isProvider = user?.role === "PROVIDER";
  const isServiceBusiness = user?.role === "SERVICE_PROVIDER";
  const tabs: [string, string, React.ReactNode][] = [
    ["Home", "/", <path key="h" d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z" />],
    isServiceBusiness
      ? ["Adverts", "/service-provider/adverts", <path key="s" d="M4 5h16v14H4V5Zm4 4h8M8 13h5" />]
      : [isProvider ? "People" : "Search", isProvider ? "/people" : "/search", <path key="s" d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm10 17-5-5" />],
    ["Messages", "/messages", <path key="m" d="M4 5h16v11H8l-4 4V5Z" />],
    [isServiceBusiness ? "Quotes" : "Requests", isServiceBusiness ? "/service-provider/quotes" : isProvider ? "/provider/requests" : "/dashboard/requests", <path key="r" d="M6 3h9l5 5v13H6V3Zm8 0v6h6M9 13h7M9 17h5" />],
    ["Profile", user ? (isServiceBusiness ? "/service-provider" : isProvider ? "/provider" : "/dashboard") : "/login", <path key="p" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-4 3.6-6 8-6s8 2 8 6" />],
  ];

  return (
    <nav className="mobile-tabs fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map(([label, href, icon]) => (
          <li key={label}>
            <Link href={href} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-ink-soft">
              <span className="relative">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
                {label === "Messages" && unreadMessages > 0 && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-pine" />
                )}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
