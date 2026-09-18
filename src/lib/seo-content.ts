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
    { heading: "CQC registration and supported housing", paragraphs: ["CQC registration applies to regulated health and adult social care activities in England; it does not automatically apply to every supported housing service. For example, a supported living provider delivering the regulated activity of personal care may need to register, while accommodation alone is not automatically CQC regulated.", "Providers and referrers should check the exact service model, the regulated activities being delivered and the current CQC scope-of-registration guidance. A RoomsNow verification badge is not a CQC rating or regulatory endorsement."] },
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
  relatedLinks: [
    { label: "Supported accommodation in Birmingham", href: "/supported-accommodation-birmingham" },
    { label: "Supported accommodation in Manchester", href: "/supported-accommodation-manchester" },
    { label: "Mental-health supported accommodation", href: "/mental-health-supported-accommodation" },
    { label: "Accommodation for care leavers", href: "/accommodation-for-care-leavers" },
  ],
  resources: [
    { label: "CQC: scope of registration", href: "https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration" },
    { label: "GOV.UK: Housing Benefit guidance for supported housing", href: "https://www.gov.uk/government/publications/housing-benefit-guidance-for-supported-housing-claims/housing-benefit-guidance-for-supported-housing-claims" },
  ],
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
    { heading: "Information for professional referrers", paragraphs: ["Social workers, local authority teams and other authorised professionals can search participating providers and prepare client information in a private account. A referral is sent only to the provider selected by the referrer.", "Always complete your organisation's own safeguarding, commissioning, CQC or other regulatory, and suitability checks before arranging a placement. In England, CQC registration depends on the regulated activities delivered; the accommodation itself is not automatically CQC regulated."] },
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
  relatedLinks: [
    { label: "Mental-health supported accommodation", href: "/mental-health-supported-accommodation" },
    { label: "Supported accommodation", href: "/supported-accommodation" },
  ],
  resources: [
    { label: "CQC: scope of registration", href: "https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration" },
  ],
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
    { heading: "Keep your accommodation information accurate", paragraphs: ["Providers control their own organisation profile, property information and adverts. Keeping room availability current helps individuals and referrers avoid chasing vacancies that have already been filled.", "RoomsNow verification confirms stated identity and submitted documents. Providers remain responsible for every legal, licensing, regulatory, safeguarding and service requirement applying to their accommodation, including HMO licensing and CQC registration where a regulated activity is delivered."] },
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
  relatedLinks: [
    { label: "Advertise supported accommodation vacancies", href: "/advertise-accommodation" },
    { label: "Professional accommodation referrals", href: "/accommodation-referrals" },
    { label: "HMO rooms in Birmingham", href: "/hmo-rooms-birmingham" },
  ],
  resources: [
    { label: "CQC: check whether a regulated activity requires registration", href: "https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration" },
  ],
};

export const accommodationReferralsContent: LandingPageContent = {
  path: "/accommodation-referrals",
  eyebrow: "FOR PROFESSIONAL REFERRERS",
  title: "Professional accommodation referral platform",
  introduction: "Search suitable vacancies and send a structured housing referral to a participating provider through a private RoomsNow professional accommodation referral platform.",
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
  relatedLinks: [
    { label: "Accommodation for care leavers", href: "/accommodation-for-care-leavers" },
    { label: "Accommodation for prison leavers", href: "/accommodation-for-prison-leavers" },
    { label: "Mental-health supported accommodation", href: "/mental-health-supported-accommodation" },
  ],
};

const CQC_RESOURCE = {
  label: "CQC: scope of registration for health and adult social care activities",
  href: "https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration",
};

