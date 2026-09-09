/**
 * Demo data. Everything here is fictional: the organisations, people, addresses
 * and postcodes are invented for a working demonstration.
 *
 *   npm run db:seed
 *
 * Safe to re-run — it clears the tables it owns first.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, type AccommodationType, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "Password123!";

const day = (offset: number) => new Date(Date.now() + offset * 24 * 3600 * 1000);
const years = (age: number) => new Date(Date.now() - age * 365.25 * 24 * 3600 * 1000);
const pence = (pounds: number) => Math.round(pounds * 100);
const ref = (prefix: string, n: number) => `${prefix}-${String(n).padStart(5, "0")}`;

/** Placeholder imagery is generated locally so the demo works with no network. */
const PALETTE = ["#1666AA", "#171F2E", "#549DE5", "#244B73", "#3D6F9E", "#0E1624"];

async function writePlaceholder(name: string, label: string, index: number): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "seed");
  await mkdir(dir, { recursive: true });
  const base = PALETTE[index % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="${base}"/>
  <rect x="0" y="430" width="800" height="170" fill="rgba(0,0,0,0.18)"/>
  <g fill="rgba(255,255,255,0.14)">
    <rect x="90" y="180" width="230" height="250"/>
    <rect x="360" y="120" width="180" height="310"/>
    <rect x="580" y="220" width="150" height="210"/>
  </g>
  <text x="48" y="524" font-family="Georgia, serif" font-size="34" fill="rgba(255,255,255,0.92)">${label}</text>
  <text x="48" y="562" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.6)">Demonstration image</text>
