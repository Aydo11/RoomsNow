/**
 * Which places a council view covers. Each entry is either a postcode prefix
 * ("B", "B21", "WV") or a town / area name ("Birmingham", "Sutton Coldfield").
 */
const POSTCODE_PREFIX = /^[A-Z]{1,2}(\d{1,2}[A-Z]?)?$/;

export function parseAreas(input: string): string[] {
  return [...new Set(input.split(/[,\n]/).map((part) => part.trim()).filter(Boolean))].slice(0, 30);
}

export function inCouncilArea(areas: string[], property: { city: string; area: string | null; postcode: string }): boolean {
  if (!areas.length) return false;
  const postcode = property.postcode.toUpperCase().replace(/\s+/g, "");
  const places = `${property.city} ${property.area ?? ""}`.toLowerCase();
  return areas.some((raw) => {
    const area = raw.trim();
    const upper = area.toUpperCase().replace(/\s+/g, "");
    if (POSTCODE_PREFIX.test(upper)) {
      // "B" must not match "BA1": a letters-only prefix has to be followed by a digit.
      if (!postcode.startsWith(upper)) return false;
      const next = postcode.charAt(upper.length);
      return /\d/.test(upper) ? true : /\d/.test(next);
    }
    return places.includes(area.toLowerCase());
  });
}