export const hmoRoomsBirminghamContent: LandingPageContent = {
  path: "/hmo-rooms-birmingham",
  eyebrow: "HMO ROOMS IN BIRMINGHAM",
  title: "Find HMO rooms in Birmingham",
  introduction: "Search current HMO rooms and shared accommodation in Birmingham. Compare weekly rent, bills, room availability, household arrangements and provider information before making an enquiry.",
  highlights: [
    { heading: "Live Birmingham vacancies", body: "Open a filtered RoomsNow search for accommodation advertised in Birmingham." },
    { heading: "Compare room details", body: "Review rent, bills, furnishing, ensuite facilities and expected move-in dates." },
    { heading: "Check the provider", body: "Read the provider profile, verification status and the information supplied with each advert." },
  ],
  sections: [
    { heading: "Searching for an HMO room in Birmingham", paragraphs: ["Birmingham has a broad mix of shared homes, HMOs and specialist accommodation. Start with the location you need, then compare travel, household arrangements and the total weekly cost rather than relying on rent alone.", "RoomsNow brings current room availability and property information together. Each provider remains responsible for its advert, tenancy terms, property standards and any licence the property requires."] },
    { heading: "What to check before choosing a room", paragraphs: ["Ask whether bills are included, how the deposit is protected, which facilities are shared, who manages repairs and whether there are house rules. If the property is an HMO, ask the provider whether Birmingham City Council requires it to be licensed and, where relevant, request the licence details.", "Never pay solely because an advert appears online. View the property where possible, confirm who you are dealing with and read the proposed agreement before sending money."] },
  ],
  faqs: [
    { question: "How do I search HMO rooms in Birmingham?", answer: "Use the Birmingham search button and refine the results by accommodation type, weekly rent, facilities, household arrangement and move-in date." },
    { question: "Are all Birmingham HMOs licensed?", answer: "Licensing depends on the property and the local scheme in force. Ask the provider and check current requirements with Birmingham City Council." },
    { question: "Does RoomsNow manage Birmingham properties?", answer: "No. RoomsNow is a marketplace. Independent providers manage their properties, applications and tenancy arrangements." },
  ],
  primaryCta: { label: "Search HMO rooms in Birmingham", href: "/search?where=Birmingham&type=SHARED_ACCOMMODATION" },
  secondaryCta: { label: "Advertise a Birmingham vacancy", href: "/advertise-accommodation" },
  relatedLinks: [
    { label: "Supported accommodation in Birmingham", href: "/supported-accommodation-birmingham" },
    { label: "HMO rooms across the UK", href: "/hmo-rooms" },
  ],
};

export const supportedAccommodationBirminghamContent: LandingPageContent = {
  path: "/supported-accommodation-birmingham",
  eyebrow: "BIRMINGHAM SUPPORTED HOUSING",
  title: "Supported accommodation in Birmingham",
  introduction: "Search supported accommodation vacancies in Birmingham by support need, room availability, accommodation type and accepted referral route.",
  highlights: [
    { heading: "Search by support need", body: "Narrow Birmingham vacancies by the support categories published by each provider." },
    { heading: "Professional referrals", body: "Check whether a service accepts professional, local authority or self-referral routes." },
    { heading: "Clear provider information", body: "Review accommodation, availability, verification information and provider profiles together." },
  ],
  sections: [
    { heading: "Finding supported housing in Birmingham", paragraphs: ["Suitability depends on the person, the accommodation, the support model and the funding or referral route. Compare the service description and practical property details, then speak directly with the provider before making a placement decision.", "RoomsNow helps individuals and professionals discover vacancies; it does not commission services or replace Birmingham City Council, safeguarding, risk-assessment or due-diligence processes."] },
    { heading: "CQC and supported accommodation", paragraphs: ["CQC regulates specified health and adult social care activities in England. Supported accommodation is not automatically CQC regulated simply because support is available. A provider delivering a regulated activity such as personal care may need CQC registration.", "Check the service model and the CQC register where registration should apply. RoomsNow verification does not replace a CQC check or confirm that an individual placement is suitable."] },
  ],
  faqs: [
    { question: "Can a Birmingham support worker submit a referral?", answer: "Where the provider accepts professional referrals, an authorised referrer can send the requested client information through RoomsNow." },
    { question: "Is all supported accommodation CQC registered?", answer: "No. CQC registration depends on whether the provider carries on a regulated activity. Accommodation and general support alone are not automatically regulated by CQC." },
    { question: "Who decides whether a Birmingham placement is suitable?", answer: "The provider and relevant professionals remain responsible for assessment, funding, safeguarding and the final placement decision." },
  ],
  primaryCta: { label: "Search Birmingham vacancies", href: "/search?where=Birmingham" },
  secondaryCta: { label: "Make a professional referral", href: "/accommodation-referrals" },
  relatedLinks: [
    { label: "HMO rooms in Birmingham", href: "/hmo-rooms-birmingham" },
    { label: "Mental-health supported accommodation", href: "/mental-health-supported-accommodation" },
    { label: "Accommodation for care leavers", href: "/accommodation-for-care-leavers" },
  ],
  resources: [CQC_RESOURCE],
};

