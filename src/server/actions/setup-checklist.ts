"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/** Hides the "Get set up" card on this browser for 60 days. */
export async function hideSetupChecklistAction(formData: FormData) {
  const audience = formData.get("audience") === "service" ? "service" : "provider";
  const store = await cookies();
  store.set(`rn-setup-hidden-${audience}`, "1", { path: "/", maxAge: 60 * 24 * 60 * 60, sameSite: "lax", httpOnly: true });
  revalidatePath(audience === "service" ? "/service-provider" : "/provider");
}
