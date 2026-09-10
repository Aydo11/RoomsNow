/**
 * Upserts the membership catalogue (provider + referrer plans) without
 * touching anything else. Safe to re-run.
 *
 *   npm run db:seed-memberships
 *
 * Use this instead of the full `db:seed` on a database that already has
 * real users/listings/referrals on it — `db:seed` clears those tables first,
 * this doesn't touch them.
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();
const pence = (pounds: number) => Math.round(pounds * 100);

const memberships: Prisma.MembershipCreateInput[] = [
{
tier: "FREE",
audience: "PROVIDER",
name: "Free",
priceMonthly: 0,
maxListings: 2,
maxRooms: 10,
maxStaff: 2,
maxPhotos: 8,
featuredCredits: 0,
includedBoosts: 0,
description: "Get started and see whether the site works for you.",
},
{
tier: "PROFESSIONAL",
audience: "PROVIDER",
name: "Professional",
priceMonthly: pence(49),
priceYearly: pence(490),
maxListings: 15,
maxRooms: -1,
maxStaff: 8,
maxPhotos: 20,
videoUploads: true,
analytics: true,
featuredCredits: 1,
includedBoosts: 3,
enhancedProfile: true,
description: "For growing providers managing up to 15 live property adverts, with unlimited rooms, public location maps and 3 included 24-hour boosts per billing period. Includes one free 7-day sponsored placement running at a time.",
},
{
tier: "BUSINESS",
audience: "PROVIDER",
name: "Business",
priceMonthly: pence(149),
priceYearly: pence(1490),
maxListings: 25,
maxRooms: -1,
maxStaff: 25,
maxPhotos: 40,
videoUploads: true,
analytics: true,
priorityPlacement: true,
featuredCredits: 2,
includedBoosts: 1,
enhancedProfile: true,
prioritySupport: true,
description: "For larger portfolios managing up to 25 live property adverts, with unlimited rooms, 25 staff accounts, public location maps and 1 included 24-hour boost per billing period. Includes two free 7-day sponsored placements running at a time.",
},
{
tier: "REFERRER_FREE",
audience: "REFERRER",
name: "Free",
priceMonthly: 0,
maxListings: 0,
maxRooms: 0,
maxStaff: 0,
maxClients: 5,
maxSharesPerClient: 1,
description: "Enough for a small caseload — try the whole flow before you commit to anything.",
},
{
tier: "REFERRER_PRO",
audience: "REFERRER",
name: "Pro",
priceMonthly: pence(19),
priceYearly: pence(190),
maxListings: 0,
maxRooms: 0,
maxStaff: 0,
maxClients: -1,
maxSharesPerClient: -1,
priorityRouting: true,
description: "For referral agencies and professionals managing a full caseload — unlimited clients and provider sharing.",
},
];

async function main() {
for (const m of memberships) {
await db.membership.upsert({
where: { tier: m.tier },
create: m,
update: m,
});
console.log(`Upserted membership: ${m.tier}`);
}
}

main()
.catch((error) => {
console.error(error);
process.exit(1);
})
.finally(() => db.$disconnect());
