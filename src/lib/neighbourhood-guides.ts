export type LocalResource = { title: string; detail: string; url: string; source: string };
export const neighbourhoodGuides = [
  {
    slug: "erdington", name: "Erdington", postcodeHint: "Use the property's full B23 or B24 postcode, not just the district.",
    summary: "Plan a move to Erdington around the journeys and support you use every week. Check the walk to the station, access to a GP and the route to appointments before choosing a room.",
    viewingTip: "Compare the journey from the actual property to Erdington station or your bus stop. An advert labelled Erdington does not mean it is next to the High Street or station.",
    resources: [
      { title: "Erdington station", detail: "Station Road, B23 6UB. Check National Rail for departures, station facilities and accessibility before travelling.", url: "https://www.nationalrail.co.uk/stations/erdington/", source: "National Rail" },
      { title: "Erdington Foodbank", detail: "Six Ways Baptist Church, Wood End Road, B24 8AD. A valid foodbank voucher is required. Check the foodbank's current opening times and how to get a referral before visiting.", url: "https://erdington.foodbank.org.uk/locations/", source: "Erdington Foodbank" },
      { title: "Erdington Library", detail: "Orphanage Road, B24 9HP. Check the council's library page for opening times and services before your visit.", url: "https://www.birmingham.gov.uk/erdingtonlibrary", source: "Birmingham City Council" },
    ],
  },
  {
    slug: "handsworth", name: "Handsworth", postcodeHint: "Enter the full property postcode when checking GP and benefit services.",
    summary: "Use this Handsworth guide to check everyday services alongside available accommodation. Start with the actual address, then compare your route to work, appointments and the services you rely on.",
    viewingTip: "Handsworth and Handsworth Wood are not interchangeable. Ask the provider to confirm the neighbourhood and check the journey from the property rather than assuming every advert is close to Soho Road.",
    resources: [
      { title: "Handsworth Library", detail: "Soho Road, B21 9DP. The council lists free Wi-Fi and computer access. Check current opening hours and accessibility before visiting.", url: "https://www.birmingham.gov.uk/directory_record/431893/handsworth_library", source: "Birmingham City Council" },
      { title: "Find local food support", detail: "Use Birmingham City Council's foodbank directory to find a service near the property. Some services require a voucher; check the referral route and opening times first.", url: "https://www.birmingham.gov.uk/foodbanks", source: "Birmingham City Council" },
    ],
  },
  {
    slug: "small-heath", name: "Small Heath", postcodeHint: "Check services using the full property postcode, for example a B10 address.",
    summary: "Compare rooms in Small Heath with the practical details that make a tenancy work: travel to appointments, GP registration, help with food and rent, and the support offered by the accommodation provider.",
    viewingTip: "Use the exact property location to compare bus and rail journeys. Check whether the route to Small Heath station works for your mobility needs, especially when returning after an evening appointment.",
    resources: [
      { title: "Small Heath station", detail: "Golden Hillock Road, B10 0DP. Check live departures, facilities and accessibility with National Rail.", url: "https://www.nationalrail.co.uk/stations/small-heath/", source: "National Rail" },
      { title: "Small Heath Library", detail: "Muntz Street, B10 9RX. Use the council page to check opening times, contact details and events.", url: "https://www.birmingham.gov.uk/smallheath-library", source: "Birmingham City Council" },
      { title: "Foodbanks and food support", detail: "Find a service near your address through the council directory. Confirm whether you need a voucher and whether the service covers your area before travelling.", url: "https://www.birmingham.gov.uk/foodbanks", source: "Birmingham City Council" },
    ],
  },
] satisfies { slug: string; name: string; postcodeHint: string; summary: string; viewingTip: string; resources: LocalResource[] }[];

export function neighbourhoodFromSlug(slug: string) {
  return neighbourhoodGuides.find((guide) => guide.slug === slug) ?? null;
}

export function matchesNeighbourhood(name: string, property: { city: string; area: string | null }) {
  const normalise = (value: string) => value.trim().toLowerCase().replace(/[-\s]+/g, " ");
  return normalise(property.city) === "birmingham" && normalise(property.area ?? "") === normalise(name);
}

export const sharedLocalResources: LocalResource[] = [
  { title: "Buses, trains and tram journeys", detail: "Plan from the property postcode to your destination with Transport for West Midlands. Compare walking distances, ticket prices, transfers and return services; check disruptions on the day.", url: "https://www.tfwm.org.uk/plan-your-journey/", source: "Transport for West Midlands" },
  { title: "Find your nearest GP", detail: "Enter the full property postcode in the NHS finder for nearby practices. Contact the practice about registration and access needs; do not assume a place is available just because it is nearby.", url: "https://www.nhs.uk/service-search/find-a-gp/", source: "NHS" },
  { title: "Find and contact Jobcentre Plus", detail: "Use the official local-office search. Check your appointment letter or UC journal to confirm the office you should attend, which may not be the geographically nearest one.", url: "https://www.gov.uk/contact-jobcentre-plus", source: "GOV.UK / DWP" },
  { title: "Help with living costs", detail: "Explore Birmingham's living-cost support, advice and community services. Check each scheme's eligibility and how to apply.", url: "https://www.birmingham.gov.uk/livingsupport", source: "Birmingham City Council" },
];
