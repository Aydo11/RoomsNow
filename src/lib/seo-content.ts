import type { LandingPageContent } from "@/components/seo-landing-page";

export const hmoRoomsContent: LandingPageContent = {
  path: "/hmo-rooms",
  eyebrow: "HMO ROOMS ACROSS THE UK",
  title: "Find HMO rooms to rent",
  introduction: "Search rooms in houses in multiple occupation (HMOs), shared homes and specialist accommodation advertised by UK housing providers. Compare location, rent, facilities, availability and referral routes in one place.",
  highlights: [
    { heading: "Search live vacancies", body: "See room-level availability and move-in dates supplied by the provider." },
    { heading: "Compare what matters", body: "Filter by area, accommodation type, rent, facilities, accessibility and support needs." },
    { heading: "Contact providers", body: "Send a request or message through RoomsNow while keeping your contact details private." },
  ],
  sections: [
    { heading: "What is an HMO room?", paragraphs: ["An HMO is a home shared by people from more than one household. Residents usually have their own bedroom and share facilities such as a kitchen, bathroom or living area. Some properties also offer ensuite rooms or self-contained facilities.", "The provider or landlord is responsible for explaining the tenancy, house rules, bills, deposit, licensing position and any eligibility requirements. RoomsNow presents the information supplied with each advert so you can decide which providers to contact."] },
    { heading: "Search for a suitable shared home", paragraphs: ["A suitable room is about more than a postcode. Check the weekly rent, whether bills are included, when the room becomes available, the household arrangement and the facilities you will share.", "RoomsNow also includes supported, transitional and adult social care accommodation. Use the support and referral filters when you need a placement with particular services or an accepted professional referral route."] },
  ],
  faqs: [
    { question: "Can I search HMO rooms for free?", answer: "You can browse public RoomsNow accommodation adverts and compare the details supplied by providers. An account is needed for messaging, saving adverts or sending an accommodation request." },
    { question: "Are bills included with an HMO room?", answer: "This varies by property. Each advert can state whether bills are included, along with the weekly rent and available facilities." },
    { question: "Does RoomsNow manage the properties?", answer: "No. RoomsNow is a marketplace connecting people and professional referrers with independent accommodation providers." },
    { question: "What's the difference between an HMO and an ordinary shared house?", answer: "Both involve sharing a home with people outside your household, but an HMO is a specific legal category with facility-sharing and, above certain thresholds, licensing requirements. Ask the provider whether the property is licensed if it needs to be." },
    { question: "Do I need references or a guarantor for an HMO room?", answer: "This depends on the provider. Some ask for references, proof of income or a guarantor, and others do not. Check the advert or ask the provider directly before applying." },
    { question: "Can I view an HMO room before paying anything?", answer: "Reputable providers normally let you view a room, or at least answer detailed questions, before you commit to any payment. Be cautious of anyone asking for money before you have seen the property or verified who they are." },
  ],
  primaryCta: { label: "Search HMO rooms", href: "/search" },
  secondaryCta: { label: "Advertise an HMO vacancy", href: "/advertise-accommodation" },
};