export const supportedAccommodationManchesterContent: LandingPageContent = {
  path: "/supported-accommodation-manchester",
  eyebrow: "MANCHESTER SUPPORTED HOUSING",
  title: "Supported accommodation in Manchester",
  introduction: "Search supported accommodation in Manchester and compare vacancies, eligibility information, support categories and professional referral routes.",
  highlights: [
    { heading: "Manchester vacancies", body: "View accommodation advertised by providers serving Manchester and refine the results." },
    { heading: "Structured referrals", body: "Send a referral to a selected provider and track its progress through your account." },
    { heading: "Practical information", body: "Compare rent, facilities, accessibility, availability and the provider's stated support offer." },
  ],
  sections: [
    { heading: "Compare Manchester supported accommodation", paragraphs: ["The phrase supported accommodation covers different property and service models. Read what each provider actually offers, who the service is intended for and which referral or funding routes it accepts.", "Professionals should complete their organisation's commissioning, safeguarding, regulatory and suitability checks before arranging a placement."] },
    { heading: "Understanding CQC status", paragraphs: ["CQC registration relates to regulated health and adult social care activities in England. A housing service is not automatically CQC registered, while a provider delivering personal care or another regulated activity may need to be registered.", "Ask who delivers any care, check the relevant CQC registration and read current CQC guidance. A RoomsNow provider badge is separate from CQC registration and ratings."] },
  ],
  faqs: [
    { question: "Can I search by support need in Manchester?", answer: "Yes. Search filters include categories such as mental health, homelessness, care leavers, prison leavers and learning disability." },
    { question: "Can an individual apply directly?", answer: "Some providers accept self-referrals while others require a professional or local authority referral. Check the route shown on the advert." },
    { question: "Does RoomsNow inspect Manchester services?", answer: "No. RoomsNow provides marketplace and workflow tools; it does not inspect accommodation or act as a regulator." },
  ],
  primaryCta: { label: "Search Manchester vacancies", href: "/search?where=Manchester" },
  secondaryCta: { label: "Create a referrer account", href: "/register?type=REFERRER" },
  relatedLinks: [
    { label: "Supported accommodation across the UK", href: "/supported-accommodation" },
    { label: "Transitional accommodation in London", href: "/transitional-accommodation-london" },
  ],
  resources: [CQC_RESOURCE],
};

export const transitionalAccommodationLondonContent: LandingPageContent = {
  path: "/transitional-accommodation-london",
  eyebrow: "LONDON MOVE-ON HOUSING",
  title: "Transitional accommodation in London",
  introduction: "Search transitional, temporary and move-on accommodation advertised in London, including shared and self-contained options with different referral routes.",
  highlights: [
    { heading: "Search London", body: "Open live London results and refine them by accommodation type and practical requirements." },
    { heading: "Understand the placement", body: "Check eligibility, expected length of stay, rent, support and move-on arrangements." },
    { heading: "Refer securely", body: "Professional referrers can select a provider and submit structured information through RoomsNow." },
  ],
  sections: [
    { heading: "Finding move-on accommodation in London", paragraphs: ["Transitional accommodation can support a move from emergency, hostel, refuge or supported settings towards a more settled home. Providers use different eligibility, funding and length-of-stay rules, so the full advert and a direct conversation are important.", "Use location and referral filters to identify plausible vacancies, but confirm live availability and suitability with the provider before promising a placement."] },
    { heading: "Information to confirm", paragraphs: ["Ask about the occupancy agreement, weekly costs, benefits eligibility, support hours, exclusions, assessment process and what move-on planning is provided. A professional referral should include only information necessary for assessment and should follow your organisation's data-protection procedures."] },
  ],
  faqs: [
    { question: "Is transitional accommodation emergency housing?", answer: "Not necessarily. Transitional accommodation is normally a time-limited step towards longer-term housing; emergency accommodation is intended for an immediate housing crisis." },
    { question: "Can I self-refer in London?", answer: "It depends on the provider. RoomsNow adverts show whether self, professional or local authority referrals are accepted." },
    { question: "How long does a transitional placement last?", answer: "The provider sets the placement terms. Confirm any time limit and move-on plan before accepting an offer." },
  ],
  primaryCta: { label: "Search London accommodation", href: "/search?where=London" },
  secondaryCta: { label: "List a London vacancy", href: "/advertise-accommodation" },
  relatedLinks: [
    { label: "Transitional accommodation across the UK", href: "/transitional-accommodation" },
    { label: "Accommodation for prison leavers", href: "/accommodation-for-prison-leavers" },
  ],
};

