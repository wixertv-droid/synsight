import { SITE, absoluteUrl } from "@/lib/seo/site";

type JsonLd = Record<string, unknown>;

export function organizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon"),
      width: 512,
      height: 512,
    },
    image: absoluteUrl("/opengraph-image"),
    description: SITE.description,
    email: SITE.email.contact,
    foundingDate: SITE.foundingDate,
    areaServed: SITE.areaServed,
    address: {
      "@type": "PostalAddress",
      addressCountry: SITE.nap.addressCountry,
      addressLocality: SITE.nap.addressLocality,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SITE.email.contact,
        availableLanguage: ["German", "de"],
      },
      {
        "@type": "ContactPoint",
        contactType: "privacy",
        email: SITE.email.privacy,
        availableLanguage: ["German", "de"],
      },
    ],
    sameAs: SITE.sameAs,
    knowsAbout: [
      "OSINT",
      "Cybersecurity",
      "Digitale Identität",
      "Datenleck-Analyse",
      "Reverse Image Search",
      "Username OSINT",
      "Google-Analyse",
    ],
  };
}

export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.language,
    publisher: { "@id": `${SITE.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/analysen?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function webApplicationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE.url}/#webapp`,
    name: SITE.name,
    url: SITE.url,
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript and a modern browser",
    description: SITE.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Kostenlose Voranalyse / Demo-Scan verfügbar",
    },
    publisher: { "@id": `${SITE.url}/#organization` },
    inLanguage: SITE.language,
  };
}

export function softwareApplicationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "SecurityApplication",
    applicationSubCategory: "OSINT / Identity Intelligence",
    operatingSystem: "Web",
    url: SITE.url,
    description: SITE.description,
    featureList: [
      "Google- und Clearnet-Analyse",
      "Username- und Alias-Suche",
      "Digital Footprint Mapping",
      "Reverse Image Search",
      "E-Mail- und Telefon-Checks",
      "Datenleck-Prüfung",
      "Social-Media-Korrelation",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    author: { "@id": `${SITE.url}/#organization` },
  };
}

export function serviceSchema(input: {
  name: string;
  description: string;
  path: string;
  serviceType?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    serviceType: input.serviceType || "Cybersecurity Analysis",
    description: input.description,
    url: absoluteUrl(input.path),
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: SITE.areaServed,
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: absoluteUrl(input.path),
    },
  };
}

export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqSchema(
  faqs: Array<{ question: string; answer: string }>
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function articleSchema(input: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: SITE.language,
    author: { "@id": `${SITE.url}/#organization` },
    publisher: { "@id": `${SITE.url}/#organization` },
    datePublished: input.datePublished || "2026-01-01",
    dateModified: input.dateModified || input.datePublished || "2026-08-05",
    mainEntityOfPage: absoluteUrl(input.path),
  };
}

export function personSchema(input: {
  name: string;
  jobTitle?: string;
  description?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    jobTitle: input.jobTitle,
    description: input.description,
    worksFor: { "@id": `${SITE.url}/#organization` },
  };
}