export const supportedAccommodationContent: LandingPageContent = {
  path: "/supported-accommodation",
  eyebrow: "SUPPORTED HOUSING VACANCIES",
  title: "Find supported accommodation",
  introduction: "Search supported housing vacancies across the UK by location, support need, accommodation type, availability and accepted referral route.",
  highlights: [
    { heading: "Filter by support need", body: "Search categories including mental health, homelessness, learning disability, care leavers and prison leavers." },
    { heading: "Refer professionally", body: "Case workers and support teams can send structured referrals directly to participating providers." },
    { heading: "Track availability", body: "Providers maintain their own room status, property details and application routes." },
  ],
  sections: [
    { heading: "Supported accommodation in one searchable place", paragraphs: ["Supported accommodation combines housing with support intended to help a person live safely and build independence. The exact service, staffing, eligibility and funding arrangements differ between providers.", "RoomsNow lets people looking for accommodation and professionals compare published vacancies without relying on disconnected vacancy lists. Each advert can explain the support offered, the people it is intended for, the rent, facilities and referral process."] },
    { heading: "How to enquire or make a referral", paragraphs: ["Individuals can create an account, search vacancies and send an accommodation request. Professional referrers can keep client information private, choose a suitable advert and submit the information requested by the provider.", "The accommodation provider makes all assessment, eligibility and placement decisions. RoomsNow does not assess needs, inspect properties or provide regulatory approval."] },
  ],
  faqs: [
    { question: "Who can apply for supported accommodation?", answer: "Eligibility depends on the provider, service and funding route. Check the advert and ask the provider about its assessment criteria." },
    { question: "Can a support worker make a referral?", answer: "Participating providers can accept professional and local authority referrals through RoomsNow. The accepted routes are shown on each advert." },
    { question: "Is every provider verified?", answer: "Verification is shown where RoomsNow has checked the provider's stated identity and documents. It is not an inspection, accreditation or confirmation of regulatory status." },
    { question: "What support categories does supported accommodation cover?", answer: "Providers on RoomsNow advertise accommodation across categories including mental health support, homelessness prevention, learning disabilities, autism, care leavers, young people, ex-offenders and domestic abuse recovery. Use the search filters to narrow results to a specific category." },
    { question: "Is supported accommodation the same as supported living?", answer: "The terms overlap but are not always identical. \"Supported accommodation\" often describes services for people who need help building independence, while \"supported living\" more commonly describes longer-term housing with care for people with disabilities. Check the specific service description on each advert rather than relying on the label alone." },
    { question: "Does supported accommodation cost anything?", answer: "This depends on the funding route, provider and local authority arrangements. Some placements are funded through housing benefit or local authority commissioning, while others may involve a service charge. Ask the provider directly about costs and funding before proceeding." },
  ],
  primaryCta: { label: "Search supported accommodation", href: "/search" },
  secondaryCta: { label: "Make a professional referral", href: "/accommodation-referrals" },
};

export const transitionalAccommodationContent: LandingPageContent = {
  path: "/transitional-accommodation",
  eyebrow: "MOVE-ON AND TRANSITIONAL HOUSING",
  title: "Search transitional accommodation",
  introduction: "Find transitional, temporary and move-on accommodation advertised by housing providers across the UK, including shared rooms and self-contained options.",
  highlights: [
    { heading: "See available homes", body: "Search published vacancies by area and expected move-in date." },
    { heading: "Understand each route", body: "Check whether a provider accepts self-referrals, professional referrals or local authority referrals." },
    { heading: "Match practical needs", body: "Compare rent, accessibility, furnishing, household arrangement and facilities." },
  ],
  sections: [
    { heading: "What transitional accommodation means", paragraphs: ["Transitional accommodation is housing intended to support a move between temporary circumstances and a more settled home. It can include shared housing, move-on accommodation and other time-limited arrangements.", "Providers use different terms and operate different eligibility, support and length-of-stay rules. Read the full advert and confirm the arrangement directly with the provider before making a decision."] },
    { heading: "A clearer vacancy and referral process", paragraphs: ["RoomsNow brings property details, current room availability and referral routes together. People can request accommodation for themselves, while authorised professionals can submit a structured referral for someone they support.", "Providers receive requests and referrals in one place and update their progress through assessment, offer and move-in stages."] },
  ],
  faqs: [
    { question: "Is transitional accommodation the same as emergency accommodation?", answer: "Not always. Emergency accommodation is usually intended for an immediate crisis, while transitional housing often supports a planned move toward longer-term accommodation." },
    { question: "How long can someone stay?", answer: "The provider sets the length and terms of each placement. Ask the provider about any time limit before accepting an offer." },
    { question: "Can I search by move-in date?", answer: "Yes. RoomsNow adverts can include availability dates, and the search includes a move-in filter." },
    { question: "Who typically uses transitional accommodation?", answer: "It is commonly used by people moving on from a hostel, refuge, supported placement or temporary local authority housing, as well as anyone who needs a time-limited home while they arrange something more settled." },
    { question: "Can I self-refer, or do I need a professional referral?", answer: "It varies by provider. Some transitional accommodation accepts direct applications from individuals, while other places are reserved for local authority or professional referral routes. Each advert should state which routes the provider accepts." },
    { question: "What happens at the end of a transitional placement?", answer: "The provider should discuss move-on plans with you before your placement ends. Ask about this during your initial enquiry so you understand what support, if any, is available when the placement finishes." },
  ],
  primaryCta: { label: "Search available accommodation", href: "/search" },
  secondaryCta: { label: "List transitional housing", href: "/advertise-accommodation" },
};

