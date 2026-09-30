import { NextResponse } from "next/server";
import { z } from "zod";
import { brand } from "@/brand.config";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { redact } from "@/lib/assistant/engine";
import { sendEmail } from "@/lib/notify";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().toLowerCase().email("Enter an email address we can reply to.").max(200),
  message: z.string().trim().min(5, "Tell us a little about what you need help with.").max(1500),
  page: z.string().max(200).optional().default(""),
  includeChat: z.boolean().optional().default(false),
  chat: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1200) }))
    .max(20)
    .optional()
    .default([]),
});

/**
 * "Contact RoomsNow support" from the Help Assistant. Emails the support
 * inbox with the person's message (and the chat only if they ticked the box).
 * Nothing is saved in the database.
 */
export async function POST(request: Request) {
  const limit = await rateLimit(`assistant-contact:${await callerIp()}`, { limit: 4, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: "You've already sent a few messages. Please wait a while before sending another." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  const { name, email, message, page, includeChat, chat } = parsed.data;

  const lines = [
    `From: ${name || "(no name given)"} <${email}>`,
    page ? `Page: ${page}` : "",
    "",
    redact(message),
  ];
  if (includeChat && chat.length) {
    lines.push("", "---- Chat with the Help Assistant (shared by the person) ----");
    for (const turn of chat.slice(-12)) lines.push(`${turn.role === "user" ? "Person" : "Assistant"}: ${redact(turn.content)}`);
  }
  lines.push("", `Reply directly to ${email}.`);

  try {
    await sendEmail({
      to: brand.supportEmail,
      subject: `Help request from the website${name ? `: ${name}` : ""}`,
      text: lines.filter((line, index) => line || index > 1).join("\n"),
      replyTo: email,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[assistant] support email failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: `We couldn't send that just now. You can email us at ${brand.supportEmail}.` }, { status: 502 });
  }
}
