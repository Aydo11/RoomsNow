export type GuideSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  audience: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  introduction: string;
  sections: GuideSection[];
  faqs: Array<{ question: string; answer: string }>;
  sources: Array<{ label: string; href: string }>;
  cta: { title: string; body: string; label: string; href: string };
};

export const guides: Guide[] = [
  {
    slug: "how-to-find-an-hmo-room",
    title: "How to find an HMO room in the UK",
    description: "A practical step-by-step guide to searching for an HMO room, comparing adverts, arranging viewings and checking the details before you agree to rent.",
    eyebrow: "ROOM SEARCH GUIDE",
    audience: "People looking for a room",
    readTime: "6 minute read",
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    introduction: "Finding a shared home is easier when you decide what you need before you start contacting landlords. This guide takes you from the first search to a confident enquiry.",
    sections: [
      {
        heading: "1. Set your non-negotiables",
        paragraphs: ["Start with the area, maximum weekly or monthly cost and the earliest date you can move. Then list the details that would make a room unsuitable, such as stairs, an unfurnished room or a home that cannot accept your referral route."],
        bullets: ["Preferred town, neighbourhood or travel radius", "Total rent and whether bills are included", "Move-in date and expected length of stay", "Furnished, ensuite, accessibility and parking needs", "Any support need or professional referral requirement"],
      },
      {
        heading: "2. Compare the whole advert",
        paragraphs: ["A low headline rent does not tell you the full cost or whether the household will suit you. Compare the room, shared spaces, bills, deposit, house rules, current availability and who manages the property.", "Save a shortlist and contact the provider when something is unclear. Ask the same questions for each room so that your comparison is fair."],
      },
      {
        heading: "3. Understand whether it is an HMO",
        paragraphs: ["An HMO is generally a property rented by at least three people who are not from one household and who share facilities such as a kitchen or bathroom. Licensing rules depend on the property and area, so ask the landlord and check with the local council if you are unsure."],
      },
      {
        heading: "4. View before you decide",
        paragraphs: ["Where possible, see the room and shared areas before paying or signing anything. Check that the advert matches the property, meet the landlord or authorised agent and ask who else lives in the home. Use the viewing checklist in our separate guide so you do not have to remember everything on the day."],
      },
      {
        heading: "5. Confirm the agreement and costs",
        paragraphs: ["Ask for the proposed tenancy or licence agreement and read it before agreeing. Confirm the rent, deposit, bills, payment dates, notice terms and any charges in writing. Do not send money because someone is pressuring you to act immediately."],
      },
    ],
    faqs: [
      { question: "Can I search for an HMO room without an account?", answer: "Yes. RoomsNow lets you browse public vacancy details first. You need an account when you are ready to save, message or submit a request." },
      { question: "Should I pay before viewing a room?", answer: "Be cautious about paying before you have verified the property, the person offering it and the written terms. Never pay simply because someone is creating artificial urgency." },
      { question: "How do I know whether an HMO needs a licence?", answer: "Licensing depends on the number of occupants, the property and local council rules. Ask the landlord and check the relevant council's public information or register." },
    ],
    sources: [
      { label: "GOV.UK: Houses in multiple occupation", href: "https://www.gov.uk/private-renting/houses-in-multiple-occupation" },
      { label: "Shelter England: HMO advice", href: "https://england.shelter.org.uk/housing_advice/private_renting/houses_in_multiple_occupation_hmo" },
    ],
    cta: { title: "Ready to see what is available?", body: "Search current HMO rooms and compare the details supplied by each provider.", label: "Search HMO rooms", href: "/search" },
  },
  {
    slug: "hmo-room-viewing-checklist",
    title: "HMO room viewing checklist",
    description: "Use this room viewing checklist to compare an HMO safely, including costs, shared spaces, fire safety, repairs, housemates and the tenancy agreement.",
    eyebrow: "PRACTICAL CHECKLIST",
    audience: "People viewing a shared home",
    readTime: "7 minute read",
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    introduction: "A good viewing checks more than the bedroom. Take this list with you, make notes and ask for written answers when a cost or responsibility is not clear.",
    sections: [
      {
        heading: "Before the viewing",
        bullets: ["Confirm the full address and who will meet you", "Ask what identification or documents you should bring", "Write down the advertised rent, deposit, bills and move-in date", "Tell someone where you are going and avoid carrying cash", "Prepare questions about the agreement and household"],
      },
      {
        heading: "Inside the bedroom",
        bullets: ["Check the door and windows close and lock properly", "Look for damp, mould, pests, leaks or damaged surfaces", "Check heating, ventilation, plug sockets and natural light", "Confirm which furniture and storage will remain", "Ask whether you can decorate, work from home or have visitors"],
      },
      {
        heading: "Shared rooms and facilities",
        bullets: ["Check whether the kitchen and bathrooms are enough for the number of residents", "Look at food storage, cooking facilities, hot water and laundry arrangements", "Ask how cleaning, bins, gardens and shared supplies are managed", "Check the route out of the building and that communal areas are clear", "Ask about parking, cycle storage and public transport"],
      },
      {
        heading: "Safety and property management",
        paragraphs: ["The government advises prospective tenants to look at fire, gas and electrical safety, damp, security, overcrowding and shared facilities. Ask who handles repairs and how to report an urgent problem."],
        bullets: ["Ask to see the current gas safety information if gas is supplied", "Look for working smoke alarms and clear escape routes", "Ask about electrical checks and who manages repairs", "Confirm the landlord, agent or provider's full name and contact details", "Ask whether the property requires an HMO licence and how to verify it"],
      },
      {
        heading: "Money and paperwork",
        bullets: ["Confirm the rent period and every bill that is included", "Ask for the deposit amount and how it will be protected where the rules require it", "Read the tenancy or licence agreement before signing", "Check notice periods, house rules and any extra charges", "Get a receipt and written record for every payment"],
      },
      {
        heading: "After the viewing",
        paragraphs: ["Compare your notes with the original advert. If the price, room or person offering it changed unexpectedly, pause and verify the details. A legitimate provider should give you time to read the agreement and answer reasonable questions."],
      },
    ],
    faqs: [
      { question: "What should I ask the current housemates?", answer: "If they are available and comfortable talking, ask how repairs are handled, whether shared areas stay clean, what the noise is like and how bills or household tasks are organised." },
      { question: "What are warning signs during a viewing?", answer: "Be careful if you cannot verify the address or provider, are refused written terms, see serious safety or repair issues, or are pressured to transfer money immediately." },
      { question: "Who can confirm local HMO licensing rules?", answer: "The local council for the property can explain its HMO licensing scheme and how to check a licence." },
    ],
    sources: [
      { label: "GOV.UK: How to rent a safe home", href: "https://www.gov.uk/government/publications/how-to-rent-a-safe-home/how-to-rent-a-safe-home" },
      { label: "Shelter England: Checks before you move in", href: "https://england.shelter.org.uk/housing_advice/private_renting/checks_before_you_move_in" },
    ],
    cta: { title: "Put the checklist to use", body: "Browse live adverts, shortlist suitable rooms and arrange viewings directly with providers.", label: "Find a room", href: "/search" },
  },
  {
    slug: "what-is-an-hmo",
    title: "What is an HMO? A simple guide for tenants",
    description: "Learn what an HMO is, how shared facilities and HMO licensing work, what to check before renting and how HMO rooms differ from other accommodation.",
    eyebrow: "HMO EXPLAINED",
    audience: "New and existing tenants",
    readTime: "5 minute read",
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    introduction: "HMO means house in multiple occupation. The term describes a particular kind of shared rented home and can affect the standards and licensing rules that apply.",
    sections: [
      {
        heading: "The basic HMO definition",
        paragraphs: ["In England and Wales, a property is generally an HMO when at least three tenants live there, form more than one household and share a toilet, bathroom or kitchen. A household can be one person or members of the same family living together.", "Housing rules differ across the UK, so use the guidance for the nation and council where the property is located."],
      },
      {
        heading: "When does an HMO need a licence?",
        paragraphs: ["In England and Wales, a large HMO normally needs a licence when five or more people from more than one household share facilities. Councils can also require other HMOs to be licensed under local schemes. Scotland and Northern Ireland have their own rules.", "Ask the landlord whether a licence is required and check with the local authority. A room advert or a platform verification badge is not a substitute for that check."],
      },
      {
        heading: "What living in an HMO is like",
        paragraphs: ["Most residents have a private bedroom and share a kitchen, bathroom or living room. The exact arrangement varies: some rooms are ensuite, some rents include bills and some properties have formal cleaning for communal areas."],
        bullets: ["Find out how many people share each bathroom and kitchen", "Ask which bills are included and how usage is managed", "Read the house rules for guests, noise, cleaning and smoking", "Check locks, storage and how repairs are reported", "Meet other residents when possible"],
      },
      {
        heading: "Landlord responsibilities",
        paragraphs: ["HMO managers have responsibilities for fire safety, water supply, gas and electrical safety, shared areas, waste facilities and avoiding overcrowding. Exact duties depend on the property and local rules. Report a problem to the landlord or manager and get housing advice if it is not resolved."],
      },
      {
        heading: "HMO rooms on RoomsNow",
        paragraphs: ["RoomsNow lets independent providers advertise individual rooms and describe rent, availability, facilities, support and referral routes. The provider remains responsible for the property, legal compliance and deciding whether an applicant is suitable."],
      },
    ],
    faqs: [
      { question: "Is every shared house an HMO?", answer: "No. The legal definition considers the number of people, whether they form separate households and which facilities they share." },
      { question: "Does HMO always mean supported accommodation?", answer: "No. An HMO describes the housing arrangement. Some HMOs provide support services, while many are ordinary private shared homes." },
      { question: "Can I check an HMO licence?", answer: "Contact or visit the website of the local council where the property is located. Councils can explain whether a licence is required and how their register can be checked." },
    ],
    sources: [
      { label: "GOV.UK: Houses in multiple occupation", href: "https://www.gov.uk/private-renting/houses-in-multiple-occupation" },
      { label: "Shelter England: Houses in multiple occupation", href: "https://england.shelter.org.uk/housing_advice/private_renting/houses_in_multiple_occupation_hmo" },
    ],
    cta: { title: "Search shared homes with clearer details", body: "Compare HMO rooms by location, availability, rent and facilities.", label: "Search HMO rooms", href: "/hmo-rooms" },
  },
  {
    slug: "supported-accommodation-referral-guide",
    title: "How to make a supported accommodation referral",
    description: "A practical guide for support workers and housing professionals who need to search vacancies, prepare applicant information and make a supported accommodation referral.",
    eyebrow: "FOR PROFESSIONAL REFERRERS",
    audience: "Social workers and support teams",
    readTime: "6 minute read",
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    introduction: "A strong referral gives the provider enough relevant information to assess suitability while following your organisation's consent, privacy and safeguarding procedures.",
    sections: [
      {
        heading: "1. Confirm the person's housing route",
        paragraphs: ["Before searching, establish who is responsible for the referral, any assessment or funding decision still needed, and whether the person can self-refer. Local pathways and provider criteria vary."],
      },
      {
        heading: "2. Define the placement requirements",
        bullets: ["Preferred and acceptable locations", "Move-in timescale and urgency", "Shared or self-contained accommodation", "Accessibility, communication and cultural needs", "Support needs, risks and protective factors", "Funding or benefit position where relevant", "Areas or household arrangements that would be unsuitable"],
      },
      {
        heading: "3. Check live vacancy details",
        paragraphs: ["Search current adverts before sharing personal information. Compare the intended resident group, support offered, staffing, accessibility, cost, availability and accepted referral route. Contact the provider for anything the advert does not make clear."],
      },
      {
        heading: "4. Prepare a proportionate referral",
        paragraphs: ["Follow your organisation's lawful basis, consent and information-sharing procedures. Provide accurate information needed for assessment, explain current risks with relevant context and avoid adding unrelated personal details."],
      },
      {
        heading: "5. Keep decisions and next steps clear",
        paragraphs: ["Record when the referral was sent, who received it and what the next stage is. A referral does not guarantee a placement. The provider and the professionals involved still need to confirm suitability, funding, safeguarding arrangements and the person's views before move-in."],
      },
    ],
    faqs: [
      { question: "Who can make a referral on RoomsNow?", answer: "RoomsNow referrer accounts are designed for authorised professionals working with an organisation and arranging accommodation for another person." },
      { question: "Does a referral guarantee a room?", answer: "No. Availability can change and the provider must assess suitability and eligibility before offering a placement." },
      { question: "What if the need is urgent or someone is in danger?", answer: "Use the appropriate emergency, safeguarding or statutory homelessness route. A marketplace referral is not an emergency response service." },
    ],
    sources: [
      { label: "GOV.UK: Guide to the duty to refer", href: "https://www.gov.uk/government/publications/homelessness-duty-to-refer/a-guide-to-the-duty-to-refer" },
      { label: "ICO: Data sharing information hub", href: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/" },
    ],
    cta: { title: "Start with current vacancies", body: "Search by location, support need and referral route before preparing a referral.", label: "Search supported accommodation", href: "/search" },
  },
];

export function findGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
