import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getListing } from "@/server/search";
import { effectiveProviderTier } from "@/lib/entitlements";
import { whatsappAccess } from "@/lib/whatsapp-access";
import { whatsappAdvertUrl } from "@/lib/whatsapp";
import { absoluteUrl } from "@/lib/seo";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { alertAdminsOfWhatsappClick } from "@/lib/whatsapp-clicks";

export const dynamic = "force-dynamic";

/**
 * The advert's WhatsApp button goes through here so every click is counted
 * (for the admin WhatsApp report and the provider's advert stats) before the
 * person is sent on: to WhatsApp if signed in, otherwise to sign-up first.
 * Repeat clicks by the same person within 10 minutes count once.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const [listing, user] = await Promise.all([getListing(listingId), getCurrentUser()]);
  const advert = absoluteUrl(`/listings/${listingId}`);
  if (!listing) return NextResponse.redirect(absoluteUrl("/search"));

  const target =
    listing.status === "ACTIVE" &&
    listing.company.status === "ACTIVE" &&
    whatsappAccess(effectiveProviderTier(listing.company), listing.company.whatsappAddonStatus, listing.company).allowed
      ? whatsappAdvertUrl(listing.company.whatsappEnabled, listing.company.whatsappNumber, listing.title, advert)
      : null;
  if (!target) return NextResponse.redirect(advert);

  const isOwner = user?.staffOf.some((s) => s.companyId === listing.companyId) ?? false;
  if (!isOwner && user?.role !== "ADMIN") {
    try {
      const viewer = user?.id ?? (await callerIp());
      const fresh = await rateLimit(`whatsapp:${listing.id}:${viewer}`, { limit: 1, windowMs: 10 * 60_000 });
      if (fresh.ok) {
        await db.$transaction([
          db.whatsappClick.create({ data: { listingId: listing.id, companyId: listing.companyId, userId: user?.id ?? null, signedIn: Boolean(user) } }),
          db.listing.update({ where: { id: listing.id }, data: { whatsappClicks: { increment: 1 } } }),
        ]);
        // Let RoomsNow admins know straight away (not awaited: never slow the redirect).
        void alertAdminsOfWhatsappClick({ listingTitle: listing.title, providerName: listing.company.name, userId: user?.id ?? null });
      }
    } catch (error) {
      // Never block someone from getting in touch because counting failed.
      console.error("[whatsapp-click] could not record", error);
    }
  }

  if (!user) {
    return NextResponse.redirect(absoluteUrl(`/register?type=USER&next=${encodeURIComponent(`/listings/${listing.id}#message`)}`));
  }
  return NextResponse.redirect(target);
}
