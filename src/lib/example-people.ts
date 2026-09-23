import type { AccommodationType, GenderArrangement } from "@prisma/client";

/**
 * Clearly-labelled example "looking for" profiles. They show providers and
 * referrers what real profiles will look like while the section is still
 * filling up. They are never stored in the database, can't be messaged, and
 * every place that shows one labels it as an example.
 */
export type ExamplePerson = {
  id: `example-${string}`;
  firstName: string;
  lastInitial: string;
  city: string;
  radiusMiles: number;
  age: number;
  title: string;
  about: string;
  lookingFor: string;
  supportTypes: string[];
  accommodationTypes: AccommodationType[];
  genderArrangement: GenderArrangement;
  /** Pence per week, or null for "Flexible". */
  budgetWeekly: number | null;
  /** Weeks from today they'd like to move by; null means "Now". */
  moveInWeeks: number | null;
  accessibilityNeeds?: string;
};

/** Below this many real profiles, the examples are shown under the results. */
export const EXAMPLE_PEOPLE_THRESHOLD = 6;

export const EXAMPLE_PEOPLE: ExamplePerson[] = [
  {
    id: "example-1",
    firstName: "Jordan",
    lastInitial: "M",
    city: "Birmingham",
    radiusMiles: 5,
    age: 24,
    title: "Quiet single room near my college in Birmingham",
    about:
      "I'm studying part-time and work weekends in retail. I'm tidy, keep to myself and get on well with people. I've been sofa-surfing with friends for a few months and want somewhere settled so I can finish my course.",
    lookingFor:
      "A single room in a calm shared house with a key worker I can check in with weekly. Somewhere on a bus route into the city centre.",
    supportTypes: ["homelessness", "young-people"],
    accommodationTypes: ["SINGLE_ROOM", "SHARED_ACCOMMODATION"],
    genderArrangement: "ANY",
    budgetWeekly: null,
    moveInWeeks: 2,
  },
  {
    id: "example-2",
    firstName: "Amira",
    lastInitial: "K",
    city: "Wolverhampton",
    radiusMiles: 10,
    age: 31,
    title: "Women-only supported house for me to rebuild",
    about:
      "I'm organised, love cooking and I'm working with a support worker who can give a reference. I'm ready for a fresh start somewhere safe and friendly.",
    lookingFor:
      "A women-only house with staff on site during the day, my own room and a shared kitchen. Close to shops and a GP surgery.",
    supportTypes: ["domestic-abuse", "vulnerable-adults"],
    accommodationTypes: ["SINGLE_ROOM", "SHARED_ACCOMMODATION"],
    genderArrangement: "FEMALE_ONLY",
    budgetWeekly: null,
    moveInWeeks: null,
  },
  {
    id: "example-3",
    firstName: "Daniel",
    lastInitial: "R",
    city: "Coventry",
    radiusMiles: 8,
    age: 42,
    title: "Ground-floor studio with step-free access",
    about:
      "I use a wheelchair outdoors and a walking frame at home. I'm independent with most things and have carers twice a week. I'm a big football fan and like a chat.",
    lookingFor:
      "A self-contained ground-floor studio or flat with a level-access shower. Parking nearby for my carers would really help.",
    supportTypes: ["physical-disability"],
    accommodationTypes: ["SELF_CONTAINED", "FLAT"],
    genderArrangement: "ANY",
    budgetWeekly: 15000,
    moveInWeeks: 6,
    accessibilityNeeds: "Step-free access, level-access shower, room for a wheelchair",
  },
  {
    id: "example-4",
    firstName: "Liam",
    lastInitial: "O",
    city: "Walsall",
    radiusMiles: 12,
    age: 19,
    title: "Leaving care — first place of my own with support",
    about:
      "I'm leaving my foster placement soon and my personal adviser is helping me find somewhere. I'm doing an apprenticeship in construction and I'm up early most days.",
    lookingFor:
      "Supported accommodation for young people where I can learn to budget and cook, with staff around if I need them.",
    supportTypes: ["care-leavers", "young-people"],
    accommodationTypes: ["SINGLE_ROOM", "SHARED_ACCOMMODATION"],
    genderArrangement: "ANY",
    budgetWeekly: null,
    moveInWeeks: 8,
  },
  {
    id: "example-5",
    firstName: "Chris",
    lastInitial: "T",
    city: "Birmingham",
    radiusMiles: 15,
    age: 37,
    title: "Stable, dry house to keep my recovery on track",
    about:
      "Eight months into recovery and doing well — I attend groups twice a week and volunteer at a food bank. I'm calm, respectful and good at DIY.",
    lookingFor:
      "A shared house with a dry-house policy and regular key-worker sessions. Happy anywhere in Birmingham or the Black Country.",
    supportTypes: ["substance-misuse", "mental-health"],
    accommodationTypes: ["SHARED_ACCOMMODATION", "SINGLE_ROOM"],
    genderArrangement: "MALE_ONLY",
    budgetWeekly: null,
    moveInWeeks: 3,
  },
  {
    id: "example-6",
    firstName: "Priya",
    lastInitial: "S",
    city: "Leicester",
    radiusMiles: 10,
    age: 28,
    title: "Calm room with mental health support nearby",
    about:
      "I work part-time as a library assistant and enjoy reading and walking. I'm looking for somewhere quiet where I can keep up my routine and my appointments.",
    lookingFor:
      "My own room with an en-suite if possible, in a small, quiet house. Staff who understand anxiety and can help me with paperwork now and then.",
    supportTypes: ["mental-health"],
    accommodationTypes: ["SINGLE_ROOM", "SELF_CONTAINED"],
    genderArrangement: "ANY",
    budgetWeekly: 12500,
    moveInWeeks: 4,
  },
  {
    id: "example-7",
    firstName: "Marcus",
    lastInitial: "B",
    city: "Manchester",
    radiusMiles: 10,
    age: 45,
    title: "Room in move-on accommodation after release",
    about:
      "I'm due for release soon and working with my probation officer on a housing plan. I've done courses in catering and want to find work in a kitchen.",
    lookingFor:
      "Supported move-on accommodation with a key worker who can help with ID, benefits and job searching. Open to most areas of Greater Manchester.",
    supportTypes: ["ex-offenders"],
    accommodationTypes: ["SINGLE_ROOM", "SHARED_ACCOMMODATION"],
    genderArrangement: "ANY",
    budgetWeekly: null,
    moveInWeeks: 5,
  },
  {
    id: "example-8",
    firstName: "Hannah",
    lastInitial: "W",
    city: "Dudley",
    radiusMiles: 6,
    age: 26,
    title: "Supported living with people my own age",
    about:
      "I have a learning disability and live with my mum at the moment. I go to a day centre three days a week and love art, music and bowling.",
    lookingFor:
      "A supported living house with 24-hour staff, my own bedroom and people around my age. Somewhere I can still get to my day centre.",
    supportTypes: ["learning-disability"],
    accommodationTypes: ["SHARED_ACCOMMODATION", "HOUSE"],
    genderArrangement: "ANY",
    budgetWeekly: null,
    moveInWeeks: 12,
  },
];

export function isExamplePersonId(id: string) {
  return id.startsWith("example-");
}

export function findExamplePerson(id: string) {
  return EXAMPLE_PEOPLE.find((person) => person.id === id) ?? null;
}

/** The move-in date an example shows, kept a few weeks ahead of today so it never looks stale. */
export function exampleMoveInDate(person: ExamplePerson, now = new Date()) {
  if (person.moveInWeeks === null) return null;
  return new Date(now.getTime() + person.moveInWeeks * 7 * 24 * 60 * 60 * 1000);
}

/** Examples that fit the current search, or all of them when none do. */
export function examplePeopleFor(filters: { where?: string; support?: string; minAge?: string; maxAge?: string }) {
  const where = filters.where?.trim().toLowerCase();
  const minAge = Number(filters.minAge) || 0;
  const maxAge = Number(filters.maxAge) || 200;
  const matches = EXAMPLE_PEOPLE.filter(
    (person) =>
      (!where || person.city.toLowerCase().includes(where)) &&
      (!filters.support || person.supportTypes.includes(filters.support)) &&
      person.age >= minAge &&
      person.age <= maxAge,
  );
  return matches.length ? matches : EXAMPLE_PEOPLE;
}
