import type { MetadataRoute } from "next";
import { getPublicSitemapEntries } from "@/lib/seo/sitemap-entries";

export default function sitemap(): MetadataRoute.Sitemap {
  return getPublicSitemapEntries();
}
