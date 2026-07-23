import {
  classifyHitContent,
  computeOverallRisk,
  summarizeBuckets,
} from "@/lib/analysis/risk-assessment";
import type {
  IntelligenceCategoryStats,
  IntelligenceHit,
  IntelligenceRecommendation,
  IntelligenceReport,
} from "@/lib/analysis/types";
import {
  fetchGoogleCustomSearch,
  isGoogleCustomSearchConfigured,
} from "@/lib/analysis/google/custom-search";
import { googleIntelligenceModule } from "@/lib/analysis/google/module";
import {
  buildGoogleQueriesFromIdentity,
  buildMissingProfileHints,
  resolveSubjectName,
} from "@/lib/analysis/google/queries";
import { summarizeWithGemini } from "@/lib/analysis/gemini-summary";
import type { IdentityView } from "@/lib/services/identity-service";

function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function inferCategory(query: string, label: string): string {
  const lower = query.toLowerCase();
  if (label === "E-Mail" || lower.includes("@")) return "email";
  if (label === "Telefon" || lower.includes("+")) return "phone";
  if (label === "Firma") return "company";
  if (label === "Alias") return "alias";
  if (label === "Website" || lower.startsWith("site:")) return "website";
  if (label === "Ort / Adresse") return "address";
  if (label === "Name") return "name";
  return "general";
}

function categorizeHit(hit: IntelligenceHit): keyof IntelligenceCategoryStats {
  const url = hit.url.toLowerCase();
  const text = `${hit.title} ${hit.snippet}`.toLowerCase();
  if (
    hit.category === "social" ||
    /linkedin|xing|facebook|instagram|twitter|x\.com|tiktok/.test(url)
  ) {
    return "social";
  }
  if (hit.category === "phone" || /\+?\d[\d\s\-()]{7,}/.test(text)) {
    return "phones";
  }
  if (hit.category === "email" || /@/.test(text)) return "emails";
  if (hit.category === "company" || /gmbh|ag|ltd|inc|unternehmen/.test(text)) {
    return "companies";
  }
  if (/\.(pdf|docx?|xlsx?)(\?|$)/i.test(url) || /dokument|pdf/.test(text)) {
    return "documents";
  }
  if (/presse|news|zeitung|magazin|artikel/.test(url + text)) return "press";
  if (/forum|reddit|board|community/.test(url + text)) return "forums";
  if (/cdn|image|img|photo|picture|\.jpe?g|\.png|\.webp/.test(url)) {
    return "images";
  }
  if (
    hit.category === "website" ||
    hit.category === "name" ||
    hit.category === "address"
  ) {
    return "websites";
  }
  return "other";
}

function buildManagementOverview(
  hits: IntelligenceHit[]
): IntelligenceCategoryStats {
  const stats: IntelligenceCategoryStats = {
    websites: 0,
    social: 0,
    images: 0,
    phones: 0,
    emails: 0,
    companies: 0,
    documents: 0,
    press: 0,
    forums: 0,
    other: 0,
    mentions: hits.length,
  };
  for (const hit of hits) {
    const key = categorizeHit(hit);
    if (key !== "mentions") stats[key] += 1;
  }
  return stats;
}

function buildRecommendation(hit: IntelligenceHit): string {
  if (hit.sourceType === "identity_profile") {
    return hit.isProblematic
      ? "Dieser Eintrag stammt aus Ihrem Identitätsprofil und ist öffentlich verlinkt. Prüfen Sie, ob die Sichtbarkeit gewollt ist."
      : "Profil-Verknüpfung — kein automatischer Google-Treffer. Dient als Referenz für Ihre digitale Präsenz.";
  }

  if (hit.risk === "action") {
    return "Sensible Kontaktdaten erscheinen in diesem öffentlichen Suchtreffer. Kontaktieren Sie den Seitenbetreiber und bitten Sie um Entfernung oder Anonymisierung.";
  }

  if (hit.risk === "review") {
    return "Der Treffer enthält personenbezogene Informationen in einem Verzeichnis oder Impressum. Prüfen Sie den Eintrag und aktualisieren oder entfernen Sie ihn bei Bedarf.";
  }

  if (hit.risk === "watch") {
    return "Dieser Treffer stammt aus einer seriösen Quelle und stellt aktuell kein akutes Sicherheitsrisiko dar. Beobachten Sie die Sichtbarkeit regelmäßig.";
  }

  return "Kein unmittelbarer Handlungsbedarf. Dokumentieren Sie den Treffer für Ihre digitale Identitätsübersicht.";
}

