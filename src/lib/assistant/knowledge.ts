/**
 * Approved help content for the RoomsNow Help Assistant. The assistant only
 * answers from these articles (plus the facts on a live advert), so keep them
 * accurate to how the site works today. Plain English, short, UK spelling.
 *
 * `keywords` drive the offline matcher; `links` are the only pages an answer
 * about that topic may point to.
 */

export type AssistantLink = { label: string; href: string };

export type HelpArticle = {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  links: AssistantLink[];
  /** Follow-up questions to offer after this answer. */
  next?: string[];
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "find-room",
    title: "How do I find a room?",
    keywords: ["find a room", "find room", "search", "look for", "looking for", "how do i find", "get a room", "search rooms", "start"],
    answer:
      "Open Search and type a town, area or postcode. You can then narrow the results with filters: support needs, type of accommodation, move-in date, weekly rent, and whether Housing Benefit is accepted. Tap an advert to see full details, and switch to Map view to see where rooms are. If you're not sure what fits you, the two-minute \"what fits me\" check sets the filters for you.",
    links: [
      { label: "Search rooms", href: "/search" },
      { label: "Check what fits me", href: "/eligibility" },
    ],
    next: ["Help me search for a room", "How do the filters work?", "How do I get alerts for new rooms?"],
  },
  {
    id: "filters",
    title: "Using search filters",
    keywords: ["filter", "filters", "narrow", "refine", "move-in", "move in date", "radius", "distance", "map", "sort", "budget", "price range", "cheaper"],
    answer:
      "On the search page, open Filters to choose: support needs (for example mental health or care leavers), accommodation type (single room, shared, self-contained, flat or house), the date you can move in, a maximum weekly rent, Housing Benefit accepted, who the home is for, wheelchair access, pets, furnished or en-suite, and verified or vetted providers. Searching a town or postcode also lets you set how many miles around it to look. Map view shows results on a map.",
    links: [{ label: "Open search", href: "/search" }],
    next: ["What does 'support needed' mean?", "What does Housing Benefit accepted mean?"],
  },
  {
    id: "support-needed",
    title: "What does 'support needed' mean?",
    keywords: ["support needed", "support need", "support needs", "supported", "what does support mean", "support type", "support offered", "level of support", "supported accommodation", "supported housing"],
    answer:
      "Some homes include support from staff as well as a room, for example help with mental health, recovery from drugs or alcohol, leaving care or prison, or living independently. \"Support needed\" is the kind of help you're looking for. Choosing it in search shows homes that say they offer that support. Each advert explains the support on offer, how often it's available and who provides it. Always check the details with the provider, as support arrangements can differ.",
    links: [
      { label: "Search by support need", href: "/search" },
      { label: "What is supported accommodation?", href: "/supported-accommodation" },
    ],
    next: ["How do I find a room?", "How do referrals work?"],
  },
  {
    id: "read-advert",
    title: "Reading an advert",
    keywords: ["advert", "listing", "details", "read", "understand", "what does the advert", "information", "bills", "rent", "eligibility", "availability", "available from"],
    answer:
      "Each advert shows the weekly rent (sometimes a range if rooms differ), whether bills are included, whether Housing Benefit or Universal Credit housing costs are accepted, the date rooms are available from and how many are free now. It also covers who the home is suitable for (eligibility notes, age range, men, women or mixed), the support offered, house rules, accessibility and how referrals work. Tap Listen to hear the summary read aloud, or view it in another language. Details can change, so confirm anything important with the provider.",
    links: [{ label: "Browse adverts", href: "/search" }],
    next: ["How do I contact a provider?", "What does 'bills included' mean?"],
  },
  {
    id: "bills",
    title: "Rent and bills",
    keywords: ["bills", "bills included", "rent", "cost", "price", "how much", "service charge", "deposit", "weekly rent", "per week", "afford"],
    answer:
      "Rent on RoomsNow is shown per week. \"Bills included\" means the advert says things like gas, electricity and water are covered by the rent. Some supported homes also charge a service charge, which the provider should explain. Deposits and exact charges vary, so ask the provider before you agree to anything. For a general guide to typical costs, see our room cost guide.",
    links: [
      { label: "How much does an HMO room cost?", href: "/guides/how-much-does-an-hmo-room-cost" },
      { label: "Search by budget", href: "/search" },
    ],
    next: ["What does Housing Benefit accepted mean?", "How do I contact a provider?"],
  },
  {
    id: "housing-benefit",
    title: "Housing Benefit and Universal Credit",
    keywords: ["housing benefit", "universal credit", "uc", "benefits", "dss", "on benefits", "hb", "housing costs"],
    answer:
      "\"Housing Benefit accepted\" means the provider says they accept tenants whose rent is paid through Housing Benefit or the housing element of Universal Credit. You can switch this filter on in search. RoomsNow can't tell you whether you'll qualify for benefits or how much you'll get. For that, contact your local council or Citizens Advice.",
    links: [
      { label: "Search homes that accept Housing Benefit", href: "/search?hb=1" },
      { label: "Free support services", href: "/support-services" },
    ],
    next: ["How do I find a room?"],
  },
  {
    id: "contact-provider",
    title: "How do I contact a provider?",
    keywords: ["contact", "message", "landlord", "provider", "get in touch", "speak to", "call", "phone", "email the", "enquire", "enquiry", "ask the provider"],
    answer:
      "Open the advert and use \"Send a message\" to ask a question, or \"Request accommodation\" to apply for the room. You'll need a free account. Messages stay inside RoomsNow. Tip: rooms go quickly and providers often phone people, so add your phone number and say when you're free to talk. If you haven't heard back within a day, send a short follow-up.",
    links: [
      { label: "Your messages", href: "/messages" },
      { label: "Create a free account", href: "/register" },
    ],
    next: ["How do I track my requests?", "How do I save an advert?"],
  },
  {
    id: "request",
    title: "Requesting a room",
    keywords: ["request", "apply", "application", "request accommodation", "request a room", "track", "status", "declined", "accepted", "withdraw"],
    answer:
      "\"Request accommodation\" on an advert sends the provider a short application with your details and what you need. You can follow each request in Requests on your dashboard, where you'll see if it's been viewed, accepted or declined, and you can withdraw it. You'll also get a notification when the provider responds.",
    links: [{ label: "My requests", href: "/dashboard/requests" }],
    next: ["How do I contact a provider?", "How do notifications work?"],
  },
  {
    id: "save",
    title: "Saving adverts",
    keywords: ["save", "saved", "favourite", "shortlist", "bookmark", "heart", "keep"],
    answer:
      "Tap Save on any advert to keep it in Saved properties, so you can compare and come back to it. You need to be signed in to save.",
    links: [{ label: "Saved properties", href: "/dashboard/saved" }],
    next: ["How do I get alerts for new rooms?"],
  },
  {
    id: "alerts",
    title: "Alerts for new rooms",
    keywords: ["alert", "alerts", "notify me", "new rooms", "tell me when", "email me", "saved search"],
    answer:
      "Run a search with the filters you want, then save it as an alert. We'll let you know when a new room matching it is listed. You can manage or turn off alerts at any time.",
    links: [
      { label: "Saved alerts", href: "/dashboard/alerts" },
      { label: "Search rooms", href: "/search" },
    ],
    next: ["How do notifications work?"],
  },
  {
    id: "looking-for-advert",
    title: "Tell providers what you're looking for",
    keywords: ["post", "my advert", "looking for advert", "providers find me", "wanted", "advertise myself", "let providers"],
    answer:
      "You can post a short \"looking for a room\" advert with the area, budget, move-in date and any support you need. Providers with a suitable room can then message you. You don't have to share anything you're not comfortable with.",
    links: [{ label: "Post what I'm looking for", href: "/dashboard/advert" }],
    next: ["How do I find a room?"],
  },
  {
    id: "messages",
    title: "Managing messages",
    keywords: ["messages", "inbox", "reply", "conversation", "chat with provider", "unread"],
    answer:
      "All your conversations with providers are in Messages. The bell at the top shows new messages and updates. You can turn on phone and email notifications in Settings so you don't miss a reply.",
    links: [
      { label: "Messages", href: "/messages" },
      { label: "Notification settings", href: "/dashboard/settings" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    keywords: ["notification", "notifications", "bell", "push", "on my phone", "turn off emails", "unsubscribe", "emails"],
    answer:
      "The bell at the top of the site shows your latest updates, such as new messages, request replies and alerts. In Settings you can choose email and phone notifications, and add RoomsNow to your home screen so it works like an app.",
    links: [
      { label: "Notifications", href: "/dashboard/notifications" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
  },
  {
    id: "account",
    title: "Your account",
    keywords: ["account", "sign up", "register", "create account", "log in", "login", "sign in", "profile", "settings", "free", "cost to use"],
    answer:
      "It's free to use RoomsNow if you're looking for a room. You can search without an account. To save adverts, message providers or send requests, create a free account and confirm your email. You can update your profile, phone number and notification choices in Settings.",
    links: [
      { label: "Create a free account", href: "/register" },
      { label: "Sign in", href: "/login" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
    next: ["I can't sign in", "How do I delete my account?"],
  },
  {
    id: "sign-in-problems",
    title: "Trouble signing in",
    keywords: ["can't sign in", "cant sign in", "can't log in", "cant log in", "forgot password", "reset password", "password", "locked out", "verification email", "verify", "didn't get the email", "no email"],
    answer:
      "If you've forgotten your password, use \"Forgot password\" on the sign-in page and we'll email you a reset link. If you haven't confirmed your email yet, open the verification email and press the button. You'll be signed in straight away. Check your spam folder, or request a new link on the verify page. If it still doesn't work, contact RoomsNow support.",
    links: [
      { label: "Reset password", href: "/forgot-password" },
      { label: "Resend verification email", href: "/verify-email" },
    ],
  },
  {
    id: "delete-account",
    title: "Deleting your account",
    keywords: ["delete", "close account", "remove my account", "delete my data", "privacy", "my data", "gdpr"],
    answer:
      "You can delete your account from Settings. Our privacy notice explains what we keep, why, and for how long.",
    links: [
      { label: "Settings", href: "/dashboard/settings" },
      { label: "Privacy notice", href: "/privacy" },
    ],
  },
  {
    id: "vetted-verified",
    title: "Verified and vetted providers",
    keywords: ["verified", "vetted", "badge", "trust", "safe provider", "legit", "genuine", "scam", "cqc", "bvsc"],
    answer:
      "A Verified badge means RoomsNow has checked the provider's stated identity and documents. It isn't a regulatory endorsement or inspection. A Vetted badge means the provider has an in-date CQC or BVSC accreditation that we've checked. You can filter search to verified or vetted providers only.",
    links: [
      { label: "Vetted providers", href: "/vetted-providers" },
      { label: "Staying safe", href: "/safety" },
    ],
    next: ["How do I stay safe?"],
  },
  {
    id: "safety",
    title: "Staying safe",
    keywords: ["safe", "safety", "scam", "fraud", "suspicious", "report", "worried about an advert", "fake", "pay upfront"],
    answer:
      "Never pay a deposit or rent before you've viewed a room and checked who you're dealing with. Keep conversations in RoomsNow Messages where you can. If an advert or message looks wrong, use \"Report\" on the advert or conversation and our team will review it.",
    links: [{ label: "Staying safe", href: "/safety" }],
  },
  {
    id: "referrals",
    title: "Referrals for support workers and councils",
    keywords: ["referral", "refer", "support worker", "caseworker", "case worker", "council", "social worker", "probation", "professional", "on behalf"],
    answer:
      "Support workers, councils and other professionals can create a free referrer account to find suitable rooms and send structured referrals on someone's behalf, then track them in one place. If you have a support worker, they can use RoomsNow with you.",
    links: [
      { label: "Accommodation referrals", href: "/accommodation-referrals" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    id: "eligibility-check",
    title: "The \"what fits me\" check",
    keywords: ["eligible", "eligibility", "qualify", "what fits", "suitable", "am i allowed", "criteria"],
    answer:
      "The \"what fits me\" check asks five simple questions and then shows rooms that suit your answers. It doesn't decide whether a provider will accept you. Each provider sets their own eligibility, which is shown on the advert, so check it with them.",
    links: [{ label: "Check what fits me", href: "/eligibility" }],
  },
  {
    id: "read-aloud",
    title: "Listen and translate",
    keywords: ["listen", "read aloud", "audio", "language", "translate", "urdu", "punjabi", "polish", "arabic", "romanian", "english", "easy read"],
    answer:
      "Every advert has a short plain-English summary. Tap Listen to hear it read aloud, or choose another language to read it, including Urdu, Punjabi, Polish, Arabic and Romanian. Translations are automatic, so check important details with the provider.",
    links: [{ label: "Browse adverts", href: "/search" }],
  },
  {
    id: "providers",
    title: "Advertising rooms (for providers)",
    keywords: ["advertise", "list my property", "i am a landlord", "i'm a landlord", "provider account", "list rooms", "membership", "pricing", "fill voids"],
    answer:
      "Housing providers can create a provider account to advertise rooms, manage enquiries and referrals, and get verified. See Advertise accommodation for how it works and Membership for plans.",
    links: [
      { label: "Advertise accommodation", href: "/advertise-accommodation" },
      { label: "Membership and pricing", href: "/pricing" },
    ],
  },
  {
    id: "support-services",
    title: "Free support services",
    keywords: ["support services", "help with", "mental health", "drugs", "alcohol", "addiction", "debt", "advice", "citizens advice", "housing advice", "homeless", "nowhere to stay", "council housing"],
    answer:
      "Our Support services directory lists free helplines and local services for housing advice, mental health, drugs and alcohol, and crisis support, with numbers you can tap to call. If you're homeless or about to be, contact your local council's housing team as soon as you can. They have a duty to help.",
    links: [{ label: "Support services", href: "/support-services" }],
  },
  {
    id: "guides",
    title: "Guides",
    keywords: ["guide", "guides", "what is an hmo", "hmo", "exempt accommodation", "tenant rights", "viewing", "checklist", "licensing"],
    answer:
      "Our guides explain things like what an HMO is, what to check at a viewing, what supported exempt accommodation means, typical room costs and your rights as a tenant.",
    links: [
      { label: "All guides", href: "/guides" },
      { label: "Viewing checklist", href: "/guides/hmo-room-viewing-checklist" },
      { label: "Tenant rights", href: "/guides/hmo-tenant-rights" },
    ],
  },
  {
    id: "how-it-works",
    title: "How RoomsNow works",
    keywords: ["what is roomsnow", "about roomsnow", "how does roomsnow work", "who are you", "how it works", "what do you do"],
    answer:
      "RoomsNow is a UK website for HMO rooms, supported accommodation and move-on housing. You can search live adverts, contact providers directly, save adverts and get alerts, all for free. Support workers and councils can refer people, and providers can advertise their rooms.",
    links: [{ label: "How it works", href: "/how-it-works" }],
    next: ["How do I find a room?", "How do I contact a provider?"],
  },
];

/** Internal paths an assistant answer may link to (exact, or a prefix ending in "/"). */
export const ALLOWED_LINK_PATHS = [
  "/", "/search", "/eligibility", "/register", "/login", "/forgot-password", "/verify-email",
  "/messages", "/dashboard", "/dashboard/saved", "/dashboard/alerts", "/dashboard/requests",
  "/dashboard/advert", "/dashboard/settings", "/dashboard/notifications", "/dashboard/profile",
  "/support-services", "/vetted-providers", "/safety", "/privacy", "/terms", "/how-it-works",
  "/guides", "/accommodation-referrals", "/advertise-accommodation", "/pricing", "/feedback",
  "/supported-accommodation", "/hmo-rooms", "/transitional-accommodation",
];
export const ALLOWED_LINK_PREFIXES = ["/guides/", "/listings/", "/support-services/", "/rooms/"];

/** Trusted external help lines the safety replies may link to. */
export const ALLOWED_EXTERNAL = ["https://www.samaritans.org", "https://www.shelter.org.uk", "https://www.nationaldahelpline.org.uk", "https://www.citizensadvice.org.uk"];

export const STARTERS = [
  "How do I find a room?",
  "What does 'support needed' mean?",
  "How do I contact a provider?",
  "I need help using RoomsNow",
];

export const ADVERT_STARTERS = [
  "What's included in the rent?",
  "Who is this home for?",
  "What support is offered?",
  "How do I contact this provider?",
];

export const SEARCH_STARTERS = [
  "How do the filters work?",
  "Only homes that accept Housing Benefit",
  "How do I get alerts for new rooms?",
  "What does 'support needed' mean?",
];

export const AVAILABILITY_CAVEAT = "Availability can change quickly, so please check the details with the provider.";
