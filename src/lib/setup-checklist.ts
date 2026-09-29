import { cookies } from "next/headers";

/** Whether this browser has hidden the "Get set up" card. */
export async function setupChecklistHidden(audience: "provider" | "service") {
  const store = await cookies();
  return store.get(`rn-setup-hidden-${audience}`)?.value === "1";
}
