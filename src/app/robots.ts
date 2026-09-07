import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/search", "/listings/", "/companies/", "/rooms/"],
      disallow: [
        "/admin/",
        "/api/",
        "/dashboard/",
        "/messages/",
        "/provider/",
        "/referrals/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
