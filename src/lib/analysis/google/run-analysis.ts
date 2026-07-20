import {
  classifyHitContent,
  computeOverallRisk,
  summarizeBuckets,
} from "@/lib/analysis/risk-assessment";
import type {
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
  const apiConfigured = isGoogleCustomSearchConfigured();
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

  const serpCount = serpHits.length;
  const summaryText =
    apiConfigured && serpCount > 0
      ? `Es wurden ${serpCount} öffentliche Google-Suchtreffer über die Custom Search API gefunden.`
      : apiConfigured && serpCount === 0
        ? "Die Google Custom Search API lieferte für Ihre Profil-Suchanfragen keine Treffer."
        : "Google Custom Search API ist nicht konfiguriert — es werden nur Profil-Suchanfragen und hinterlegte Verknüpfungen angezeigt.";

  const dataSourceLabel = apiConfigured
    ? "Google Custom Search JSON API + Identitätsprofil"
    : "Identitätsprofil (API nicht konfiguriert)";

  const criticalHits = hits.filter(
    (h) => h.risk === "action" || h.risk === "review"
  ).length;

  const recommendations = buildReportRecommendations(hits, identity);
  const missingProfileHints = buildMissingProfileHints(identity);

  const priority =
    criticalHits >= 3
      ? "Jetzt"
      : criticalHits >= 1
        ? "Diese Woche"
        : serpCount > 0
          ? "Beobachten"
          : "Keine Maßnahme";

  return {
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
}

function buildReportRecommendations(
  hits: IntelligenceHit[],
  identity: IdentityView | null
): IntelligenceRecommendation[] {
  const actionHits = hits.filter(
    (h) => h.shouldAct && h.sourceType === "google_custom_search"
  );
  const recs: IntelligenceRecommendation[] = [];

  if (actionHits.length > 0) {
    recs.push({
      title: "Sensible Google-Treffer prüfen",
      detail: `${actionHits.length} Treffer enthalten Hinweise auf Kontaktdaten oder Verzeichniseinträge. Prüfen Sie jeden Treffer und leiten Sie Entfernung oder Korrektur ein.`,
      priority: "Jetzt",
      relatedHitIds: actionHits.map((h) => h.id),
    });
  }

  if (!isGoogleCustomSearchConfigured()) {
    recs.push({
      title: "Live-Google-Suche aktivieren",
      detail:
        "Für verifizierte Suchtreffer muss die Google Custom Search JSON API auf dem Server konfiguriert werden (GOOGLE_CUSTOM_SEARCH_API_KEY und GOOGLE_CUSTOM_SEARCH_ENGINE_ID).",
      priority: "Optional",
      relatedHitIds: [],
    });
  }

  const hints = buildMissingProfileHints(identity);
  if (hints.length > 0) {
    recs.push({
      title: "Identitätsprofil vervollständigen",
      detail: `Für präzisere Suchanfragen: ${hints.slice(0, 3).join("; ")}.`,
      priority: "Optional",
      relatedHitIds: [],
    });
  }

  if (recs.length === 0) {
    recs.push({
      title: "Regelmäßige Beobachtung",
      detail:
        "Aktuell sind keine kritischen Treffer erkannt. Wiederholen Sie die Analyse nach Profiländerungen oder bei neuen Auffälligkeiten.",
      priority: "Optional",
      relatedHitIds: [],
    });
  }

  return recs;
}