function profileLinkedHits(
  identity: IdentityView | null,
  fetchedAt: string,
  startId: number
): IntelligenceHit[] {
  if (!identity) return [];
  let seq = startId;
  const hits: IntelligenceHit[] = [];

  for (const social of identity.socialAccounts) {
    const url = clean(social.profileUrl);
    if (!url) continue;
    const classification = classifyHitContent({
      title: `${social.platform} Profil`,
      snippet: social.username,
      url,
      category: "social",
      sourceType: "identity_profile",
    });
    hits.push({
      id: `profile-social-${++seq}`,
      query: url,
      title: `${social.platform} — ${social.username || url}`,
      url,
      snippet: `Im Identitätsprofil hinterlegtes ${social.platform}-Profil (${social.accountStatus}).`,
      category: "social",
      fetchedAt,
      source: "Identitätsprofil",
      sourceType: "identity_profile",
      visibility: "profile_linked",
      relevance: classification.relevance,
      risk: classification.risk,
      status: "profile_only",
      whyFound: "Sie haben dieses Profil in SynSight hinterlegt.",
      whyRelevant:
        "Verknüpfte Social-Profile sind häufig über Suchmaschinen auffindbar.",
      visibleData: `Plattform: ${social.platform}, Benutzername: ${social.username || "—"}`,
      isPublic: true,
      isProblematic: classification.isProblematic,
      risks: classification.isProblematic
        ? "Öffentliches Profil kann Fotos, Arbeitgeber und Kontaktdaten preisgeben."
        : "Profil-Verknüpfung ohne zusätzliche Google-Treffer.",
      canIgnore: classification.canIgnore,
      shouldAct: classification.shouldAct,
      recommendation: "",
    });
  }

  for (const site of [...identity.websites, ...identity.domains]) {
    const url = site.startsWith("http") ? site : `https://${site}`;
    const classification = classifyHitContent({
      title: site,
      snippet: site,
      url,
      category: "website",
      sourceType: "identity_profile",
    });
    hits.push({
      id: `profile-web-${++seq}`,
      query: url,
      title: `Website / Domain — ${site}`,
      url,
      snippet: "Im Identitätsprofil hinterlegte Website oder Domain.",
      category: "website",
      fetchedAt,
      source: "Identitätsprofil",
      sourceType: "identity_profile",
      visibility: "profile_linked",
      relevance: classification.relevance,
      risk: classification.risk,
      status: "profile_only",
      whyFound: "Sie haben diese URL/Domain in SynSight eingetragen.",
      whyRelevant:
        "Eigene Websites sind stabile öffentliche Identitätssignale.",
      visibleData: url,
      isPublic: true,
      isProblematic: false,
      risks: "Kontrollieren Sie Impressum und Kontaktdaten auf der Seite.",
      canIgnore: true,
      shouldAct: false,
      recommendation: "",
    });
  }

  for (const hit of hits) {
    hit.recommendation = buildRecommendation(hit);
  }

  return hits;
}

/**
 * Runs the Google Intelligence analysis using only:
 * - Profile-derived query plans
 * - Google Custom Search API results (when configured)
 * - Profile-linked assets (clearly labeled, not fabricated SERP)
 */