export const careLeaversAccommodationContent: LandingPageContent = {
  path: "/accommodation-for-care-leavers",
  eyebrow: "HOUSING FOR CARE LEAVERS",
  title: "Accommodation for care leavers",
  introduction: "Search accommodation advertised for care leavers and young people, or use a professional referrer account to contact a selected provider about a suitable vacancy.",
  highlights: [
    { heading: "Relevant vacancies", body: "Filter for care-leaver and young-person support categories rather than reviewing every advert." },
    { heading: "Practical comparisons", body: "Check location, availability, household arrangement, facilities and the support described." },
    { heading: "Professional workflow", body: "Personal advisers and authorised professionals can manage clients and track referrals." },
  ],
  sections: [
    { heading: "Finding the right accommodation", paragraphs: ["A care leaver may need ordinary shared housing, transitional accommodation or a supported placement. The right option depends on age, independence, support needs, local authority duties and the person's own preferences.", "RoomsNow helps people and authorised professionals find advertised vacancies. The responsible local authority and provider retain their assessment, safeguarding, funding and placement responsibilities."] },
    { heading: "What to ask the provider", paragraphs: ["Confirm staffing or support hours, out-of-hours arrangements, house rules, compatibility with other residents, rent and service charges, benefits arrangements and the expected move-on plan. Where personal care or another regulated activity is delivered, check which organisation provides it and whether CQC registration applies."] },
  ],
  faqs: [
    { question: "Can a personal adviser refer a care leaver?", answer: "Yes, where the selected provider accepts professional referrals. The referrer should follow their organisation's assessment and information-sharing procedures." },
    { question: "Is care-leaver accommodation always supported?", answer: "No. Options can include ordinary tenancies, shared housing, supported accommodation and transitional placements, depending on the person's circumstances." },
    { question: "Does RoomsNow decide whether a placement is appropriate?", answer: "No. Suitability and placement decisions remain with the provider, relevant professionals and the person seeking accommodation." },
  ],
  primaryCta: { label: "Search care-leaver accommodation", href: "/search?support=care-leavers" },
  secondaryCta: { label: "Make a professional referral", href: "/accommodation-referrals" },
  relatedLinks: [
    { label: "Transitional accommodation", href: "/transitional-accommodation" },
    { label: "Supported accommodation in Birmingham", href: "/supported-accommodation-birmingham" },
  ],
  resources: [CQC_RESOURCE],
};

