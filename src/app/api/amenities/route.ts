import { NextRequest, NextResponse } from "next/server";


type OverpassElement = {
  id?: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type AmenityType = "BUS_STOP" | "SHOP" | "JOB_CENTRE" | "PHARMACY";

const OVERPASS_ENDPOINTS = [
  { url: "https://overpass-api.de/api/interpreter", timeoutMs: 18_000 },
  { url: "https://lz4.overpass-api.de/api/interpreter", timeoutMs: 8_000 },
] as const;

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function amenityType(tags: Record<string, string>): AmenityType | null {
  if (tags.highway === "bus_stop") return "BUS_STOP";
  if (tags.shop === "supermarket" || tags.shop === "convenience") return "SHOP";
  if (tags.office === "employment_agency" || tags.government === "employment_agency" || tags.amenity === "jobcentre") return "JOB_CENTRE";
  if (tags.amenity === "pharmacy") return "PHARMACY";
  return null;
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 49 || latitude > 61 || longitude < -9 || longitude > 3) {
    return NextResponse.json({ amenities: [] }, { status: 400 });
  }
  // Nearby-place lookups never send an exact property coordinate to the map-data provider.
  const lookupLatitude = Math.round(latitude * 1000) / 1000;
  const lookupLongitude = Math.round(longitude * 1000) / 1000;

  const query = `[out:json][timeout:18];(
    node(around:1600,${lookupLatitude},${lookupLongitude})["highway"="bus_stop"];
    nwr(around:1600,${lookupLatitude},${lookupLongitude})["shop"~"^(supermarket|convenience)$"];
    nwr(around:2500,${lookupLatitude},${lookupLongitude})["office"="employment_agency"];
    nwr(around:2500,${lookupLatitude},${lookupLongitude})["government"="employment_agency"];
    nwr(around:2500,${lookupLatitude},${lookupLongitude})["amenity"="jobcentre"];
    nwr(around:1600,${lookupLatitude},${lookupLongitude})["amenity"="pharmacy"];
  );out center;`;

  try {
    let data: { elements?: OverpassElement[]; remark?: string } | null = null;
    let lastError: unknown = null;

    // GET requests can use Next's data cache. That prevents every advert view
    // from waiting on a public Overpass server and makes the first successful
    // lookup reusable by every visitor to the same approximate area.
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const url = `${endpoint.url}?data=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: { Accept: "application/json", "User-Agent": "RoomsNow/1.0 (https://roomsnow.co.uk)" },
          signal: AbortSignal.timeout(endpoint.timeoutMs),
          cache: "force-cache",
          next: { revalidate: 86_400 },
        });
        if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
        const candidate = await response.json() as { elements?: OverpassElement[]; remark?: string };
        if (candidate.remark?.toLowerCase().includes("timed out")) throw new Error(candidate.remark);
        data = candidate;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!data) throw lastError ?? new Error("No OpenStreetMap amenities response");
    const seen = new Set<string>();
    const sortedAmenities = (data.elements ?? []).flatMap((element) => {
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      const tags = element.tags ?? {};
      const type = amenityType(tags);
      if (lat == null || lng == null || !type) return [];
      const name = tags.name || (type === "BUS_STOP" ? "Bus stop" : type === "SHOP" ? "Local shop" : type === "JOB_CENTRE" ? "Employment support" : "Pharmacy");
      const key = `${type}:${name}:${lat.toFixed(5)}:${lng.toFixed(5)}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ type, name, latitude: lat, longitude: lng, distanceMiles: distanceMiles(latitude, longitude, lat, lng) }];
    }).sort((a, b) => a.distanceMiles - b.distanceMiles);
    const categoryLimits: Record<AmenityType, number> = { BUS_STOP: 8, SHOP: 6, JOB_CENTRE: 4, PHARMACY: 4 };
    const categoryCounts: Partial<Record<AmenityType, number>> = {};
    const amenities = sortedAmenities.filter((amenity) => {
      const count = categoryCounts[amenity.type] ?? 0;
      if (count >= categoryLimits[amenity.type]) return false;
      categoryCounts[amenity.type] = count + 1;
      return true;
    });

    return NextResponse.json(
      { amenities, available: true },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    // Never cache a temporary upstream outage. A later advert view can retry
    // immediately instead of receiving an empty result for five minutes.
    return NextResponse.json(
      { amenities: [], available: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