</svg>`;
  await writeFile(path.join(dir, name), svg, "utf8");
  return `/uploads/seed/${name}`;
}

async function main() {
  console.log("Clearing existing data…");
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.notification.deleteMany(),
    db.message.deleteMany(),
    db.conversationParticipant.deleteMany(),
    db.conversation.deleteMany(),
    db.referralEvent.deleteMany(),
    db.document.deleteMany(),
    db.application.deleteMany(),
    db.referral.deleteMany(),
    db.accommodationRequest.deleteMany(),
    db.savedListing.deleteMany(),
    db.report.deleteMany(),
    db.verificationRequest.deleteMany(),
    db.lookingForAd.deleteMany(),
    db.listingMedia.deleteMany(),
    db.room.deleteMany(),
    db.listing.deleteMany(),
    db.property.deleteMany(),
    db.referrerPayment.deleteMany(),
    db.payment.deleteMany(),
    db.userMembershipGrant.deleteMany(),
    db.membershipGrant.deleteMany(),
    db.referrerSubscription.deleteMany(),
    db.subscription.deleteMany(),
    db.membership.deleteMany(),
    db.companyStaff.deleteMany(),
    db.company.deleteMany(),
    db.userProfile.deleteMany(),
    db.user.deleteMany(),
    db.supportType.deleteMany(),
    db.locationArea.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ------------------------------------------------------------ taxonomy
  const supportTypes = [
    ["mental-health", "Mental health"],
    ["homelessness", "Homelessness"],
    ["substance-misuse", "Substance misuse"],
    ["learning-disability", "Learning disability"],
    ["physical-disability", "Physical disability"],
    ["young-people", "Young people (16–25)"],
    ["care-leavers", "Care leavers"],
    ["vulnerable-adults", "Vulnerable adults"],
    ["domestic-abuse", "Domestic abuse"],
    ["ex-offenders", "Prison leavers"],
    ["other", "Other"],
  ];
  await db.supportType.createMany({
    data: supportTypes.map(([slug, label], position) => ({ slug, label, position })),
  });

  await db.locationArea.createMany({
    data: [
      { slug: "birmingham", name: "Birmingham", region: "West Midlands", latitude: 52.4862, longitude: -1.8904 },
      { slug: "manchester", name: "Manchester", region: "North West", latitude: 53.4808, longitude: -2.2426 },
      { slug: "leeds", name: "Leeds", region: "Yorkshire", latitude: 53.8008, longitude: -1.5491 },
      { slug: "bristol", name: "Bristol", region: "South West", latitude: 51.4545, longitude: -2.5879 },
      { slug: "nottingham", name: "Nottingham", region: "East Midlands", latitude: 52.9548, longitude: -1.1581 },
      { slug: "newcastle", name: "Newcastle upon Tyne", region: "North East", latitude: 54.9783, longitude: -1.6178 },
      { slug: "plymouth", name: "Plymouth", region: "South West", latitude: 50.3755, longitude: -4.1427 },
      { slug: "liverpool", name: "Liverpool", region: "North West", latitude: 53.4084, longitude: -2.9916 },
    ],
  });

  // ------------------------------------------------------------ memberships
  const [free, professional, business, referrerFree, referrerPro] = await Promise.all([
    db.membership.create({
      data: {
        tier: "FREE",
        audience: "PROVIDER",
        name: "Free",
        priceMonthly: 0,
        maxListings: 2,
        maxRooms: 10,
        maxStaff: 2,
        maxPhotos: 8,
        featuredCredits: 0,
        description: "Get started and see whether the site works for you.",
      },
    }),
    db.membership.create({
      data: {
        tier: "PROFESSIONAL",
        audience: "PROVIDER",
        name: "Professional",
        priceMonthly: pence(49),
        priceYearly: pence(490),
        maxListings: 12,
        maxRooms: 12,
        maxStaff: 8,
        maxPhotos: 20,
        videoUploads: true,
        analytics: true,
        featuredCredits: 1,
        enhancedProfile: true,
        description: "For growing providers managing up to 12 live adverts and rooms, with public location maps.",
      },
    }),
    db.membership.create({
      data: {
        tier: "BUSINESS",
        audience: "PROVIDER",
        name: "Business",
        priceMonthly: pence(149),
        priceYearly: pence(1490),
        maxListings: 25,
        maxRooms: 25,
        maxStaff: 25,
        maxPhotos: 40,
        videoUploads: true,
        analytics: true,
        priorityPlacement: true,
        featuredCredits: 5,
        enhancedProfile: true,
        prioritySupport: true,
        description: "For established providers managing up to 25 live adverts and rooms, with 25 staff accounts, public location maps and priority support.",
      },
    }),
    db.membership.create({
      data: {
        tier: "REFERRER_FREE",
        audience: "REFERRER",
        name: "Free",
        priceMonthly: 0,
        // Provider-only fields are irrelevant here but not nullable — zero
        // them out rather than leaving the provider defaults in place.
        maxListings: 0,
        maxRooms: 0,
        maxStaff: 0,
        maxClients: 5,
        maxSharesPerClient: 1,
        description: "Enough for a small caseload — try the whole flow before you commit to anything.",
      },
    }),
    db.membership.create({
      data: {
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
    }),
  ]);

  // ------------------------------------------------------------ people
  const admin = await db.user.create({
    data: {
      email: "admin@supportrooms.test",
      passwordHash,
      role: "ADMIN",
      firstName: "Ruth",
      lastName: "Adeyemi",
      locationLabel: "Bristol",
      emailVerified: new Date(),
    },
  });

  const seekerData = [
    {
      email: "jordan@example.test",
      firstName: "Jordan",
      lastName: "Whitfield",
      locationLabel: "Birmingham",
      age: 23,
      about:
        "Leaving care in the spring and looking for somewhere settled with a bit of support while I finish my apprenticeship.",
      accommodationNeeds: "A single room in a shared house, ideally near a bus route into the city centre.",
      supportNeeds: "Help with budgeting, forms and getting registered with a GP. Weekly check-ins would be plenty.",
      supportTypes: ["care-leavers", "young-people"],
      preferredLocations: ["Birmingham", "Solihull"],
      preferredTypes: ["SHARED_ACCOMMODATION", "SINGLE_ROOM"] as AccommodationType[],
      discoverable: true,
      publicProfile: true,
    },
    {
      email: "amara@example.test",
      firstName: "Amara",
      lastName: "Nwosu",
      locationLabel: "Manchester",
      age: 34,
      about:
        "Moving on from a refuge and rebuilding. I work part-time in a pharmacy and I'd like somewhere quiet and women-only.",
      accommodationNeeds: "Women-only house, own room, somewhere I can lock my door.",
      supportNeeds: "Ongoing emotional support and help with the housing register.",
      supportTypes: ["domestic-abuse", "mental-health"],
      preferredLocations: ["Manchester", "Salford"],
      preferredTypes: ["SHARED_ACCOMMODATION"] as AccommodationType[],
      genderArrangement: "FEMALE_ONLY" as const,
      discoverable: true,
      publicProfile: true,
    },
    {
      email: "kieran@example.test",
      firstName: "Kieran",
      lastName: "Doyle",
      locationLabel: "Leeds",
      age: 41,
      about: "Eight months clean. Looking for a dry house with people who get it.",
      accommodationNeeds: "Abstinence-based shared house, close to my recovery group in Headingley.",
      supportNeeds: "Structured house, keywork sessions, help getting back into work.",
      supportTypes: ["substance-misuse", "homelessness"],
      preferredLocations: ["Leeds"],
      preferredTypes: ["SHARED_ACCOMMODATION"] as AccommodationType[],
      discoverable: true,
      publicProfile: false,
    },
    {
      email: "priya@example.test",
      firstName: "Priya",
      lastName: "Raval",
      locationLabel: "Bristol",
      age: 27,
      about: "I have a learning disability and I'd like to live more independently, with staff nearby.",
      accommodationNeeds: "Self-contained flat in a scheme with staff on site.",
      supportNeeds: "Daily support with cooking, appointments and money.",
      supportTypes: ["learning-disability", "vulnerable-adults"],
      preferredLocations: ["Bristol", "Bath"],
      preferredTypes: ["SELF_CONTAINED", "FLAT"] as AccommodationType[],
      accessibilityNeeds: "Step-free access preferred.",
      discoverable: false,
      publicProfile: false,
    },
  ];

  const seekers = [];
  for (const person of seekerData) {
    const user = await db.user.create({
      data: {
        email: person.email,
        passwordHash,
        role: "USER",
        firstName: person.firstName,
        lastName: person.lastName,
        locationLabel: person.locationLabel,
        emailVerified: new Date(),
        profile: {
          create: {
            about: person.about,
            accommodationNeeds: person.accommodationNeeds,
            supportNeeds: person.supportNeeds,
            supportTypes: person.supportTypes,
            preferredLocations: person.preferredLocations,
            preferredTypes: person.preferredTypes,
            genderArrangement: person.genderArrangement ?? "ANY",
            dateOfBirth: years(person.age),
            availableFrom: day(21),
            accessibilityNeeds: person.accessibilityNeeds,
            publicProfile: person.publicProfile,
            discoverable: person.discoverable,
            showAge: true,
            showLocation: true,
          },
        },
      },
    });
    seekers.push({ user, meta: person });
  }

  const referrer = await db.user.create({
    data: {
      email: "referrer@example.test",
      passwordHash,
      role: "REFERRER",
      firstName: "Sam",
      lastName: "Okonkwo",
      locationLabel: "Birmingham",
      emailVerified: new Date(),
    },
  });

  const secondReferrer = await db.user.create({
    data: {
      email: "housingoptions@example.test",
      passwordHash,
      role: "REFERRER",
      firstName: "Elaine",
      lastName: "Marsh",
      locationLabel: "Leeds",
      emailVerified: new Date(),
    },
  });

  // ------------------------------------------------------------ providers
  const companyData = [
    {
      name: "Ashfield Supported Living",
      slug: "ashfield-supported-living",
      email: "hello@ashfieldsupported.test",
      phone: "0121 496 0182",
      city: "Birmingham",
      postcode: "B14 7QT",
      orgType: "SUPPORTED_ACCOMMODATION_PROVIDER" as const,
      about:
        "We run eight small supported houses across south Birmingham for young people leaving care and adults moving on from homelessness. Every house has a named keyworker and no more than six residents.",
      supportTypes: ["care-leavers", "young-people", "homelessness"],
      operatingAreas: ["Birmingham", "Solihull", "Sandwell"],
      verification: "APPROVED" as const,
      tier: professional,
      staff: { firstName: "Dan", lastName: "Whitcombe", email: "dan@ashfieldsupported.test" },
    },
    {
      name: "Northgate Housing Trust",
      slug: "northgate-housing-trust",
      email: "referrals@northgatetrust.test",
      phone: "0161 344 7720",
      city: "Manchester",
      postcode: "M14 5RS",
      orgType: "CHARITY" as const,
      about:
        "A registered charity providing women-only accommodation and floating support across Greater Manchester. We work closely with local refuges and the council's housing options team.",
      supportTypes: ["domestic-abuse", "mental-health", "vulnerable-adults"],
      operatingAreas: ["Manchester", "Salford", "Trafford"],
      verification: "APPROVED" as const,
      tier: business,
      staff: { firstName: "Hafsa", lastName: "Iqbal", email: "hafsa@northgatetrust.test" },
    },
    {
      name: "Beacon Recovery Homes",
      slug: "beacon-recovery-homes",
      email: "info@beaconrecovery.test",
      phone: "0113 288 4410",
      city: "Leeds",
      postcode: "LS6 3HN",
      orgType: "COMMUNITY_ORGANISATION" as const,
      about:
        "Abstinence-based houses in Leeds run by people with lived experience. Structured weeks, house meetings, and links to local recovery groups.",
      supportTypes: ["substance-misuse", "ex-offenders", "homelessness"],
      operatingAreas: ["Leeds", "Bradford"],
      verification: "PENDING" as const,
      tier: free,
      staff: { firstName: "Marcus", lastName: "Bell", email: "marcus@beaconrecovery.test" },
    },
    {
      name: "Harbourside Care Living",
      slug: "harbourside-care-living",
      email: "enquiries@harboursideliving.test",
      phone: "0117 452 3390",
      city: "Bristol",
      postcode: "BS5 9NP",
      orgType: "SUPPORTED_ACCOMMODATION_PROVIDER" as const,
      about:
        "Self-contained flats with on-site staff for adults with learning disabilities and physical disabilities. Two schemes in east Bristol, both step-free throughout.",
      supportTypes: ["learning-disability", "physical-disability", "vulnerable-adults"],
      operatingAreas: ["Bristol", "Bath", "South Gloucestershire"],
      verification: "APPROVED" as const,
      tier: professional,
      staff: { firstName: "Nadia", lastName: "Petrova", email: "nadia@harboursideliving.test" },
    },
  ];

  const companies = [];
  for (const item of companyData) {
    const company = await db.company.create({
      data: {
        name: item.name,
        slug: item.slug,
        email: item.email,
        phone: item.phone,
        city: item.city,
        postcode: item.postcode,
        orgType: item.orgType,
        about: item.about,
        supportTypes: item.supportTypes,
        operatingAreas: item.operatingAreas,
        verification: item.verification,
        verifiedAt: item.verification === "APPROVED" ? day(-45) : null,
        registrationNumber: `1${Math.floor(100000 + Math.random() * 899999)}`,
        subscription: {
          create: {
            membershipId: item.tier.id,
            status: "ACTIVE",
            currentPeriodEnd: day(23),
            billingProvider: "mock",
          },
        },
      },
    });

    const staffUser = await db.user.create({
      data: {
        email: item.staff.email,
        passwordHash,
        role: "PROVIDER",
        firstName: item.staff.firstName,
        lastName: item.staff.lastName,
        locationLabel: item.city,
        emailVerified: new Date(),
        staffOf: { create: { companyId: company.id, staffRole: "OWNER" } },
      },
    });

    if (item.tier.priceMonthly > 0) {
      await db.payment.create({
        data: {
          companyId: company.id,
          kind: "SUBSCRIPTION",
          amount: item.tier.priceMonthly,
          status: "PAID",
          description: `${item.tier.name} membership`,
          createdAt: day(-7),
        },
      });
    }

    companies.push({ company, staffUser, meta: item });
  }

  // ------------------------------------------------------------ referrer plans and clients
  await db.referrerSubscription.create({
    data: {
      userId: referrer.id,
      membershipId: referrerPro.id,
      status: "ACTIVE",
      currentPeriodEnd: day(23),
      billingProvider: "mock",
    },
  });

  const clientTyler = await db.client.create({
    data: {
      referrerId: referrer.id,
      firstName: "Tyler",
      lastName: "Brennan",
      dateOfBirth: years(19),
      phone: "07700 900142",
      preferredLocation: "South Birmingham",
      accommodationNeeds: "Single room in a supported house. Needs to be near the Number 50 bus route.",
      supportNeeds:
        "Tyler is 19 and has been in a placement that's ending. He needs support with budgeting, cooking and keeping appointments. No current risk concerns; he is engaging well with college.",
      supportTypes: ["care-leavers", "young-people"],
      riskNotes: "No known risks. Placement ends in three weeks, so timing matters.",
      status: "ACTIVE",
    },
  });

  const clientPriya = await db.client.create({
    data: {
      referrerId: referrer.id,
      firstName: "Priya",
      lastName: "Chowdhury",
      dateOfBirth: years(29),
      phone: "07700 900311",
      preferredLocation: "Birmingham",
      accommodationNeeds: "Self-contained flat, ground floor if possible.",
      supportNeeds: "Recovering from a period of poor mental health, now stable. Wants light-touch visiting support.",
      supportTypes: ["mental-health"],
      status: "ACTIVE",
    },
  });

  await db.client.create({
    data: {
      referrerId: referrer.id,
      firstName: "Owen",
      lastName: "Blackwood",
      dateOfBirth: years(34),
      preferredLocation: "Birmingham",
      accommodationNeeds: "Moved into a private tenancy in the spring.",
      supportNeeds: "Case closed — no ongoing support needed.",
      supportTypes: ["homelessness"],
      status: "PLACED",
    },
  });

  await db.clientShare.create({
    data: {
      clientId: clientTyler.id,
      companyId: companies[0].company.id,
      sharedById: referrer.id,
      note: "Flagging Tyler in case anything suitable comes up in the next few weeks — his placement ends soon.",
    },
  });

  if (companies[1]) {
    await db.clientShare.create({
      data: {
        clientId: clientPriya.id,
        companyId: companies[1].company.id,
        sharedById: referrer.id,
        note: "Priya is ready to move as soon as something suitable is free.",
      },
    });
  }

  // ------------------------------------------------------------ adverts
  type Advert = {
    company: number;
    title: string;
    summary: string;
    description: string;
    propertyName: string;
    area: string;
    postcode: string;
    latitude: number;
    longitude: number;
    accommodationType: AccommodationType;
    genderArrangement?: "ANY" | "FEMALE_ONLY" | "MALE_ONLY" | "MIXED";
    minAge?: number;
    maxAge?: number;
    rentFrom: number;
    rentTo: number;
    supportTypes: string[];
    supportDescription: string;
    supportAvailability: string;
    eligibility: string;
    referralProcess: string;
    rooms: { name: string; status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "VOID" | "MAINTENANCE" }[];
    featured?: boolean;
    status?: "ACTIVE" | "PENDING_REVIEW" | "DRAFT";
    ensuite?: boolean;
    selfContained?: boolean;
    wheelchairAccess?: boolean;
  };

  const adverts: Advert[] = [
    {
      company: 0,
      title: "Supported house for care leavers, Kings Heath",
      summary: "Six-bedroom house with a named keyworker and weekly support sessions.",
      description:
        "A settled six-bedroom house on a quiet residential street in Kings Heath, ten minutes from the high street and on two bus routes into the city centre.\n\nEach resident has their own room with a lock, and shares a large kitchen, living room and garden. A keyworker is in the house four days a week and residents have a weekly one-to-one covering whatever's useful — budgeting, benefits, college applications, or just how the week has gone.\n\nWe work with young people aged 18 to 25 leaving care or at risk of homelessness. Most people stay between twelve and eighteen months before moving on to their own tenancy, and we help with that move.",
      propertyName: "Ellesmere House",
      area: "Kings Heath",
      postcode: "B14 7QT",
      latitude: 52.4361,
      longitude: -1.8917,
      accommodationType: "SHARED_ACCOMMODATION",
      minAge: 18,
      maxAge: 25,
      rentFrom: 138,
      rentTo: 152,
      supportTypes: ["care-leavers", "young-people", "homelessness"],
      supportDescription:
        "Named keyworker, weekly one-to-one sessions, help with benefits and budgeting, support into education, training or work, and a planned move-on to independent accommodation.",
      supportAvailability: "Staff on site Monday to Thursday, 9am–5pm. On-call phone line overnight and at weekends.",
      eligibility:
        "18 to 25, leaving care or at risk of homelessness, with a local connection to Birmingham. We can't support people with high-level care needs or anyone who needs waking night staff.",
      referralProcess:
        "Referrals come from local authority leaving care teams and housing options, or you can enquire directly. We arrange an informal visit, then a needs assessment within a week.",
      rooms: [
        { name: "Room 1", status: "OCCUPIED" },
        { name: "Room 2", status: "OCCUPIED" },
        { name: "Room 3", status: "AVAILABLE" },
        { name: "Room 4", status: "AVAILABLE" },
        { name: "Room 5", status: "RESERVED" },
        { name: "Room 6", status: "MAINTENANCE" },
      ],
      featured: true,
    },
    {
      company: 0,
      title: "Two rooms in shared house, Selly Oak",
      summary: "Move-on accommodation with light-touch support for people ready for more independence.",
      description:
        "Move-on accommodation for people who have done well in higher-support housing and are ready for more independence, but aren't quite at the point of holding their own tenancy.\n\nFive bedrooms, two bathrooms, a good-sized kitchen and a small yard. Support is fortnightly rather than weekly, and residents are expected to be working, studying or actively looking.",
      propertyName: "Bournbrook Villas",
      area: "Selly Oak",
      postcode: "B29 6BD",
      latitude: 52.4396,
      longitude: -1.9354,
      accommodationType: "SHARED_ACCOMMODATION",
      minAge: 18,
      maxAge: 30,
      rentFrom: 125,
      rentTo: 135,
      supportTypes: ["young-people", "homelessness"],
      supportDescription: "Fortnightly keywork sessions, tenancy skills, employment support.",
      supportAvailability: "Visiting support, two afternoons a week.",
      eligibility: "18 to 30, ready for lower-level support, no current substance use concerns.",
      referralProcess: "Enquire through the site or ask your current keyworker to send a referral.",
      rooms: [
        { name: "Room 1", status: "AVAILABLE" },
        { name: "Room 2", status: "AVAILABLE" },
        { name: "Room 3", status: "OCCUPIED" },
        { name: "Room 4", status: "OCCUPIED" },
        { name: "Room 5", status: "OCCUPIED" },
      ],
    },
    {
      company: 1,
      title: "Women-only supported house, Fallowfield",
      summary: "Safe, quiet house for women moving on from refuge or unsafe housing.",
      description:
        "A five-bedroom women-only house in Fallowfield with a strong emphasis on safety and privacy. The address isn't published and we ask residents to keep it that way.\n\nRooms are unfurnished or furnished, whichever suits, and each has its own lock. There's a shared kitchen, two bathrooms and a small garden. Support workers visit daily on weekdays.\n\nWe work with women moving on from refuge, and with women leaving unsafe housing situations where a refuge placement isn't the right fit.",
      propertyName: "Willow House",
      area: "Fallowfield",
      postcode: "M14 6WT",
      latitude: 53.4408,
      longitude: -2.2185,
      accommodationType: "SHARED_ACCOMMODATION",
      genderArrangement: "FEMALE_ONLY",
      minAge: 18,
      rentFrom: 142,
      rentTo: 156,
      supportTypes: ["domestic-abuse", "mental-health", "vulnerable-adults"],
      supportDescription:
        "Daily visiting support, safety planning, help with the housing register, access to our counselling service, and support at court or with the police if that's needed.",
      supportAvailability: "Support workers on site weekdays 9am–6pm, out-of-hours line every night.",
      eligibility:
        "Women aged 18 and over. We can support children under two living with their mother; we don't have space for larger families.",
      referralProcess:
        "Referrals from refuges, IDVAs, social workers and housing options teams. Self-referrals welcome — call us and we'll talk it through.",
      rooms: [
        { name: "Room 1", status: "OCCUPIED" },
        { name: "Room 2", status: "AVAILABLE" },
        { name: "Room 3", status: "OCCUPIED" },
        { name: "Room 4", status: "OCCUPIED" },
        { name: "Room 5", status: "AVAILABLE" },
      ],
      featured: true,
    },
    {
      company: 1,
      title: "Self-contained flats with support, Old Trafford",
      summary: "Eight one-bedroom flats with staff on site and a communal lounge.",
      description:
        "A small scheme of eight one-bedroom flats built around a communal lounge and laundry. Each flat has its own kitchen and bathroom, so residents can be as independent as they want to be, with staff a short walk away.\n\nSuits people who have lived in shared supported housing and want their own front door, but would find a private tenancy isolating.",
      propertyName: "Rowan Court",
      area: "Old Trafford",
      postcode: "M16 0DL",
      latitude: 53.4548,
      longitude: -2.2853,
      accommodationType: "SELF_CONTAINED",
      minAge: 21,
      rentFrom: 168,
      rentTo: 184,
      supportTypes: ["mental-health", "vulnerable-adults"],
      supportDescription: "On-site staff, weekly keywork, community activities, medication prompts if needed.",
      supportAvailability: "Staff on site 8am–8pm, seven days.",
      eligibility: "21 and over, able to live independently in a self-contained flat with visiting support.",
      referralProcess: "Community mental health teams, housing options, or direct enquiry.",
      rooms: [
        { name: "Flat 1", status: "OCCUPIED" },
        { name: "Flat 2", status: "OCCUPIED" },
        { name: "Flat 3", status: "AVAILABLE" },
        { name: "Flat 4", status: "OCCUPIED" },
        { name: "Flat 5", status: "OCCUPIED" },
        { name: "Flat 6", status: "RESERVED" },
        { name: "Flat 7", status: "OCCUPIED" },
        { name: "Flat 8", status: "VOID" },
      ],
      selfContained: true,
      ensuite: true,
    },
    {
      company: 2,
      title: "Abstinence-based recovery house, Headingley",
      summary: "Structured dry house run by people with lived experience.",
      description:
        "A seven-bedroom house in Headingley run on abstinence lines. There's a house meeting every Monday, everyone is expected to be at a recovery group at least three times a week, and there's a curfew for the first month.\n\nIt suits people who have finished a detox or a rehab programme and want structure while they rebuild. Everyone on our staff team has been through recovery themselves.",
      propertyName: "Cardigan House",
      area: "Headingley",
      postcode: "LS6 3HN",
      latitude: 53.8203,
      longitude: -1.5766,
      accommodationType: "SHARED_ACCOMMODATION",
      minAge: 21,
      rentFrom: 130,
      rentTo: 130,
      supportTypes: ["substance-misuse", "ex-offenders", "homelessness"],
      supportDescription:
        "Daily structure, house meetings, one-to-one keywork, links to local fellowship meetings, and employment support from month three.",
      supportAvailability: "Staff in the house every weekday, on-call at other times.",
      eligibility:
        "21 and over, abstinent for at least 28 days, willing to sign up to the house agreement including testing.",
      referralProcess:
        "Referrals from treatment services, probation and prison resettlement teams. We'll always meet someone before offering a place.",
      rooms: [
        { name: "Room 1", status: "OCCUPIED" },
        { name: "Room 2", status: "AVAILABLE" },
        { name: "Room 3", status: "OCCUPIED" },
        { name: "Room 4", status: "OCCUPIED" },
        { name: "Room 5", status: "OCCUPIED" },
        { name: "Room 6", status: "AVAILABLE" },
        { name: "Room 7", status: "OCCUPIED" },
      ],
    },
    {
      company: 3,
      title: "Step-free supported flats, Easton",
      summary: "Six accessible flats with staff on site around the clock.",
      description:
        "Six self-contained flats, all step-free, with wide doorways, wet rooms and adjustable worktops in two of them. There's a staff office on the ground floor with someone there twenty-four hours a day.\n\nWe support adults with learning disabilities and physical disabilities to live independently, with as much or as little help as each person needs. Support is agreed individually and reviewed every three months with the person and whoever they want in the room.",
      propertyName: "Fern Lodge",
      area: "Easton",
      postcode: "BS5 9NP",
      latitude: 51.4636,
      longitude: -2.5605,
      accommodationType: "SELF_CONTAINED",
      minAge: 18,
      rentFrom: 175,
      rentTo: 195,
      supportTypes: ["learning-disability", "physical-disability", "vulnerable-adults"],
      supportDescription:
        "Personalised support with daily living, cooking, money, appointments and community activities. Waking night staff on site.",
      supportAvailability: "Staffed 24 hours, including waking nights.",
      eligibility:
        "Adults with a learning disability or physical disability who have a funded care package or are being assessed for one.",
      referralProcess:
        "Referrals through adult social care. Send an assessment and we'll respond within five working days, then arrange a visit.",
      rooms: [
        { name: "Flat 1", status: "OCCUPIED" },
        { name: "Flat 2", status: "AVAILABLE" },
        { name: "Flat 3", status: "OCCUPIED" },
        { name: "Flat 4", status: "OCCUPIED" },
        { name: "Flat 5", status: "RESERVED" },
        { name: "Flat 6", status: "OCCUPIED" },
      ],
      selfContained: true,
      ensuite: true,
      wheelchairAccess: true,
    },
    {
      company: 3,
      title: "Ground-floor flat with support, Bedminster",
      summary: "One flat available in a small scheme, staff on site weekdays.",
      description:
        "A single ground-floor flat in a four-flat scheme south of the river. Step-free, wet room, and a small private patio. Support is visiting rather than on site overnight.",
      propertyName: "Sycamore Place",
      area: "Bedminster",
      postcode: "BS3 4NH",
      latitude: 51.4386,
      longitude: -2.5966,
      accommodationType: "FLAT",
      minAge: 18,
      rentFrom: 165,
      rentTo: 165,
      supportTypes: ["learning-disability", "physical-disability"],
      supportDescription: "Visiting support agreed around the person's care plan.",
      supportAvailability: "Weekdays, hours by arrangement.",
      eligibility: "Adults with a funded care package who can be alone overnight.",
      referralProcess: "Through adult social care or a direct enquiry from a family member.",
      rooms: [
        { name: "Flat A", status: "AVAILABLE" },
        { name: "Flat B", status: "OCCUPIED" },
        { name: "Flat C", status: "OCCUPIED" },
        { name: "Flat D", status: "OCCUPIED" },
      ],
      selfContained: true,
      wheelchairAccess: true,
      status: "PENDING_REVIEW",
    },
  ];

  const created = [];
  let mediaIndex = 0;

  for (const [index, advert] of adverts.entries()) {
    const { company, staffUser } = companies[advert.company];

    const property = await db.property.create({
      data: {
        companyId: company.id,
        name: advert.propertyName,
        city: companies[advert.company].meta.city,
        area: advert.area,
        postcode: advert.postcode,
        addressLine1: `${12 + index * 7} ${advert.area} Road`,
        showExactAddress: false,
        latitude: advert.latitude,
        longitude: advert.longitude,
        propertyType: advert.accommodationType,
        bedrooms: advert.rooms.length,
        verification: companies[advert.company].meta.verification === "APPROVED" ? "APPROVED" : "NOT_REQUESTED",
      },
    });

    const status = advert.status ?? "ACTIVE";

    const listing = await db.listing.create({
      data: {
        reference: ref("SR", 1000 + index),
        companyId: company.id,
        propertyId: property.id,
        title: advert.title,
        summary: advert.summary,
        description: advert.description,
        status,
        publishedAt: status === "ACTIVE" ? day(-(index * 3 + 4)) : null,
        accommodationType: advert.accommodationType,
        genderArrangement: advert.genderArrangement ?? "ANY",
        minAge: advert.minAge,
        maxAge: advert.maxAge,
        ensuite: advert.ensuite ?? false,
        furnished: true,
        selfContained: advert.selfContained ?? false,
        sharedFacilities: !advert.selfContained,
        wheelchairAccess: advert.wheelchairAccess ?? false,
        supportTypes: advert.supportTypes,
        supportDescription: advert.supportDescription,
        supportAvailability: advert.supportAvailability,
        supportProvider: company.name,
        referralRoutes: ["SELF_REFERRAL", "PROFESSIONAL_REFERRAL", "LOCAL_AUTHORITY"],
        eligibility: advert.eligibility,
        referralProcess: advert.referralProcess,
        houseRules:
          "No smoking indoors. Visitors by arrangement and not overnight in the first month. Everyone shares the cleaning rota.",
        weeklyRentFrom: pence(advert.rentFrom),
        weeklyRentTo: pence(advert.rentTo),
        billsIncluded: true,
        housingBenefit: true,
        availableFrom: day(7 + index * 4),
        featured: advert.featured ?? false,
        featuredUntil: advert.featured ? day(30) : null,
        sponsoredBid: advert.featured ? (index === 0 ? 3 : 2) : 0,
        sponsoredImpressions: advert.featured ? 1200 + index * 240 : 0,
        sponsoredClicks: advert.featured ? 34 + index * 9 : 0,
        views: 40 + index * 37,
        enquiries: 2 + index,
      },
    });

    await db.room.createMany({
      data: advert.rooms.map((room, position) => ({
        propertyId: property.id,
        listingId: listing.id,
        name: room.name,
        status: room.status,
        weeklyRent: pence(advert.rentFrom + (position % 3)),
        ensuite: advert.ensuite ?? false,
        furnished: true,
        availableFrom: room.status === "AVAILABLE" ? day(7) : null,
      })),
    });

    for (let i = 0; i < 3; i += 1) {
      const url = await writePlaceholder(
        `listing-${index}-${i}.svg`,
        i === 0 ? advert.propertyName : `${advert.propertyName} — ${["exterior", "kitchen", "bedroom"][i]}`,
        mediaIndex,
      );
      mediaIndex += 1;
      await db.listingMedia.create({
        data: {
          listingId: listing.id,
          type: "IMAGE",
          url,
          caption: ["Front of the house", "Shared kitchen", "A typical room"][i],
          position: i,
          isPrimary: i === 0,
          mimeType: "image/svg+xml",
        },
      });
    }

    created.push({ listing, company, staffUser });
  }

  // ------------------------------------------------------------ looking-for adverts
  const lookingFor = [
    {
      user: seekers[0],
      title: "Care leaver looking for a room in south Birmingham",
      city: "Birmingham",
      budget: 150,
      types: ["SHARED_ACCOMMODATION", "SINGLE_ROOM"] as AccommodationType[],
      supportTypes: ["care-leavers", "young-people"],
    },
    {
      user: seekers[1],
      title: "Women-only house wanted in Manchester",
      city: "Manchester",
      budget: 160,
      types: ["SHARED_ACCOMMODATION"] as AccommodationType[],
      supportTypes: ["domestic-abuse", "mental-health"],
      gender: "FEMALE_ONLY" as const,
    },
    {
      user: seekers[2],
      title: "Dry house wanted in Leeds — eight months clean",
      city: "Leeds",
      budget: 140,
      types: ["SHARED_ACCOMMODATION"] as AccommodationType[],
      supportTypes: ["substance-misuse", "homelessness"],
    },
  ];

  const lookingForAds = [];
  for (const item of lookingFor) {
    const ad = await db.lookingForAd.create({
      data: {
        userId: item.user.user.id,
        title: item.title,
        city: item.city,
        radiusMiles: 10,
        accommodationTypes: item.types,
        supportTypes: item.supportTypes,
        moveInDate: day(28),
        budgetWeekly: pence(item.budget),
        genderArrangement: item.gender ?? "ANY",
        age: item.user.meta.age,
        about: item.user.meta.about,
        lookingFor: item.user.meta.accommodationNeeds,
        status: "ACTIVE",
        views: 12 + Math.floor(Math.random() * 30),
      },
    });
    lookingForAds.push(ad);
  }

  // ------------------------------------------------------------ saves, requests, referrals
  await db.savedListing.createMany({
    data: [
      { userId: seekers[0].user.id, listingId: created[0].listing.id },
      { userId: seekers[0].user.id, listingId: created[1].listing.id },
      { userId: seekers[1].user.id, listingId: created[2].listing.id },
      { userId: seekers[2].user.id, listingId: created[4].listing.id },
      { userId: seekers[3].user.id, listingId: created[5].listing.id },
    ],
  });

  const request1 = await db.accommodationRequest.create({
    data: {
      listingId: created[0].listing.id,
      applicantId: seekers[0].user.id,
      moveInDate: day(30),
      accommodationNeeds: "A single room, ideally on a bus route to Digbeth for my apprenticeship.",
      supportNeeds: "Budgeting and help sorting out my council tax and benefits.",
      additionalInfo: "My leaving care worker is Sam Okonkwo and he's happy to be contacted.",
      status: "UNDER_REVIEW",
      statusNote: "We've read your request and would like to invite you for a visit — we'll message you dates.",
      createdAt: day(-9),
    },
  });

  await db.accommodationRequest.create({
    data: {
      listingId: created[2].listing.id,
      applicantId: seekers[1].user.id,
      moveInDate: day(14),
      accommodationNeeds: "Own room with a lock, women-only house.",
      supportNeeds: "Ongoing emotional support and help with the housing register.",
      status: "ASSESSMENT",
      statusNote: "Assessment booked for next Tuesday at 2pm.",
      createdAt: day(-16),
    },
  });

  await db.accommodationRequest.create({
    data: {
      listingId: created[4].listing.id,
      applicantId: seekers[2].user.id,
      supportNeeds: "Structure, keywork, and help getting back into work.",
      status: "SUBMITTED",
      createdAt: day(-2),
    },
  });

  const referral1 = await db.referral.create({
    data: {
      reference: ref("REF", 4210),
      listingId: created[0].listing.id,
      referrerId: referrer.id,
      applicantFirstName: "Tyler",
      applicantLastName: "Brennan",
      applicantDob: years(19),
      applicantPhone: "07700 900142",
      organisation: "Birmingham City Council leaving care team",
      referrerJobTitle: "Personal adviser",
      preferredLocation: "South Birmingham",
      accommodationNeeds: "Single room in a supported house. Needs to be near the Number 50 bus route.",
      supportNeeds:
        "Tyler is 19 and has been in a placement that's ending. He needs support with budgeting, cooking and keeping appointments. No current risk concerns; he is engaging well with college.",
      supportTypes: ["care-leavers", "young-people"],
      urgency: "HIGH",
      additionalInfo: "Placement ends in three weeks so we're working to that date.",
      status: "ASSESSMENT",
      statusNote: "Visit went well. Assessment paperwork with the manager for sign-off.",
      createdAt: day(-12),
      events: {
        create: [
          { status: "SUBMITTED", note: "Referral submitted", actorId: referrer.id, createdAt: day(-12) },
          { status: "RECEIVED", note: "Received by Ashfield", actorId: companies[0].staffUser.id, createdAt: day(-11) },
          { status: "UNDER_REVIEW", note: "Reviewing against current vacancies", actorId: companies[0].staffUser.id, createdAt: day(-9) },
          { status: "ASSESSMENT", note: "Visit booked", actorId: companies[0].staffUser.id, createdAt: day(-4) },
        ],
      },
    },
  });

  await db.referral.create({
    data: {
      reference: ref("REF", 4231),
      listingId: created[4].listing.id,
      referrerId: secondReferrer.id,
      applicantFirstName: "Michael",
      applicantLastName: "Osei",
      applicantDob: years(38),
      organisation: "Leeds Housing Options",
      referrerJobTitle: "Housing options officer",
      preferredLocation: "Leeds",
      accommodationNeeds: "Dry house placement, single room.",
      supportNeeds:
        "Michael completed a community detox in the spring and has been abstinent for five months. He's attending two meetings a week and wants a structured house.",
      supportTypes: ["substance-misuse", "homelessness"],
      urgency: "MEDIUM",
      status: "OFFERED",
      statusNote: "Room 6 offered from the 14th, subject to signing the house agreement.",
      createdAt: day(-21),
      events: {
        create: [
          { status: "SUBMITTED", note: "Referral submitted", actorId: secondReferrer.id, createdAt: day(-21) },
          { status: "RECEIVED", actorId: companies[2].staffUser.id, createdAt: day(-20) },
          { status: "ASSESSMENT", note: "Met at the house", actorId: companies[2].staffUser.id, createdAt: day(-12) },
          { status: "OFFERED", note: "Room 6 offered", actorId: companies[2].staffUser.id, createdAt: day(-3) },
        ],
      },
    },
  });

  await db.application.createMany({
    data: [
      { listingId: created[0].listing.id, requestId: request1.id },
      { listingId: created[0].listing.id, referralId: referral1.id },
    ],
  });

  // ------------------------------------------------------------ conversations
  const conversation = await db.conversation.create({
    data: {
      subject: created[0].listing.title,
      listingId: created[0].listing.id,
      companyId: created[0].company.id,
      lastMessageAt: day(-1),
      participants: {
        create: [
          { userId: seekers[0].user.id, lastReadAt: day(-1) },
          { userId: created[0].staffUser.id, companyId: created[0].company.id },
        ],
      },
    },
  });

  await db.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: seekers[0].user.id,
        body: "Hi — I've sent a request for Ellesmere House. Is Room 3 still free, and would I be able to come and see it?",
        createdAt: day(-5),
      },
      {
        conversationId: conversation.id,
        senderId: created[0].staffUser.id,
        body: "Hi Jordan, thanks for getting in touch. Room 3 is still available. We do visits on Tuesday and Thursday afternoons — would either of those work for you?",
        createdAt: day(-4),
      },
      {
        conversationId: conversation.id,
        senderId: seekers[0].user.id,
        body: "Thursday would be better for me, after 3 if that's alright. Is it okay if my leaving care worker comes too?",
        createdAt: day(-1),
      },
    ],
  });

  const conversation2 = await db.conversation.create({
    data: {
      subject: "Women-only supported house, Fallowfield",
      listingId: created[2].listing.id,
      companyId: created[2].company.id,
      lastMessageAt: day(-2),
      participants: {
        create: [
          { userId: seekers[1].user.id },
          { userId: created[2].staffUser.id, companyId: created[2].company.id, lastReadAt: day(-2) },
        ],
      },
    },
  });

  await db.message.createMany({
    data: [
      {
        conversationId: conversation2.id,
        senderId: created[2].staffUser.id,
        body: "Hi Amara, we've booked your assessment for Tuesday at 2pm. You're welcome to bring someone with you. I'll send the address separately.",
        createdAt: day(-2),
      },
    ],
  });

  // ------------------------------------------------------------ verification, reports, notifications
  await db.verificationRequest.create({
    data: {
      companyId: companies[2].company.id,
      type: "COMPANY",
      status: "PENDING",
      submittedBy: companies[2].staffUser.id,
      note: "Community interest company registration and public liability certificate attached.",
      createdAt: day(-3),
    },
  });

  await db.report.create({
    data: {
      reporterId: seekers[2].user.id,
      targetType: "LISTING",
      targetId: created[1].listing.id,
      reason: "INCORRECT_INFORMATION",
      detail: "The advert says bills are included but I was told on the phone that electricity is extra.",
      status: "OPEN",
      createdAt: day(-4),
    },
  });

  await db.notification.createMany({
    data: [
      {
        userId: seekers[0].user.id,
        type: "REQUEST",
        title: "Your request has been updated",
        body: "Ashfield Supported Living moved your request to under review.",
        href: "/dashboard/requests",
        createdAt: day(-3),
      },
      {
        userId: seekers[0].user.id,
        type: "MESSAGE",
        title: "New message from Ashfield Supported Living",
        href: "/messages",
        createdAt: day(-4),
        readAt: day(-4),
      },
      {
        userId: seekers[1].user.id,
        type: "REQUEST",
        title: "Assessment booked",
        body: "Northgate Housing Trust booked your assessment for Tuesday at 2pm.",
        href: "/dashboard/requests",
        createdAt: day(-2),
      },
      {
        userId: referrer.id,
        type: "REFERRAL",
        title: `Referral ${referral1.reference} updated`,
        body: "Status: assessment.",
        href: `/referrals/${referral1.id}`,
        createdAt: day(-4),
      },
      {
        userId: admin.id,
        type: "SYSTEM",
        title: "Verification request submitted",
        body: "Beacon Recovery Homes sent documents for manual verification.",
        href: "/admin/verification",
        createdAt: day(-3),
      },
    ],
  });

  const auditEntries: Prisma.AuditLogCreateManyInput[] = [
    { actorId: companies[0].staffUser.id, action: "listing.created", targetType: "Listing", targetId: created[0].listing.id, createdAt: day(-14) },
    { actorId: admin.id, action: "admin.listing_approved", targetType: "Listing", targetId: created[0].listing.id, createdAt: day(-13) },
    { actorId: referrer.id, action: "referral.created", targetType: "Referral", targetId: referral1.id, createdAt: day(-12) },
    { actorId: companies[0].staffUser.id, action: "room.status_changed", targetType: "Room", targetId: created[0].listing.id, createdAt: day(-6) },
    { actorId: admin.id, action: "admin.verification_approved", targetType: "Company", targetId: companies[1].company.id, createdAt: day(-45) },
  ];
  await db.auditLog.createMany({ data: auditEntries });

  console.log(`
Seed complete.

  Everyone's password: ${PASSWORD}

  Admin       admin@supportrooms.test
  Seekers     jordan@example.test, amara@example.test, kieran@example.test, priya@example.test
  Providers   dan@ashfieldsupported.test, hafsa@northgatetrust.test,
              marcus@beaconrecovery.test, nadia@harboursideliving.test
  Referrers   referrer@example.test (Pro plan, 3 clients, 2 shared profiles),
              housingoptions@example.test (Free plan)

  ${created.length} adverts, ${lookingForAds.length} looking-for adverts, 3 requests, 2 referrals.
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
