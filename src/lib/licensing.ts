/**
 * Licensing readiness checklist for supported and exempt accommodation,
 * based on the Supported Housing (Regulatory Oversight) Act 2023, the six
 * National Supported Housing Standards and the government's consultation
 * response (April 2026). Regulations and guidance are still being finalised,
 * so this is preparation, not a guarantee of a licence.
 * Item keys are stored in the database: never rename one, only add new ones.
 */
export type LicensingStandard = {
  key: string;
  title: string;
  summary: string;
  items: Array<{ key: string; label: string; hint: string }>;
};

export const LICENSING_STANDARDS: LicensingStandard[] = [
  {
    key: "purpose",
    title: "Statement of purpose",
    summary: "A clear statement of what your service is for, kept up to date.",
    items: [
      { key: "purpose.written", label: "Written statement of purpose", hint: "Your ethos, aims, who you support, the outcomes you work towards, and your partnerships." },
      { key: "purpose.reviewed", label: "Reviewed in the last 12 months", hint: "The statement should be reviewed and updated at least once a year." },
      { key: "purpose.shared", label: "Available to residents", hint: "Residents can see it, for example displayed in the scheme or given on move-in." },
    ],
  },
  {
    key: "person",
    title: "Person-centred support",
    summary: "Support built around each resident's needs and goals.",
    items: [
      { key: "person.assessment", label: "Needs assessment for every resident", hint: "Done at move-in or within four weeks, by someone with the right skills." },
      { key: "person.plan", label: "Written support plan for every resident", hint: "Based on the assessment, reviewed regularly." },
      { key: "person.moveon", label: "Move-on and independence planning", hint: "Each resident has a plan towards independence or their next home." },
      { key: "person.learning", label: "Access to learning and work", hint: "Residents are helped to reach training, education, volunteering or employment." },
    ],
  },
  {
    key: "empower",
    title: "Empowerment",
    summary: "Residents have a say and can complain and be heard.",
    items: [
      { key: "empower.involvement", label: "Residents involved in shaping the service", hint: "For example residents' meetings, surveys or feedback sessions, with advocates where needed." },
      { key: "empower.complaints", label: "Complaints and redress procedure", hint: "Written, explained to residents at move-in, with a route to escalate." },
      { key: "empower.roles", label: "Residents know who does what", hint: "Clear roles: who to contact for support, repairs and complaints." },
    ],
  },
  {
    key: "environment",
    title: "Environment",
    summary: "A safe, clean, comfortable home with a managed referral and repairs process.",
    items: [
      { key: "environment.condition", label: "Property safe, accessible and clean", hint: "No Category 1 hazards. Gas, electrical and fire safety certificates in date." },
      { key: "environment.repairs", label: "Repairs reporting, including emergencies", hint: "Residents know how to report routine and out-of-hours emergency repairs." },
      { key: "environment.referrals", label: "Managed referrals and risk assessment", hint: "A referral and move-in process that assesses risk and the mix of residents." },
      { key: "environment.privacy", label: "Privacy and visitors", hint: "Residents' privacy is respected and they can have family and friends visit." },
    ],
  },
  {
    key: "staff",
    title: "Staff and safeguarding",
    summary: "Checked, trained staff in sufficient numbers, with safeguarding built in.",
    items: [
      { key: "staff.dbs", label: "DBS checks for all staff", hint: "At the right level for the work, recorded and renewed." },
      { key: "staff.safeguarding", label: "Safeguarding policy and training", hint: "Policy in place, staff trained, a named safeguarding lead." },
      { key: "staff.asb", label: "Anti-social behaviour policy and training", hint: "How ASB is prevented and handled, and staff trained to use it." },
      { key: "staff.levels", label: "Enough staff for residents' needs", hint: "Staffing levels match the support you promise." },
      { key: "staff.eviction", label: "Pre-eviction protocol", hint: "Steps taken to prevent an eviction before it happens." },
      { key: "staff.performance", label: "Staff supervision and performance process", hint: "Regular supervision and a way to manage performance." },
    ],
  },
  {
    key: "local",
    title: "Local need",
    summary: "Your service fits what the local area needs and works with local partners.",
    items: [
      { key: "local.partners", label: "Links with local services", hint: "Working relationships with the council, health, probation, job centres and others." },
      { key: "local.neighbours", label: "Good neighbour approach", hint: "A way for neighbours to raise concerns, and you respond to them." },
      { key: "local.strategy", label: "Know your council's supported housing strategy", hint: "Councils must publish one by 31 March 2027. Check how your service fits it." },
    ],
  },
  {
    key: "licence",
    title: "Licence application",
    summary: "The practical things the licence application itself will ask for.",
    items: [
      { key: "licence.fitproper", label: "Fit and proper checks for directors", hint: "The licence holder, directors and nominated person will be tested as fit and proper." },
      { key: "licence.managers", label: "Named service manager for each address", hint: "The application lists every address and its service manager." },
      { key: "licence.addresses", label: "Up-to-date list of all your addresses", hint: "One licence per council area, covering every address you run there." },
      { key: "licence.cqc", label: "CQC registration if you provide care", hint: "Any personal care must be given by a CQC-registered provider. Tick this if it doesn't apply to you." },
    ],
  },
];

export const LICENSING_ITEM_KEYS = new Set(LICENSING_STANDARDS.flatMap((s) => s.items.map((i) => i.key)));

/** Overall and per-standard progress from the set of item keys marked done. */
export function licensingProgress(doneKeys: Set<string>) {
  const standards = LICENSING_STANDARDS.map((standard) => {
    const done = standard.items.filter((item) => doneKeys.has(item.key)).length;
    return { key: standard.key, done, total: standard.items.length };
  });
  const done = standards.reduce((sum, s) => sum + s.done, 0);
  const total = standards.reduce((sum, s) => sum + s.total, 0);
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0, standards };
}
