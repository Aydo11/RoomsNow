"use server";

import { requireCompany } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import {
  advertFactsSchema,
  parseAdvertCopy,
  templateAdvert,
  WRITER_SYSTEM_PROMPT,
  writerUserPrompt,
  type AdvertCopy,
} from "@/lib/advert-writer";

export type AdvertWriterResult =
  | ({ ok: true; source: "ai" | "template" } & AdvertCopy)
  | { ok: false; message: string };

const DEFAULT_MODEL = "claude-sonnet-4-5";

async function askClaude(system: string, user: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ADVERT_WRITER_MODEL || DEFAULT_MODEL,
        max_tokens: 1200,
        temperature: 0.7,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("[advert-writer] Anthropic API", response.status, (await response.text()).slice(0, 300));
      return null;
    }
    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    return data.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("") ?? null;
  } catch (error) {
    console.error("[advert-writer] request failed", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Writes a title, summary and description from what the provider has filled
 * in so far. Uses Claude when ANTHROPIC_API_KEY is set and falls back to a
 * facts-only template otherwise (or if the AI call fails), so the button
 * always gives the provider something to work with.
 */
export async function writeAdvertCopyAction(input: unknown): Promise<AdvertWriterResult> {
  const { user, companyId } = await requireCompany();
  const parsed = advertFactsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Some of the details couldn't be read. Check the form and try again." };
  const facts = parsed.data;

  const limit = await rateLimit(`advert-writer:${user.id}`, LIMITS.advertWriter);
  if (!limit.ok) return { ok: false, message: "You've used the advert writer a lot in the last hour. Try again a little later." };

  const reply = await askClaude(WRITER_SYSTEM_PROMPT, writerUserPrompt(facts));
  const aiCopy = reply ? parseAdvertCopy(reply) : null;
  const copy = aiCopy ?? templateAdvert(facts);
  const source = aiCopy ? "ai" : "template";

  await audit({ actorId: user.id, action: "listing.advert_writer_used", targetType: "Company", targetId: companyId, metadata: { source, tone: facts.tone } });
  return { ok: true, source, ...copy };
}
