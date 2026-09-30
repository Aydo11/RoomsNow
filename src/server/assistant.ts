import "server-only";
import { db } from "@/lib/db";
import type { AdvertFacts, ChatMessage, SearchContext } from "@/lib/assistant/engine";

const DEFAULT_MODEL = "claude-haiku-4-5";
const CONTEXT_TTL_MS = 10 * 60_000;
let cachedContext: { at: number; value: SearchContext } | null = null;

/**
 * Towns with live adverts (busiest first) plus configured areas, and the
 * support types search understands. Cached briefly: it only feeds suggestions
 * and the phrase matcher, so a few minutes' lag is fine.
 */
export async function loadSearchContext(): Promise<SearchContext> {
  if (cachedContext && Date.now() - cachedContext.at < CONTEXT_TTL_MS) return cachedContext.value;
  const [listings, areas, supportTypes] = await Promise.all([
    db.listing.findMany({ where: { status: "ACTIVE" }, select: { property: { select: { city: true } } }, take: 1000 }),
    db.locationArea.findMany({ where: { active: true }, select: { name: true } }),
    db.supportType.findMany({ where: { active: true }, orderBy: { position: "asc" }, select: { slug: true, label: true } }),
  ]);
  const counts = new Map<string, number>();
  for (const { property } of listings) {
    const city = property.city.trim();
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  const live = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([city]) => city);
  const value: SearchContext = {
    areas: Array.from(new Set([...live, ...areas.map((area) => area.name)])),
    supportTypes,
  };
  cachedContext = { at: Date.now(), value };
  return value;
}

/** Public facts from a live advert, for answering questions about it. Null unless the advert is live. */
export async function loadAdvertFacts(listingId: string): Promise<AdvertFacts | null> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true, title: true, status: true, weeklyRentFrom: true, weeklyRentTo: true, billsIncluded: true, housingBenefit: true,
      availableFrom: true, accommodationType: true, supportTypes: true, supportDescription: true, supportAvailability: true,
      eligibility: true, genderArrangement: true, minAge: true, maxAge: true, furnished: true, ensuite: true, selfContained: true,
      wheelchairAccess: true, petsAllowed: true, referralProcess: true,
      property: { select: { city: true, area: true } },
      company: { select: { name: true } },
      rooms: { where: { status: "AVAILABLE" }, select: { id: true } },
    },
  });
  if (!listing || listing.status !== "ACTIVE") return null;
  const labels = listing.supportTypes.length
    ? await db.supportType.findMany({ where: { slug: { in: listing.supportTypes } }, select: { label: true } })
    : [];
  return {
    id: listing.id,
    title: listing.title,
    rentFrom: listing.weeklyRentFrom,
    rentTo: listing.weeklyRentTo,
    billsIncluded: listing.billsIncluded,
    housingBenefit: listing.housingBenefit,
    availableFrom: listing.availableFrom?.toISOString() ?? null,
    roomsAvailable: listing.rooms.length,
    city: listing.property.city,
    area: listing.property.area,
    accommodationType: listing.accommodationType,
    supportLabels: labels.map((label) => label.label),
    supportDescription: listing.supportDescription,
    supportAvailability: listing.supportAvailability,
    eligibility: listing.eligibility,
    genderArrangement: listing.genderArrangement,
    minAge: listing.minAge,
    maxAge: listing.maxAge,
    furnished: listing.furnished,
    ensuite: listing.ensuite,
    selfContained: listing.selfContained,
    wheelchairAccess: listing.wheelchairAccess,
    petsAllowed: listing.petsAllowed,
    referralProcess: listing.referralProcess,
    providerName: listing.company.name,
  };
}

/**
 * Asks Claude for a general help answer. Returns null (and the assistant uses
 * its built-in articles) when no API key is set or the call fails. Nothing is
 * logged apart from the status code.
 */
export async function askAssistantModel(system: string, messages: ChatMessage[]): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || process.env.ASSISTANT_AI === "off") return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    // The API expects the conversation to start with the person.
    const turns = messages.slice(messages.findIndex((message) => message.role === "user"));
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ASSISTANT_MODEL || DEFAULT_MODEL,
        max_tokens: 500,
        temperature: 0.2,
        system,
        messages: turns.map((message) => ({ role: message.role, content: message.content })),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("[assistant] Anthropic API status", response.status);
      return null;
    }
    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    return data.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("") ?? null;
  } catch (error) {
    console.error("[assistant] model request failed", error instanceof Error ? error.name : "error");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
