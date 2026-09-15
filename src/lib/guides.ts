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
  {
    slug: "hmo-licensing-explained",
    title: "HMO licensing explained: do you need a licence?",
    description: "A plain-English guide to HMO licensing in the UK, covering mandatory licensing, additional and selective licensing schemes, how to check with your council and what happens if a licence is missing.",
    eyebrow: "FOR LANDLORDS AND PROVIDERS",
    audience: "Landlords and accommodation providers",
    readTime: "6 minute read",
    publishedAt: "2026-09-15",
    updatedAt: "2026-09-15",
    introduction: "HMO licensing rules decide whether a landlord must apply to the council before letting a shared property. The rules depend on the number of occupants, the property and the local area, so this guide explains the main categories and how to check your own position.",
    sections: [
      {
        heading: "Mandatory licensing",
        paragraphs: ["In England and Wales, a large HMO normally needs a mandatory licence when it is occupied by five or more people forming more than one household and sharing facilities such as a kitchen or bathroom. This applies regardless of the number of storeys the property has.", "Mandatory licensing is set nationally, so it applies in every council area once a property meets the threshold. It does not depend on a local scheme being in place."],
      },
      {
        heading: "Additional and selective licensing",
        paragraphs: ["Many councils also run additional licensing schemes covering smaller HMOs that fall below the mandatory threshold, and some run selective licensing schemes covering most private rented properties in a defined area, HMO or not. These schemes are set locally and vary significantly between councils and even between streets in the same town.", "This means two similar properties in different council areas — or even different parts of the same city — can face different licensing requirements. Always check with the specific local authority rather than assuming a national rule applies."],
      },
      {
        heading: "How to check whether your property needs a licence",
        bullets: ["Search the council's website for \"HMO licensing\" or \"private rented licensing\"", "Look for a public register of licensed HMOs in the area", "Contact the council's private housing or environmental health team directly", "Ask whether an additional or selective licensing scheme currently covers the property's street or ward", "Re-check after any change in occupancy, since crossing the five-person threshold can trigger mandatory licensing"],
      },
      {
        heading: "What a licence covers",
        paragraphs: ["A licence is normally granted to a specific person for a specific property and sets conditions on matters such as room sizes, fire safety, gas and electrical safety, waste disposal and management standards. Licences are usually time-limited and need renewing.", "Meeting licensing conditions does not remove other landlord obligations, such as gas safety checks, electrical safety checks, deposit protection and general repairing obligations, which apply whether or not a property needs a licence."],
      },
      {
        heading: "What happens if a licensable property isn't licensed",
        paragraphs: ["Operating an HMO that should be licensed without a valid licence is a legal offence and councils can take enforcement action, including financial penalties. It can also affect a landlord's ability to serve certain eviction notices. If you are unsure whether your property needs a licence, it is worth resolving that with the council before advertising or letting rooms, rather than after."],
      },
    ],
    faqs: [
      { question: "Does a five-bedroom house always need an HMO licence?", answer: "Not necessarily. It depends on how many people actually live there and whether they form more than one household, not simply the number of bedrooms. A five-bedroom house let to a single family would not need an HMO licence." },
      { question: "Do the rules differ in Scotland and Northern Ireland?", answer: "Yes. Scotland and Northern Ireland run their own HMO licensing systems, separate from the England and Wales mandatory licensing threshold described here. Check the relevant national guidance for the property's location." },
      { question: "Can RoomsNow tell me if my property needs a licence?", answer: "No. RoomsNow does not assess licensing status. Providers are responsible for confirming their own licensing position with the local council before advertising a property." },
    ],
    sources: [
      { label: "GOV.UK: Landlord licensing of rented properties", href: "https://www.gov.uk/guidance/local-housing-authority-licensing-of-privately-rented-properties" },
      { label: "GOV.UK: Houses in multiple occupation", href: "https://www.gov.uk/private-renting/houses-in-multiple-occupation" },
    ],
    cta: { title: "Ready to advertise your property?", body: "List your HMO rooms and vacancies once you've confirmed your licensing position with your local council.", label: "Advertise accommodation", href: "/advertise-accommodation" },
  },
  {
    slug: "what-is-supported-exempt-accommodation",
    title: "What is supported exempt accommodation?",
    description: "An explainer on supported exempt accommodation in the UK: what makes accommodation exempt, how housing benefit works differently, and what to check as a tenant, provider or referrer.",
    eyebrow: "SUPPORTED HOUSING EXPLAINED",
    audience: "Tenants, providers and referrers",
    readTime: "5 minute read",
    publishedAt: "2026-09-15",
    updatedAt: "2026-09-15",
    introduction: "Supported exempt accommodation is a specific legal category of supported housing that is treated differently for housing benefit purposes. The term causes confusion because it describes a funding and regulatory status, not a single type of building or service.",
    sections: [
      {
        heading: "What makes accommodation \"exempt\"",
        paragraphs: ["Accommodation is generally described as exempt when it is provided by a non-metropolitan county council, housing association, registered charity or voluntary organisation, and the resident also receives a level of care, support or supervision from, or arranged by, that provider or landlord. This combination takes the housing benefit calculation outside the standard local housing allowance rules that apply to most private rented and social housing.", "Because the housing benefit rules are different, exempt accommodation can charge a higher, individually assessed rent than the standard local allowance would normally allow, intended to reflect the cost of providing support alongside the housing."],
      },
      {
        heading: "Why the sector has faced scrutiny",
        paragraphs: ["The rapid growth of supported exempt accommodation in some areas, and concerns about the quality of support actually being delivered relative to the rents charged, has led to increased council and government scrutiny, including new local authority licensing and oversight powers introduced through housing legislation. Standards and enforcement approaches continue to vary between local authorities."],
      },
      {
        heading: "What tenants should check",
        bullets: ["What specific support is promised, and how often it is actually provided", "Whether the rent and service charge are clearly broken down", "Who is responsible for repairs and day-to-day property management", "What happens if the support is not delivered as described", "Whether the accommodation and provider have been through any local authority accreditation or licensing scheme"],
      },
      {
        heading: "What providers and referrers should know",
        paragraphs: ["Providers offering supported exempt accommodation should be able to clearly describe the support they deliver, how it is staffed, and how it complies with any local authority accreditation, licensing or quality framework that applies in that area. Referrers should factor this into their own due diligence rather than relying on a listing description alone.", "RoomsNow does not determine a property's exempt accommodation status or verify the support delivered. That responsibility sits with the provider, the local authority and the professionals involved in a placement."],
      },
    ],
    faqs: [
      { question: "Is all supported housing \"exempt accommodation\"?", answer: "No. Exempt accommodation specifically refers to the housing benefit treatment that applies when qualifying support is provided alongside housing by an eligible landlord type. Some supported housing is funded differently." },
      { question: "Does exempt status mean the accommodation is regulated or inspected?", answer: "Not automatically. Some local authorities run their own accreditation or licensing schemes for supported exempt accommodation, but this varies by area. Ask the local authority what applies locally." },
      { question: "Who can I ask if I'm unsure about a specific property's status?", answer: "The provider should be able to explain the funding and support arrangement. For independent confirmation, contact the local authority's housing benefit or supported housing team." },
    ],
    sources: [
      { label: "GOV.UK: Supported housing guidance", href: "https://www.gov.uk/guidance/supported-housing-in-england" },
      { label: "Shelter England: Supported housing", href: "https://england.shelter.org.uk/housing_advice/homelessness/supported_housing" },
    ],
    cta: { title: "Search supported accommodation", body: "Compare vacancies and ask each provider about their support offer before you decide.", label: "Search supported accommodation", href: "/supported-accommodation" },
  },
  {
    slug: "how-much-does-an-hmo-room-cost",
    title: "How much does an HMO room cost? A rent guide",
    description: "What affects HMO room rent across the UK, what's usually included in the price, typical extra costs like deposits and bills, and how to compare adverts fairly.",
    eyebrow: "COSTS AND BUDGETING",
    audience: "People looking for a room",
    readTime: "5 minute read",
    publishedAt: "2026-09-15",
    updatedAt: "2026-09-15",
    introduction: "HMO room rents vary enormously by city, neighbourhood and what's included, which makes it hard to compare adverts at a glance. This guide breaks down what actually drives the price so you can budget realistically and compare like with like.",
    sections: [
      {
        heading: "What drives the rent",
        bullets: ["Location: city and neighbourhood typically have the biggest effect on price", "Room size and whether it is ensuite or shares a bathroom", "Whether bills, WiFi and council tax are included", "Furnished versus unfurnished", "Number of people sharing the kitchen and communal areas", "Proximity to transport links, universities or employment hubs"],
      },
      {
        heading: "Bills-included versus bills-excluded",
        paragraphs: ["Many HMO rooms are advertised with bills included, which can make budgeting simpler but usually means a higher headline rent than a bills-excluded room in a similar property. When comparing two adverts, always check exactly which bills are covered — gas, electricity, water, WiFi and council tax are not always all included — and add an estimate for anything excluded before comparing the total cost."],
      },
      {
        heading: "Deposits and upfront costs",
        paragraphs: ["Most providers ask for a deposit, commonly equivalent to a set number of weeks' or months' rent, plus the first period's rent in advance. Where the rules require it, a deposit for an assured shorthold tenancy in England and Wales should be protected in a government-approved scheme, and the landlord must give you certain information about this within a set timeframe.", "Ask what the deposit covers, how disputes are handled, and get everything in writing before you pay anything."],
      },
      {
        heading: "Comparing adverts fairly",
        paragraphs: ["Work out the true total monthly cost for each room you're considering: rent, plus any bills not included, plus a share of council tax if relevant. A cheaper headline rent with several bills excluded can end up costing more than a bills-included room once everything is added up."],
      },
    ],
    faqs: [
      { question: "Is rent for an HMO room usually cheaper than a self-contained flat?", answer: "Generally yes, since you're sharing facilities and costs with other residents, but this depends heavily on location, room size and what's included. Compare the total monthly cost rather than the headline rent alone." },
      { question: "How much deposit should I expect to pay?", answer: "This varies by provider and property. Ask what the deposit is, whether it will be protected where the rules require it, and what conditions apply to getting it back." },
      { question: "Can I negotiate the rent on an HMO room?", answer: "Some providers may be open to discussion, particularly for a room that has been vacant for a while, but this is entirely down to the individual provider." },
    ],
    sources: [
      { label: "GOV.UK: Tenancy deposit protection", href: "https://www.gov.uk/deposit-protection-schemes-and-landlords" },
      { label: "Shelter England: Paying rent and bills", href: "https://england.shelter.org.uk/housing_advice/private_renting" },
    ],
    cta: { title: "Compare current room prices", body: "See live rent and bills information across HMO rooms currently advertised on RoomsNow.", label: "Search HMO rooms", href: "/hmo-rooms" },
  },
  {
    slug: "hmo-tenant-rights",
    title: "Your rights as an HMO tenant",
    description: "A guide to the basic legal protections that apply to most HMO tenants in the UK, covering safety standards, deposits, repairs, eviction notices and where to get help.",
    eyebrow: "TENANT RIGHTS",
    audience: "People renting a room",
    readTime: "6 minute read",
    publishedAt: "2026-09-15",
    updatedAt: "2026-09-15",
    introduction: "Living in an HMO doesn't mean giving up the legal protections that apply to renters generally. This guide covers the areas that most commonly matter to HMO tenants, though the detail can depend on your specific tenancy type and location.",
    sections: [
      {
        heading: "Safety standards",
        paragraphs: ["Landlords and managers of HMOs have specific legal duties covering fire safety, escape routes, gas safety, electrical safety, and avoiding overcrowding. Larger and licensable HMOs are subject to additional management regulations covering matters like fire detection equipment and the condition of communal areas.", "If you have concerns about safety in your HMO, raise them with the landlord or managing agent in writing first, and contact the local council's environmental health team if the issue is not addressed."],
      },
      {
        heading: "Deposits",
        paragraphs: ["If you have an assured shorthold tenancy in England or Wales, any deposit you pay should be protected in a government-approved tenancy deposit scheme within a set number of days, and you should be given prescribed information about where it is held. Some licence agreements (rather than tenancies) work differently — check which type of agreement you have and ask if you're not sure."],
      },
      {
        heading: "Repairs and your landlord's responsibilities",
        paragraphs: ["Landlords are generally responsible for keeping the structure, exterior, and key installations such as heating, water and sanitation in good repair. Report repair issues in writing, keep a copy, and follow up if nothing happens within a reasonable time. Persistent unresolved repair problems, particularly ones affecting health and safety, can be reported to the local council."],
      },
      {
        heading: "Eviction notices",
        paragraphs: ["A landlord normally has to follow a legal process to end a tenancy, which usually means giving a valid written notice and, if you don't leave, applying to court for a possession order. The exact notice type, length and process depend on your tenancy type and the reason given. You do not have to leave simply because a landlord asks you to — get advice if you're unsure whether a notice is valid."],
      },
      {
        heading: "Where to get help",
        paragraphs: ["If you're dealing with a serious repairs issue, a disputed deposit, an eviction notice or harassment, independent advice services can explain your specific rights and options. Acting early, and keeping written records of everything, makes it much easier to resolve a problem."],
      },
    ],
    faqs: [
      { question: "Do these rights apply if I have a licence agreement rather than a tenancy?", answer: "Some protections, particularly around deposit protection and certain eviction rules, are specific to assured shorthold tenancies. A genuine licence agreement (for example, in some live-in landlord situations) can work differently. Check which type of agreement you have, and get advice if you're unsure." },
      { question: "Can my landlord enter my room without notice?", answer: "Landlords generally need to give reasonable notice, normally at least 24 hours, before entering your room except in a genuine emergency. Check your specific agreement for any additional terms." },
      { question: "What should I do if I think I'm being illegally evicted?", answer: "Do not leave the property, and seek advice as soon as possible from an independent housing advice service or your local council, since illegal eviction is a serious matter with specific legal protections." },
    ],
    sources: [
      { label: "Shelter England: Repairs and safety", href: "https://england.shelter.org.uk/housing_advice/repairs" },
      { label: "GOV.UK: Evicting tenants", href: "https://www.gov.uk/evicting-tenants" },
    ],
    cta: { title: "Looking for your next room?", body: "Compare current HMO vacancies and read the full details each provider has published.", label: "Search HMO rooms", href: "/hmo-rooms" },
  },
];

export function findGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