export async function runGoogleIntelligenceAnalysis(
  identity: IdentityView | null
): Promise<IntelligenceReport> {
  const generatedAt = new Date().toISOString();
  const generatedAtLabel = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(generatedAt));

  const subjectName = resolveSubjectName(identity);
  const queries = buildGoogleQueriesFromIdentity(identity);
  const apiConfigured = await isGoogleCustomSearchConfigured();
  const serpHits: IntelligenceHit[] = [];
  let hitSeq = 0;

  if (apiConfigured) {
    for (const plan of queries) {
      const items = await fetchGoogleCustomSearch(plan.query);
      for (const item of items) {
        if (!item.title || !item.link) continue;
        const category = inferCategory(plan.query, plan.label);
        const classification = classifyHitContent({
          title: item.title,
          snippet: item.snippet,
          url: item.link,
          category,
          sourceType: "google_custom_search",
        });

        const hit: IntelligenceHit = {
          id: `serp-${++hitSeq}`,
          query: plan.query,
          title: item.title,
          url: item.link,
          snippet: item.snippet || "—",
          category,
          fetchedAt: generatedAt,
          source: item.displayLink || new URL(item.link).hostname,
          sourceType: "google_custom_search",
          visibility: "public_index",
          relevance: classification.relevance,
          risk: classification.risk,
          status: "verified",
          whyFound: `Gefunden über die Profil-Suchanfrage „${plan.query}".`,
          whyRelevant:
            classification.relevance === "relevant"
              ? "Der Treffer enthält personenbezogene Signale aus Ihrem Profil."
              : "Allgemeiner öffentlicher Treffer zur Suchanfrage.",
          visibleData: [item.title, item.snippet].filter(Boolean).join(" — "),
          isPublic: true,
          isProblematic: classification.isProblematic,
          risks: classification.isProblematic
            ? "Personenbezogene oder Kontaktdaten sind ohne Login sichtbar."
            : "Öffentlich indexierte Information.",
          canIgnore: classification.canIgnore,
          shouldAct: classification.shouldAct,
          recommendation: "",
        };
        hit.recommendation = buildRecommendation(hit);
        serpHits.push(hit);
      }
    }
  }

  const profileHits = profileLinkedHits(identity, generatedAt, hitSeq);
  const hits = [...serpHits, ...profileHits];
  const buckets = summarizeBuckets(
    hits.filter((h) => h.sourceType === "google_custom_search")
  );
  const { riskScore, riskLevel } = computeOverallRisk(hits);
  const managementOverview = buildManagementOverview(hits);

  const serpCount = serpHits.length;
  const summaryText =
    apiConfigured && serpCount > 0
      ? `Mit den von Ihnen angegebenen Daten konnten ${serpCount} öffentlich erreichbare Google-Suchtreffer gefunden werden.`
      : apiConfigured && serpCount === 0
        ? "Mit den von Ihnen angegebenen Daten konnten über die Google Custom Search API keine öffentlichen Treffer gefunden werden."
        : "Google Custom Search API ist nicht konfiguriert — es werden nur Profil-Suchanfragen und hinterlegte Verknüpfungen angezeigt. Es werden keine Treffer simuliert.";

  const dataSourceLabel = apiConfigured
    ? "Google Custom Search JSON API + Identitätsprofil"
    : "Identitätsprofil (API nicht konfiguriert)";

  const criticalHits = hits.filter(
    (h) => h.risk === "action" || h.risk === "review"
  ).length;

  const recommendations = await buildReportRecommendations(hits, identity);
  const missingProfileHints = buildMissingProfileHints(identity);

  const priority =
    criticalHits >= 3
      ? "Jetzt"
      : criticalHits >= 1
        ? "Diese Woche"
        : serpCount > 0
          ? "Beobachten"
          : "Keine Maßnahme";

  const draft: IntelligenceReport = {
    moduleKey: googleIntelligenceModule.key,
    moduleTitle: googleIntelligenceModule.title,
    subjectName,
    generatedAt,
    generatedAtLabel,
    profileCompleteness: identity?.completenessPercent ?? 0,
    dataSourceLabel,
    apiConfigured,
    riskScore,
    riskLevel,
    summaryText,
    aiSummary: null,
    managementOverview,
    buckets,
    queries,
    hits,
    recommendations,
    executive: {
      totalPublicHits: serpCount,
      criticalHits,
      recommendedActions: recommendations
        .filter((r) => r.priority !== "Optional")
        .map((r) => r.title),
      overallRisk: riskLevel,
      priority,
      narrative: `${subjectName}: ${serpCount} verifizierte Google-Treffer, ${profileHits.length} Profil-Verknüpfungen. Gesamtrisiko: ${riskLevel}.`,
    },
    missingProfileHints,
  };

  draft.aiSummary = await summarizeWithGemini(draft);
  return draft;
}

