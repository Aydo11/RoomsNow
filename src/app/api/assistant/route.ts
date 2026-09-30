import { NextResponse } from "next/server";
import { z } from "zod";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { respond } from "@/lib/assistant/engine";
import { askAssistantModel, loadAdvertFacts, loadSearchContext } from "@/server/assistant";

export const dynamic = "force-dynamic";

const draftSchema = z
  .object({
    where: z.string().max(60).optional(),
    anywhere: z.boolean().optional(),
    support: z.array(z.string().max(40)).max(6).optional(),
    type: z.array(z.string().max(30)).max(3).optional(),
    maxRent: z.number().int().min(1).max(5000).optional(),
    hb: z.boolean().optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    resident: z.enum(["woman", "man"]).optional(),
  })
  .strict();

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200) }))
    .min(1)
    .max(20),
  state: z.object({ search: draftSchema.optional(), awaiting: z.literal("area").optional() }).optional(),
  listingId: z.string().max(40).regex(/^[a-z0-9]+$/i).optional(),
});

/**
 * The Help Assistant. Stateless: the browser sends the recent conversation
 * each time and nothing is stored, so there are no transcripts to retain.
 */
export async function POST(request: Request) {
  const limit = await rateLimit(`assistant:${await callerIp()}`, { limit: 40, windowMs: 10 * 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "You've sent a lot of messages in a short time. Please wait a few minutes and try again." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Sorry, I couldn't read that message. Please try again." }, { status: 400 });
  const { messages, state, listingId } = parsed.data;
  const latest = messages[messages.length - 1];
  if (latest.role !== "user" || latest.content.length > 600) {
    return NextResponse.json({ error: "Please keep your message under 600 characters." }, { status: 400 });
  }

  try {
    const [context, facts] = await Promise.all([loadSearchContext(), listingId ? loadAdvertFacts(listingId) : Promise.resolve(null)]);
    const reply = await respond({ messages: messages.slice(-10), state, facts, context, ai: askAssistantModel });
    return NextResponse.json({ reply }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[assistant] failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Something went wrong on our side. Please try again in a moment." }, { status: 500 });
  }
}
