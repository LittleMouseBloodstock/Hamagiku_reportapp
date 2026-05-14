import type { MetadataRoute } from "next";

const baseUrl = "https://shinba.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/report",
    "/use-cases/racehorse-monthly-report",
    "/use-cases/overseas-owner-reporting",
    "/features/horse-report-pdf",
    "/features/premium-care-records",
    "/compare/translation-tool-vs-reporting-service",
    "/legal/terms",
    "/legal/privacy",
    "/legal/refund",
    "/legal/commercial",
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
