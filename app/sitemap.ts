import type { MetadataRoute } from "next";
import { INDUSTRIES } from "@/lib/industries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/connect`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...INDUSTRIES.map((industry) => ({
      url: `${SITE_URL}/for/${industry.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