async function buildReportRecommendations(
  hits: IntelligenceHit[],
  identity: IdentityView | null
): Promise<IntelligenceRecommendation[]> {
  const actionHits = hits.filter(
    (h) => h.shouldAct && h.sourceType === "google_custom_search"
  );
  const recs: IntelligenceRecommendation[] = [];

  if (actionHits.length > 0) {
    recs.push({
      title: "Sensible Google-Treffer prüfen",
      detail: `${actionHits.length} Treffer enthalten Hinweise auf Kontaktdaten oder Verzeichniseinträge.`,
      why: "Öffentlich indexierte Kontaktdaten erhöhen das Risiko für Spam, Social Engineering und Identitätsmissbrauch.",
      danger:
        "Dritte können Sie ungefragt kontaktieren oder Profile unter Ihrem Namen verknüpfen.",
      howToFix:
        "Öffnen Sie jeden kritischen Treffer, kontaktieren Sie den Seitenbetreiber und beantragen Sie Entfernung oder Anonymisierung.",
      effort: "15–45 Minuten pro Eintrag",
      priority: "Jetzt",
      difficulty: "Mittel",
      relatedHitIds: actionHits.map((h) => h.id),
    });
  }

  if (!(await isGoogleCustomSearchConfigured())) {
    recs.push({
      title: "Live-Google-Suche aktivieren",
      detail:
        "Für verifizierte Suchtreffer müssen Google Custom Search API-Key und Search-Engine-ID (cx) im Admin unter API-Verwaltung hinterlegt werden.",
      why: "Ohne API können keine echten Google-Treffer geladen werden — SynSight erfindet keine Ergebnisse.",
      danger: "Ohne Live-Daten bleibt die Sichtbarkeit unvollständig.",
      howToFix:
        "Admin Control Center → API-Verwaltung → Google Custom Search: API-Key und Engine-ID (cx) speichern. Optional Gemini für die KI-Zusammenfassung.",
      effort: "5–10 Minuten",
      priority: "Optional",
      difficulty: "Niedrig",
      relatedHitIds: [],
    });
  }

  const hints = buildMissingProfileHints(identity);
  if (hints.length > 0) {
    recs.push({
      title: "Identitätsprofil vervollständigen",
      detail: `Für präzisere Suchanfragen: ${hints.slice(0, 3).join("; ")}.`,
      why: "Mehr Profilfelder erzeugen präzisere, ehrliche Suchanfragen.",
      danger: "Unvollständige Profile führen zu Lücken in der OSINT-Abdeckung.",
      howToFix:
        "Öffnen Sie das Identitätsprofil und ergänzen Sie fehlende Felder.",
      effort: "5–10 Minuten",
      priority: "Optional",
      difficulty: "Niedrig",
      relatedHitIds: [],
    });
  }

  if (recs.length === 0) {
    recs.push({
      title: "Regelmäßige Beobachtung",
      detail:
        "Aktuell sind keine kritischen Treffer erkannt. Wiederholen Sie die Analyse nach Profiländerungen.",
      why: "Digitale Spuren ändern sich laufend.",
      danger: "Neue Einträge können unbemerkt entstehen.",
      howToFix:
        "Planen Sie eine erneute Google-Analyse nach größeren Profiländerungen.",
      effort: "2–5 Minuten",
      priority: "Optional",
      difficulty: "Niedrig",
      relatedHitIds: [],
    });
  }

  return recs;
}
