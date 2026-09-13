import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const businesses = await prisma.businessProfile.findMany({
    select: { id: true, createdAt: true },
    take: 5000,
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/businesses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/how-it-works`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/signup`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const businessRoutes: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${siteUrl}/businesses/${b.id}`,
    lastModified: b.createdAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...businessRoutes];
}
