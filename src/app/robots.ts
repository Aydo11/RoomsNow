import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Same allow/disallow as the default "*" rule below — listing AI crawlers by
// name doesn't change what they can already reach, but makes the intent
// explicit rather than leaving it implicit in a wildcard, and protects
// against a future stricter "*" rule accidentally shutting them out too.
const AI_CRAWLERS = [
  "GPTBot", // OpenAI training crawler
  "ChatGPT-User", // OpenAI live browsing on a ChatGPT user's behalf
  "OAI-SearchBot", // OpenAI's ChatGPT search crawler
  "ClaudeBot", // Anthropic
  "anthropic-ai", // Anthropic (older agent name)
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended", // governs use by Gemini / AI Overviews, separate from Googlebot
  "Applebot-Extended", // Apple Intelligence
  "Bingbot", // Microsoft Copilot draws on the Bing index
  "CCBot", // Common Crawl — widely used as AI training data
  "Amazonbot",
];

const ALLOW = ["/", "/search", "/listings/", "/companies/", "/rooms/"];
const DISALLOW = [
  "/admin/",
  "/api/",
  "/dashboard/",
  "/messages/",
  "/provider/",
  "/service-provider/",
  "/services/",
  "/referrals/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