export const adultSocialCareContent: LandingPageContent = {
  path: "/adult-social-care-accommodation",
  eyebrow: "SPECIALIST ADULT HOUSING",
  title: "Find adult social care accommodation",
  introduction: "Search accommodation advertised for adults with care, support or accessibility needs and connect with the provider responsible for assessment and placement.",
  highlights: [
    { heading: "Search relevant services", body: "Filter published accommodation by support category, age, accessibility and referral route." },
    { heading: "Review practical details", body: "Compare facilities, household arrangement, availability, rent and support information." },
    { heading: "Protect client information", body: "Professional referral details are shared only with the selected provider and authorised RoomsNow administrators." },
  ],
  sections: [
    { heading: "Housing for different adult needs", paragraphs: ["Adult social care accommodation can cover a wide range of settings and services. A person may need accessible housing, help with daily living or accommodation connected to a specialist support service.", "RoomsNow does not determine whether a service is suitable or regulated. It provides a consistent place for providers to describe their accommodation and for people or professionals to begin a direct conversation."] },
    { heading: "Information for professional referrers", paragraphs: ["Social workers, local authority teams and other authorised professionals can search participating providers and prepare client information in a private account. A referral is sent only to the provider selected by the referrer.", "Always complete your organisation's own safeguarding, commissioning, regulatory and suitability checks before arranging a placement."] },
  ],
  faqs: [
    { question: "Does RoomsNow assess care needs?", answer: "No. The provider and relevant professionals remain responsible for care assessments, eligibility and placement decisions." },
    { question: "Can I filter for step-free accommodation?", answer: "Yes. Listings can state whether step-free access is available and provide further accessibility notes." },
    { question: "Is provider verification a regulatory check?", answer: "No. RoomsNow verification confirms stated identity and documents only; it is not an inspection, accreditation or regulatory endorsement." },
    { question: "What types of adult social care accommodation are listed?", answer: "Adverts can include accessible and step-free housing, accommodation linked to a visiting or on-site support service, and homes suited to older adults or adults with physical, sensory or learning disabilities. Check each advert's own description for the specific service offered." },
    { question: "Can family members search on someone else's behalf?", answer: "Yes, anyone can browse public listings. If you want to submit a formal referral or share detailed client information, a professional referrer account or direct contact with the provider is usually the appropriate route." },
    { question: "How do I check if a placement is suitable before committing?", answer: "Speak directly with the provider about staffing, support hours, funding and compatibility with the person's needs, and carry out your organisation's own suitability and safeguarding checks. RoomsNow does not assess or approve individual placements." },
  ],
  primaryCta: { label: "Search specialist accommodation", href: "/search" },
  secondaryCta: { label: "Create a referrer account", href: "/register?type=REFERRER" },
};

