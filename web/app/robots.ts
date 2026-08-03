import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clearance.kardashevlabs.org";

const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/" as const })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
