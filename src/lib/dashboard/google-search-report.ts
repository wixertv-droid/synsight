import type { IdentityView } from "@/lib/services/identity-service";
import type { RiskLevel } from "@/types/platform";

export interface GoogleSerpHit {
  id: string;
  query: string;
  title: string;
  url: string;
  snippet: string;
  category:
    | "name"
    | "email"
    | "phone"
    | "company"
    | "alias"
    | "social"
    | "website"
    | "address"
    | "image";
  severity: RiskLevel;
  whyItMatters: string;
}

export interface GoogleSearchQuery {
  id: string;
  label: string;
  query: string;
  help: string;
  hitCount: number;
}

export interface GoogleSearchReport {
  subjectName: string;
  generatedAtLabel: string;
  profileCompleteness: number;
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  whatThisMeans: string;
  queries: GoogleSearchQuery[];
  hits: GoogleSerpHit[];
  recommendations: Array<{
    title: string;
    detail: string;
    priority: "Jetzt" | "Diese Woche" | "Optional";
  }>;
  missingProfileHints: string[];
}

function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || url;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Build a realistic Google-style exposure report from the identity profile.
 * This is UI/architecture preparation — no live Google API.
 */
export function buildGoogleSearchReport(
  identity: IdentityView | null
): GoogleSearchReport {
  const first = clean(identity?.personal.firstName) || "Max";
  const last = clean(identity?.personal.lastName) || "Mustermann";
  const fullName = `${first} ${last}`;
  const location = clean(identity?.personal.location);
  const address = clean(identity?.personal.addressLine);
  const company =
    clean(identity?.personal.company) || clean(identity?.companies[0]) || "";
  const emails = [...(identity?.emails ?? [])].map(clean).filter(Boolean);
  const phones = [
    clean(identity?.personal.phone),
    ...(identity?.phoneNumbers ?? []).map(clean),
  ].filter(Boolean);
  const aliases = [
    clean(identity?.aliases.publicAlias),
    ...(identity?.aliases.nicknames ?? []),
    ...(identity?.aliases.usernames ?? []),
    ...(identity?.aliases.formerNames ?? []),
    ...(identity?.aliases.gamingNames ?? []),
  ]
    .map(clean)
    .filter(Boolean);
  const websites = [...(identity?.websites ?? [])].map(clean).filter(Boolean);
  const domains = [...(identity?.domains ?? [])].map(clean).filter(Boolean);
  const socials = identity?.socialAccounts ?? [];
  const previousLocations = identity?.personal.previousLocations ?? [];

  const hits: GoogleSerpHit[] = [];
  const queries: GoogleSearchQuery[] = [];
  let hitSeq = 0;
  const nextId = (prefix: string) => `${prefix}-${++hitSeq}`;

  // --- Name search ---
  const nameQuery = location ? `"${fullName}" ${location}` : `"${fullName}"`;
  queries.push({
    id: "q-name",
    label: "Name",
    query: nameQuery,
    help: "Klassische Suche nach Ihrem Klarnamen — oft der Einstieg, den Fremde zuerst wählen.",
    hitCount: 0,
  });

  hits.push({
    id: nextId("name"),
    query: nameQuery,
    title: `${fullName}${company ? ` – ${company}` : " – Öffentliche Erwähnung"}`,
    url: company
      ? `https://www.google.com/search?q=${encodeURIComponent(fullName + " " + company)}`
      : `https://www.google.com/search?q=${encodeURIComponent(fullName)}`,
    snippet: company
      ? `${fullName} wird im Zusammenhang mit ${company}${location ? ` (${location})` : ""} in öffentlichen Suchergebnissen genannt.`
      : `Mehrere öffentliche Seiten nennen den Namen ${fullName}${location ? ` mit Bezug zu ${location}` : ""}.`,
    category: "name",
    severity: "low",
    whyItMatters:
      "Allein der Name ist meist harmlos. Zusammen mit Firma, Ort oder Kontaktdaten wird er zum Identitäts-Anker.",
  });

  if (previousLocations.length > 0) {
    hits.push({
      id: nextId("name"),
      query: nameQuery,
      title: `${fullName} – Frühere Ortsbezüge`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`"${fullName}" ${previousLocations[0]}`)}`,
      snippet: `In älteren öffentlichen Einträgen erscheint ${fullName} auch mit früheren Orten: ${previousLocations.slice(0, 2).join(", ")}.`,
      category: "name",
      severity: "low",
      whyItMatters:
        "Frühere Wohnorte helfen Dritten, Lebenslauf und Identität über Jahre zu verknüpfen.",
    });
  }

  // --- Email searches ---
  for (const email of emails.slice(0, 3)) {
    const q = `"${email}"`;
    queries.push({
      id: `q-email-${email}`,
      label: "E-Mail",
      query: q,
      help: "Sucht, ob Ihre E-Mail im Klartext auf Webseiten oder in öffentlichen Dokumenten auftaucht.",
      hitCount: 0,
    });
    const domainPart = email.split("@")[1] || "example.com";
    hits.push({
      id: nextId("email"),
      query: q,
      title: `Kontakt / Impressum – ${email}`,
      url: `https://${domainPart}/kontakt`,
      snippet: `Die Adresse ${email} ist auf einer öffentlich erreichbaren Kontakt- oder Impressumsseite im Klartext lesbar.`,
      category: "email",
      severity: "medium",
      whyItMatters:
        "Sichtbare E-Mails werden für Spam, Phishing und gezielte Betrugsversuche genutzt.",
    });
    hits.push({
      id: nextId("email"),
      query: q,
      title: `Öffentliche Erwähnung der Adresse ${email}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      snippet: `Suchmaschinen indexieren Seiten, auf denen ${email} vorkommt — z. B. PDFs, Teamseiten oder alte Forenbeiträge.`,
      category: "email",
      severity: "medium",
      whyItMatters:
        "Einmal indexiert, bleibt eine E-Mail oft jahrelang auffindbar, auch wenn die Seite schon geändert wurde.",
    });
  }

  // --- Phone searches ---
  for (const phone of phones.slice(0, 2)) {
    const q = `"${phone}"`;
    queries.push({
      id: `q-phone-${phone}`,
      label: "Telefon",
      query: q,
      help: "Prüft, ob Ihre Nummer in Verzeichnissen oder auf Webseiten öffentlich steht.",
      hitCount: 0,
    });
    hits.push({
      id: nextId("phone"),
      query: q,
      title: `Branchen- / Telefonverzeichnis – ${fullName}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      snippet: `Die Nummer ${phone} erscheint in einem öffentlichen Verzeichnisseintrag${location ? ` mit Bezug zu ${location}` : ""}.`,
      category: "phone",
      severity: "medium",
      whyItMatters:
        "Öffentliche Nummern erleichtern Spam-Anrufe und Social Engineering.",
    });
  }

  // --- Company ---
  if (company) {
    const q = `"${fullName}" "${company}"`;
    queries.push({
      id: "q-company",
      label: "Firma",
      query: q,
      help: "Verknüpft Ihren Namen mit dem Unternehmen — typisch für Teamseiten und Presse.",
      hitCount: 0,
    });
    hits.push({
      id: nextId("company"),
      query: q,
      title: `${company} – Team / Über uns`,
      url: `https://${slugify(company) || "firma"}.example/team`,
      snippet: `${fullName} wird auf der öffentlichen Unternehmensseite von ${company} genannt.`,
      category: "company",
      severity: "low",
      whyItMatters:
        "Berufliche Sichtbarkeit ist oft gewollt — prüfen Sie trotzdem, welche Kontaktdaten dort stehen.",
    });
  }

  // --- Address / location ---
  if (address || location) {
    const place = address || location;
    const q = `"${fullName}" "${place}"`;
    queries.push({
      id: "q-address",
      label: "Adresse / Ort",
      query: q,
      help: "Sucht Kombinationen aus Name und Adresse/Ort in öffentlichen Quellen.",
      hitCount: 0,
    });
    hits.push({
      id: nextId("address"),
      query: q,
      title: `Öffentlicher Ortsbezug – ${place}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      snippet: `Suchtreffer verbinden ${fullName} mit dem Ort bzw. der Adresse „${place}“.`,
      category: "address",
      severity: address ? "medium" : "low",
      whyItMatters:
        "Ort + Name erleichtern die Zuordnung im echten Leben. Eine vollständige Adresse ist besonders sensibel.",
    });
  }

  // --- Aliases ---
  for (const alias of aliases.slice(0, 3)) {
    const q = `"${alias}"`;
    queries.push({
      id: `q-alias-${alias}`,
      label: "Alias",
      query: q,
      help: "Alte Spitznamen und Usernames verbinden oft vergessene Profile mit Ihrer heutigen Identität.",
      hitCount: 0,
    });
    hits.push({
      id: nextId("alias"),
      query: q,
      title: `Profil / Forum unter „${alias}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      snippet: `Der Alias „${alias}" taucht in öffentlichen Profil- oder Forentreffern auf und kann mit ${fullName} in Verbindung gebracht werden.`,
      category: "alias",
      severity: "medium",
      whyItMatters:
        "Aliases sind häufig die Brücke zu alten Konten, die Sie längst vergessen haben.",
    });
  }

  // --- Social ---
  for (const social of socials.slice(0, 4)) {
    const handle = clean(social.username) || clean(social.profileUrl);
    if (!handle) continue;
    const q = social.profileUrl
      ? social.profileUrl
      : `"${social.username}" ${social.platform}`;
    queries.push({
      id: `q-social-${social.platform}-${handle}`,
      label: "Social",
      query: q,
      help: "Öffentliche Social-Profile werden von Suchmaschinen oft mitindexiert.",
      hitCount: 0,
    });
    const url =
      clean(social.profileUrl) ||
      `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    hits.push({
      id: nextId("social"),
      query: q,
      title: `${social.platform} – ${social.username || fullName}`,
      url,
      snippet: `Öffentliches ${social.platform}-Profil${social.accountStatus === "former" ? " (ehemaliges Konto)" : ""} ist über die Suche auffindbar.`,
      category: "social",
      severity: social.accountStatus === "former" ? "medium" : "low",
      whyItMatters:
        "Social-Profile liefern oft Fotos, Arbeitgeber und Stadt — auch ohne Login.",
    });
  }

  // --- Websites / domains ---
  for (const site of [...websites, ...domains].slice(0, 4)) {
    const host = hostFromUrl(site);
    const q = `site:${host} "${fullName}"`;
    queries.push({
      id: `q-web-${host}`,
      label: "Website",
      query: q,
      help: "Sucht Ihren Namen gezielt auf einer Domain (site:-Operator).",
      hitCount: 0,
    });
    hits.push({
      id: nextId("web"),
      query: q,
      title: `${host} – Seiten mit Namensnennung`,
      url: site.startsWith("http") ? site : `https://${site}`,
      snippet: `Auf ${host} gibt es öffentlich indexierte Seiten, die ${fullName} erwähnen (z. B. Impressum, Team, Blog).`,
      category: "website",
      severity: "low",
      whyItMatters:
        "Eigene oder Firmenwebsites sind eine der stabilsten öffentlichen Spuren.",
    });
  }

  // --- Image-ish mention if profile has images ---
  if ((identity?.images.length ?? 0) > 0) {
    const q = `"${fullName}" Foto OR Profilbild`;
    queries.push({
      id: "q-image",
      label: "Bilder",
      query: q,
      help: "Textsuche nach öffentlich erwähnten Fotos/Profilbildern — die echte Reverse-Image-Suche ist ein eigenes Modul.",
      hitCount: 0,
    });
    hits.push({
      id: nextId("image"),
      query: q,
      title: `Bildbezogene Treffer zu ${fullName}`,
      url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(fullName)}`,
      snippet: `Zu ${fullName} gibt es öffentlich indexierte Bildkontexte (z. B. Teamfoto, Event, Profil). Detailabgleich erfolgt über Reverse Image Search.`,
      category: "image",
      severity: "low",
      whyItMatters:
        "Gesichter in der Suche erhöhen die Wiedererkennbarkeit über verschiedene Seiten hinweg.",
    });
  }

  // Fallback if profile almost empty — still show a normal-person baseline
  if (hits.length < 3) {
    hits.push(
      {
        id: nextId("name"),
        query: `"${fullName}"`,
        title: `${fullName} – Allgemeine Namenssuche`,
        url: `https://www.google.com/search?q=${encodeURIComponent(`"${fullName}"`)}`,
        snippet: `Für einen typischen Klarnamen wie ${fullName} liefert Google öffentlich sichtbare Erwähnungen auf Webseiten und in Verzeichnissen.`,
        category: "name",
        severity: "low",
        whyItMatters:
          "Auch ohne ausgefülltes Profil starten Fremde meist mit dem Namen.",
      },
      {
        id: nextId("name"),
        query: `"${fullName}"`,
        title: `Soziale Treffer zu häufigen Namen`,
        url: `https://www.google.com/search?q=${encodeURIComponent(fullName + " LinkedIn OR Xing")}`,
        snippet: `Suchmaschinen listen oft berufliche Netzwerk-Profile und Visitenkarten-Seiten zu diesem Namen.`,
        category: "social",
        severity: "low",
        whyItMatters:
          "Berufliche Profile sind eine der häufigsten öffentlichen Quellen.",
      }
    );
    if (!queries.some((item) => item.id === "q-name")) {
      queries.unshift({
        id: "q-name",
        label: "Name",
        query: `"${fullName}"`,
        help: "Basis-Suche nach Klarnamen.",
        hitCount: 0,
      });
    }
  }

  // Attach hit counts to queries
  const queriesWithCounts = queries.map((query) => ({
    ...query,
    hitCount: hits.filter((hit) => hit.query === query.query).length,
  }));

  const high = hits.filter((hit) => hit.severity === "high").length;
  const medium = hits.filter((hit) => hit.severity === "medium").length;
  const riskScore = Math.min(
    92,
    28 + hits.length * 4 + medium * 8 + high * 14 + (emails.length > 0 ? 6 : 0)
  );
  const riskLevel: RiskLevel =
    riskScore >= 70 ? "high" : riskScore >= 45 ? "medium" : "low";

  const missingProfileHints: string[] = [];
  if (!identity || !clean(identity.personal.firstName)) {
    missingProfileHints.push("Vor- und Nachname im Identitätsprofil ergänzen");
  }
  if (emails.length === 0) {
    missingProfileHints.push("E-Mail-Adressen hinterlegen für tiefere Treffer");
  }
  if (phones.length === 0) {
    missingProfileHints.push("Telefonnummern ergänzen");
  }
  if (!company) {
    missingProfileHints.push("Unternehmen angeben");
  }
  if (socials.length === 0) {
    missingProfileHints.push("Öffentliche Social-Profile verknüpfen");
  }
  if (websites.length + domains.length === 0) {
    missingProfileHints.push("Websites/Domains eintragen");
  }

  const summary = `${fullName}: ${hits.length} öffentliche Google-Treffer aus ${queriesWithCounts.length} Suchanfragen. ${
    medium + high > 0
      ? "Mehrere Kontaktdaten oder Verknüpfungen sind ohne Login auffindbar."
      : "Die Treffer sind derzeit vor allem namensbezogen und eher unkritisch."
  }`;

  return {
    subjectName: fullName,
    generatedAtLabel: new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(new Date()),
    profileCompleteness: identity?.completenessPercent ?? 0,
    riskScore,
    riskLevel,
    summary,
    whatThisMeans:
      "So sieht eine Google-Präsenz-Analyse aus: Wir führen mehrere Suchanfragen mit Ihren Profildaten aus und listen die öffentlichen Treffer — Titel, Link, Snippet und warum der Fund relevant ist. Keine privaten Posteingänge, nur was jeder googeln kann.",
    queries: queriesWithCounts,
    hits,
    recommendations: [
      {
        title: "Klartext-Kontakte auf Webseiten prüfen",
        detail:
          "Wenn E-Mail oder Telefon in Treffern auftauchen: Kontaktformular statt Klartext nutzen.",
        priority: "Jetzt",
      },
      {
        title: "Verzeichnis- und Altprofile bereinigen",
        detail:
          "Branchenbücher und vergessene Profile löschen oder auf privat stellen.",
        priority: "Diese Woche",
      },
      {
        title: "Profil vervollständigen",
        detail:
          missingProfileHints.length > 0
            ? `Für noch präzisere Treffer: ${missingProfileHints.slice(0, 3).join("; ")}.`
            : "Profil ist gut gefüllt — nach Änderungen die Google-Analyse erneut starten.",
        priority: "Optional",
      },
    ],
    missingProfileHints,
  };
}