export const advertiseAccommodationContent: LandingPageContent = {
  path: "/advertise-accommodation",
  eyebrow: "FOR LANDLORDS AND PROVIDERS",
  title: "Advertise HMO rooms and accommodation vacancies",
  introduction: "List HMO rooms, supported housing, transitional homes, adult social care accommodation and self-contained properties for people and professional referrers to find.",
  highlights: [
    { heading: "Room-level availability", body: "Show which rooms are available, reserved or occupied and when each room can be offered." },
    { heading: "Relevant enquiries", body: "Publish eligibility, support, facilities and referral routes so people can make informed enquiries." },
    { heading: "One provider worklist", body: "Manage messages, accommodation requests and professional referrals in one account." },
  ],
  sections: [
    { heading: "Reach people looking for the housing you provide", paragraphs: ["RoomsNow is designed for providers across the wider HMO and specialist accommodation market. A listing can cover ordinary shared accommodation, supported housing, transitional homes, adult social care accommodation, flats and self-contained properties.", "Detailed adverts help your vacancies appear for relevant searches. Use a specific title, accurate location, original description, current availability, clear rent and facilities, and explain who the accommodation is suitable for."] },
    { heading: "Keep your accommodation information accurate", paragraphs: ["Providers control their own organisation profile, property information and adverts. Keeping room availability current helps individuals and referrers avoid chasing vacancies that have already been filled.", "RoomsNow verification confirms stated identity and submitted documents. Providers remain responsible for every legal, licensing, regulatory, safeguarding and service requirement applying to their accommodation."] },
  ],
  faqs: [
    { question: "What accommodation can I advertise?", answer: "RoomsNow supports HMO rooms, shared homes, supported and transitional accommodation, adult social care housing, flats, houses and self-contained properties." },
    { question: "Can local authority teams find my vacancies?", answer: "Professional referrers can search public vacancies and filter for adverts accepting professional or local authority referrals." },
    { question: "Can I update individual room availability?", answer: "Yes. Providers can maintain availability at room level so the public advert reflects the current position." },
    { question: "How much does it cost to advertise on RoomsNow?", answer: "RoomsNow offers provider membership plans covering different levels of access and advert visibility. See the pricing page for current plan details." },
    { question: "Will my advert appear in search results and on Google?", answer: "Adverts appear in RoomsNow search and, where a property has an active listing, on the relevant city page. RoomsNow's pages are built to be indexable by search engines, but ranking position also depends on how complete and specific your listing description is." },
    { question: "Do I need an HMO licence to advertise on RoomsNow?", answer: "RoomsNow does not check licensing status before publishing an advert. Providers remain responsible for confirming whether their property needs an HMO licence from the local council and for meeting that requirement." },
  ],
  primaryCta: { label: "Advertise accommodation", href: "/register?type=PROVIDER" },
  secondaryCta: { label: "View membership", href: "/pricing" },
};

export const accommodationReferralsContent: LandingPageContent = {
  path: "/accommodation-referrals",
  eyebrow: "FOR PROFESSIONAL REFERRERS",
  title: "Make an accommodation referral",
  introduction: "Search suitable vacancies and send a structured housing referral to a participating provider through a private RoomsNow referrer account.",
  highlights: [
    { heading: "Search before referring", body: "Filter vacancies by location, support need, accommodation type and accepted referral route." },
    { heading: "Keep client details private", body: "Referral information is visible only to you, the selected provider and authorised RoomsNow administrators." },
    { heading: "Follow each placement", body: "Track submitted, received, assessment, offer, acceptance and move-in stages." },
  ],
  sections: [
    { heading: "A referral route for housing professionals", paragraphs: ["RoomsNow is built for local authority case workers, social workers, support teams and other authorised professionals arranging accommodation. Public vacancy information can be searched before any client information is shared.", "When a potentially suitable placement is found, the referrer chooses the provider and submits the applicant information required for assessment. The provider remains responsible for suitability, eligibility, risk assessment and every placement decision."] },
    { heading: "Search HMOs and specialist accommodation", paragraphs: ["The marketplace includes HMOs and shared homes as well as supported, transitional and adult social care accommodation. Referral filters show which providers accept professional, local authority or other routes.", "RoomsNow is a workflow and discovery service. It does not replace statutory duties, professional judgement, safeguarding procedures, commissioning checks or direct confirmation with the accommodation provider."] },
  ],
  faqs: [
    { question: "Who can create a referrer account?", answer: "Referrer accounts are intended for professionals working with an organisation and arranging accommodation for other people." },
    { question: "Can I refer without choosing a listing?", answer: "RoomsNow supports client management and referral workflows. Where available, choosing a specific advert gives the provider the clearest information about the requested placement." },
    { question: "Who decides whether the placement is suitable?", answer: "The accommodation provider and relevant professionals decide suitability and eligibility. RoomsNow does not make placement decisions." },
    { question: "Is there a cost for professional referrers to use RoomsNow?", answer: "Referrer accounts are aimed at professionals arranging accommodation for others. Check the current terms when registering, as arrangements can differ from individual accounts used to search for a home." },
    { question: "What information do I need to submit a referral?", answer: "Providers typically ask for details relevant to assessing suitability, such as support needs, funding route and any risk information they require. Requested fields are set by each provider and shown when you start a referral." },
    { question: "Can I track the status of a referral I've submitted?", answer: "Yes. Referrer accounts can follow a referral through stages such as submitted, received, assessment, offer, acceptance and move-in, so you can see progress without having to chase the provider directly." },
  ],
  primaryCta: { label: "Create a referrer account", href: "/register?type=REFERRER" },
  secondaryCta: { label: "Search accommodation", href: "/search" },
};
