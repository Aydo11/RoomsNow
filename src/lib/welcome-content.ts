/**
 * The welcome for people looking for a room: what RoomsNow does for them,
 * in their words. Shared by the /welcome page and the welcome email so the
 * two never drift apart. Only lists features that are live.
 */

export type WelcomeIcon = "search" | "check" | "listen" | "post" | "bell" | "badge" | "heart" | "phone";

export type WelcomeService = {
  icon: WelcomeIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
};

export const WELCOME_SERVICES: WelcomeService[] = [
  {
    icon: "search",
    title: "Search rooms and supported accommodation",
    body: "HMO rooms, supported housing and move-on accommodation across the UK. Filter by area, budget, support needs and whether Housing Benefit is accepted.",
    href: "/search",
    cta: "Search rooms",
  },
  {
    icon: "check",
    title: "Check what fits you in two minutes",
    body: "Answer five simple questions and we'll only show you rooms that suit you.",
    href: "/eligibility",
    cta: "Check what fits me",
  },
  {
    icon: "listen",
    title: "Adverts in simple words",
    body: "Every advert has a short plain-English summary. Tap Listen to hear it read aloud, or read it in Urdu, Punjabi, Polish, Arabic or Romanian.",
    href: "/search",
    cta: "See an advert",
  },
  {
    icon: "post",
    title: "Tell providers what you're looking for",
    body: "Post a short “looking for a room” advert. Providers with a room that fits can message you directly.",
    href: "/dashboard/advert",
    cta: "Post what I'm looking for",
  },
  {
    icon: "bell",
    title: "Alerts when a room comes up",
    body: "Save a search and we'll tell you as soon as a matching room is listed, by email or on your phone.",
    href: "/dashboard/alerts",
    cta: "Set up alerts",
  },
  {
    icon: "badge",
    title: "Vetted providers",
    body: "Look for the Vetted badge. It means the provider has been checked against CQC or BVSC standards.",
    href: "/vetted-providers",
    cta: "See vetted providers",
  },
  {
    icon: "heart",
    title: "Free support services",
    body: "Helplines and local services for mental health, drugs and alcohol, housing advice and crisis support, with numbers you can tap to call and maps.",
    href: "/support-services",
    cta: "Find support",
  },
  {
    icon: "phone",
    title: "RoomsNow on your phone",
    body: "Add RoomsNow to your home screen and turn on notifications, so you never miss a reply from a provider.",
    href: "/dashboard/settings",
    cta: "Set it up",
  },
];

/** How RoomsNow connects someone with the right room, in order. */
export const WELCOME_STEPS = [
  {
    title: "Tell us what you need",
    text: "Use the two-minute \u201cwhat fits me\u201d check, or post a short advert saying where you want to live, your budget and any support you need.",
  },
  {
    title: "We show you rooms that fit",
    text: "Every advert shows how well it matches what you need, your dashboard suggests your best matches, and alerts tell you the moment a suitable room is listed.",
  },
  {
    title: "Talk to the provider directly",
    text: "Message them or request the room from the advert, leave your number, and arrange a viewing. You can also let your support worker or council refer you.",
  },
];

export const WELCOME_TIP = {
  title: "Leave your number for a better chance",
  points: [
    "Rooms go quickly, and providers often phone people when one comes up.",
    "When you message a provider or request a room, add your phone number and say when you're free to talk.",
    "If you haven't heard back within a day, give them a call.",
  ],
};

export const WELCOME_NOTIFICATION = {
  title: "Welcome to RoomsNow, and thank you for joining",
  body: "Search rooms, check what fits you in two minutes, and post what you're looking for so providers can find you. Tip: leave your phone number when you message a provider.",
  href: "/eligibility",
};
