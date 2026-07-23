import {
  classifyHitContent,
  computeOverallRisk,
  summarizeBuckets,
} from "@/lib/analysis/risk-assessment";
import { refineSerpHits } from "@/lib/analysis/hit-quality";
import {
  computeExpiresAt,
  DEFAULT_REPORT_RETENTION_DAYS,
  parseRetentionDays,
  type ReportRetentionDays,
} from "@/lib/analysis/retention";
import type {
  IntelligenceCategoryStats,
  IntelligenceHit,
  IntelligenceRecommendation,
  IntelligenceReport,
} from "@/lib/analysis/types";
import {
  fetchGoogleSearch,
  isGoogleSearchConfigured,
} from "@/lib/analysis/google/custom-search";
import { googleIntelligenceModule } from "@/lib/analysis/google/module";
import {
  buildGoogleQueriesFromIdentity,
  buildMissingProfileHints,
  resolveSubjectName,
} from "@/lib/analysis/google/queries";
import { summarizeWithGemini } from "@/lib/analysis/gemini-summary";
import type { IdentityView } from "@/lib/services/identity-service";

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
  return results;
}

function safeHostname(link: string, fallback = "google"): string {
  try {
    return new URL(link).hostname || fallback;
  } catch {
    return fallback;
  }
}

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

  for (const social of identity.socialAccounts ?? []) {
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

  for (const site of [
    ...(identity.websites ?? []),
    ...(identity.domains ?? []),
  ]) {
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
 * - SerpAPI Google Search results (when configured)
 * - Profile-linked assets (clearly labeled, not fabricated SERP)
 */
export async function runGoogleIntelligenceAnalysis(
  identity: IdentityView | null,
  options?: { retentionDays?: ReportRetentionDays }
): Promise<IntelligenceReport> {
  const generatedAt = new Date().toISOString();
  const generatedAtLabel = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(generatedAt));
  const retentionDays = parseRetentionDays(
    options?.retentionDays,
    DEFAULT_REPORT_RETENTION_DAYS
  );
  const expiresAt = computeExpiresAt(generatedAt, retentionDays);

  const subjectName = resolveSubjectName(identity);
  const queries = buildGoogleQueriesFromIdentity(identity);
  const apiConfigured = await isGoogleSearchConfigured();
  const serpHits: IntelligenceHit[] = [];
  let hitSeq = 0;

  if (apiConfigured) {
    const batches = await mapPool(queries, 3, async (plan) => {
      try {
        const items = await fetchGoogleSearch(plan.query);
        return { plan, items };
      } catch (error) {
        console.error("[google-analysis] query failed", plan.id, error);
        return {
          plan,
          items: [] as Awaited<ReturnType<typeof fetchGoogleSearch>>,
        };
      }
    });

    for (const { plan, items } of batches) {
      for (const item of items) {
        if (!item.title || !item.link) continue;
        try {
          const category = inferCategory(plan.query, plan.label);
          const classification = classifyHitContent({
            title: item.title,
            snippet: item.snippet,
            url: item.link,
            category,
            sourceType: "serpapi_google",
          });

          const hit: IntelligenceHit = {
            id: `serp-${++hitSeq}`,
            query: plan.query,
            title: item.title,
            url: item.link,
            snippet: item.snippet || "—",
            category,
            fetchedAt: generatedAt,
            source: item.displayLink || safeHostname(item.link),
            sourceType: "serpapi_google",
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
        } catch (error) {
          console.error("[google-analysis] hit mapping failed", error);
        }
      }
    }
  }

  const profileHits = profileLinkedHits(identity, generatedAt, hitSeq);
  const refinedSerp = refineSerpHits(serpHits, subjectName);
  const hits = [...refinedSerp, ...profileHits];
  const buckets = summarizeBuckets(
    hits.filter((h) => h.sourceType === "serpapi_google")
  );
  const { riskScore, riskLevel } = computeOverallRisk(hits);
  const managementOverview = buildManagementOverview(hits);

  const serpCount = refinedSerp.length;
  const summaryText =
    serpCount > 0
      ? `Live-OSINT abgeschlossen: ${serpCount} relevante öffentliche Google-Treffer zu ${subjectName} ausgewertet.`
      : queries.length > 0
        ? `Live-OSINT abgeschlossen: Zu den Profil-Suchanfragen wurden keine relevanten öffentlichen Google-Treffer gefunden.`
        : `Live-OSINT abgeschlossen: Für eine Suche fehlen noch Identitätsdaten im Profil.`;

  const dataSourceLabel = apiConfigured
    ? "SerpAPI Google Search · Identitätsprofil"
    : "Identitätsprofil · öffentliche Verknüpfungen";

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
    retentionDays,
    expiresAt,
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

  try {
    draft.aiSummary = await summarizeWithGemini(draft);
  } catch (error) {
    console.error("[google-analysis] gemini summary failed", error);
    draft.aiSummary = null;
  }
  return draft;
}

async function buildReportRecommendations(
  hits: IntelligenceHit[],
  identity: IdentityView | null
): Promise<IntelligenceRecommendation[]> {
  const actionHits = hits.filter(
    (h) => h.shouldAct && h.sourceType === "serpapi_google"
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
