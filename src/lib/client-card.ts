import { ageFrom } from "@/lib/format";
import { supportLabel } from "@/lib/taxonomy";

/**
 * The shareable summary of a client, as dropped into a message thread. It is
 * a snapshot of the fields a provider may see once a profile is shared —
 * deliberately never riskNotes, contact details or date of birth (only an
 * age) — taken at send time so the card reads the same later on.
 */
export type ClientCard = {
  name: string;
  age: string | null;
  preferredLocation: string | null;
  supportTypes: string[];
  accommodationNeeds: string | null;
  supportNeeds: string | null;
  hasPhoto: boolean;
};

const clip = (value: string | null | undefined, max: number) => {
  const text = value?.trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

export function clientCardFrom(client: {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  preferredLocation: string | null;
  supportTypes: string[];
  accommodationNeeds: string | null;
  supportNeeds: string | null;
  photoUrl: string | null;
}): ClientCard {
  return {
    name: `${client.firstName} ${client.lastName}`.trim(),
    age: client.dateOfBirth ? `${ageFrom(client.dateOfBirth)}` : null,
    preferredLocation: client.preferredLocation || null,
    supportTypes: client.supportTypes.map(supportLabel).slice(0, 6),
    accommodationNeeds: clip(client.accommodationNeeds, 400),
    supportNeeds: clip(client.supportNeeds, 400),
    hasPhoto: Boolean(client.photoUrl),
  };
}

/** Reads a stored card back defensively — it's JSON from the database. */
export function parseClientCard(value: unknown): ClientCard | null {
  if (!value || typeof value !== "object") return null;
  const card = value as Partial<ClientCard>;
  if (typeof card.name !== "string") return null;
  return {
    name: card.name,
    age: typeof card.age === "string" ? card.age : null,
    preferredLocation: typeof card.preferredLocation === "string" ? card.preferredLocation : null,
    supportTypes: Array.isArray(card.supportTypes) ? card.supportTypes.filter((t): t is string => typeof t === "string") : [],
    accommodationNeeds: typeof card.accommodationNeeds === "string" ? card.accommodationNeeds : null,
    supportNeeds: typeof card.supportNeeds === "string" ? card.supportNeeds : null,
    hasPhoto: card.hasPhoto === true,
  };
}

/**
 * Client photos are private, so the <img> always points at the access-checked
 * route. The version parameter busts the browser cache when the photo changes.
 */
export function clientPhotoSrc(client: { id: string; photoUrl: string | null; updatedAt?: Date | string }) {
  if (!client.photoUrl) return null;
  const version = client.updatedAt ? new Date(client.updatedAt).getTime() : 0;
  return `/api/clients/${client.id}/photo?v=${version}`;
}

export const CLIENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PLACED: "Placed",
  ARCHIVED: "Archived",
};

export const CLIENT_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-pine-light text-pine-dark",
  PLACED: "bg-clay-light text-clay",
  ARCHIVED: "bg-paper-sunk text-ink-faint",
  DELETED: "bg-paper-sunk text-clay",
};