export const mentalHealthAccommodationContent: LandingPageContent = {
  path: "/mental-health-supported-accommodation",
  eyebrow: "MENTAL HEALTH HOUSING",
  title: "Mental-health supported accommodation",
  introduction: "Search supported accommodation advertised for people with mental-health support needs and compare vacancies, facilities and referral routes.",
  highlights: [
    { heading: "Focused search", body: "Open results filtered for the mental-health support category and refine by location." },
    { heading: "Compare the support offer", body: "Read the provider's description of staffing, support and eligibility before referring." },
    { heading: "Check regulation", body: "Establish who delivers any regulated care and verify CQC registration where applicable." },
  ],
  sections: [
    { heading: "Housing with mental-health support", paragraphs: ["Services differ widely: some focus on tenancy sustainment and independence, while others work alongside clinical or social-care teams. An advert category alone cannot establish suitability, so discuss the person's needs and risks directly with the provider.", "RoomsNow is a discovery and referral platform. It does not provide mental-health treatment, crisis support, care assessment or clinical advice."] },
    { heading: "CQC and mental-health accommodation", paragraphs: ["CQC registration is determined by the regulated activities delivered, not simply by using the words supported accommodation. Check whether personal care, treatment or another regulated activity is being provided, which organisation delivers it and whether its registration covers the relevant service.", "If someone needs urgent mental-health help, use the appropriate NHS or emergency service rather than relying on an accommodation marketplace."] },
  ],
  faqs: [
    { question: "Can I filter RoomsNow for mental-health support?", answer: "Yes. The search link opens listings tagged by providers for mental-health support; you can then refine the location and other requirements." },
    { question: "Are all mental-health supported housing services CQC registered?", answer: "No. Registration depends on the activities delivered. Confirm the service model and check the CQC register where regulated activity should be provided." },
    { question: "Does RoomsNow provide crisis support?", answer: "No. RoomsNow is an accommodation marketplace and referral workflow, not a crisis or clinical service." },
  ],
  primaryCta: { label: "Search mental-health accommodation", href: "/search?support=mental-health" },
  secondaryCta: { label: "Create a professional account", href: "/register?type=REFERRER" },
  relatedLinks: [
    { label: "Supported accommodation", href: "/supported-accommodation" },
    { label: "Adult social care accommodation", href: "/adult-social-care-accommodation" },
  ],
  resources: [CQC_RESOURCE],
};

export const prisonLeaversAccommodationContent: LandingPageContent = {
  path: "/accommodation-for-prison-leavers",
  eyebrow: "HOUSING FOR PRISON LEAVERS",
  title: "Accommodation for prison leavers",
  introduction: "Search accommodation advertised for prison leavers and people with offending histories, including supported, transitional and shared options.",
  highlights: [
    { heading: "Search suitable adverts", body: "Filter for prison-leaver support and compare the provider's eligibility information." },
    { heading: "Plan the referral", body: "Professional teams can select a vacancy and submit structured information for assessment." },
    { heading: "Track progress", body: "Follow referral stages from submission through assessment, offer and move-in." },
  ],
  sections: [
    { heading: "Finding accommodation after release", paragraphs: ["Accommodation can be an important part of resettlement, but eligibility, risk management, licence conditions and funding vary. Search early where possible and give the provider enough accurate information to assess whether its property and support model are suitable.", "RoomsNow does not override statutory housing duties, probation processes, MAPPA arrangements, safeguarding procedures or professional risk assessment."] },
    { heading: "Information for professional referrers", paragraphs: ["Confirm the provider's exclusions, staffing, location suitability, curfew or house rules, support offer and referral documents. Share sensitive information only where it is necessary, lawful and proportionate for assessment.", "The provider remains responsible for its acceptance decision and ongoing service; the referrer remains responsible for their professional and organisational duties."] },
  ],
  faqs: [
    { question: "Can probation or resettlement teams refer through RoomsNow?", answer: "Authorised professionals can use a referrer account where a participating provider accepts that referral route." },
    { question: "Does every provider accept prison leavers?", answer: "No. Use the prison-leaver support filter and read each provider's eligibility and exclusion information." },
    { question: "Is RoomsNow an emergency housing service?", answer: "No. RoomsNow displays provider vacancies and supports enquiries and referrals; it does not allocate emergency housing." },
  ],
  primaryCta: { label: "Search prison-leaver accommodation", href: "/search?support=ex-offenders" },
  secondaryCta: { label: "Make a professional referral", href: "/accommodation-referrals" },
  relatedLinks: [
    { label: "Transitional accommodation in London", href: "/transitional-accommodation-london" },
    { label: "Supported accommodation", href: "/supported-accommodation" },
  ],
};
