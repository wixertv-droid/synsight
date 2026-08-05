import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/lib/seo/site";
import { robotsPrivate, robotsPublic } from "@/lib/seo/index-policy";

export type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
  imagePath?: string;
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
};

export function buildPageMetadata(input: PageSeoInput): Metadata {
  const url = absoluteUrl(input.path);
  const title = input.title.includes("SynSight")
    ? input.title
    : `${input.title} | SynSight`;
  const ogImage = absoluteUrl(input.imagePath || "/opengraph-image");
  const robots = input.noIndex ? robotsPrivate : robotsPublic;

  return {
    title,
    description: input.description,
    keywords: input.keywords,
    applicationName: SITE.name,
    authors: [{ name: SITE.name, url: SITE.url }],
    creator: SITE.name,
    publisher: SITE.name,
    category: "Cybersecurity",
    metadataBase: new URL(SITE.url),
    alternates: {
      canonical: url,
      languages: {
        de: url,
        "x-default": url,
        // en: reserved for future locale
      },
    },
    robots,
    openGraph: {
      title,
      description: input.description,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      type: input.type || "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE.name} — ${input.title}`,
        },
      ],
      ...(input.publishedTime
        ? { publishedTime: input.publishedTime }
        : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      images: [ogImage],
      creator: SITE.twitterHandle,
    },
    other: {
      "theme-color": SITE.themeColor,
    },
  };
}
