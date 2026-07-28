import type { IntelligenceHit } from "@/lib/analysis/types";
import type { ReverseImageHit } from "@/lib/analysis/reverse-image/types";
import type { SynSightOrderType } from "@/lib/analysis/username/types";

export function reverseImageHitKey(hit: ReverseImageHit): string {
  return [hit.imageUrl, hit.sourceUrl ?? "", hit.query].join("|");
}

export function orderTypeForReverseImageHit(): SynSightOrderType {
  return "cache_removal";
}

export function selfGuideForReverseImageHit(hit: ReverseImageHit): string[] {
  return [
    "Prüfen Sie, ob das Bild wirklich Sie zeigt und ob die Quelle legitim ist.",
    "Öffnen Sie die Originalseite und prüfen Sie Kontext, Datum und Sichtbarkeit.",
    "Bei unerwünschter Veröffentlichung: Lösch- oder Datenschutzanfrage an den Betreiber.",
    "Nach Erledigung „Als gelöst markieren“ oder SynSight mit der Entfernung beauftragen.",
  ];
}

export function reverseImageHitToIntelligenceHit(
  hit: ReverseImageHit
): IntelligenceHit {
  const similarityPct = Math.round(hit.similarity * 100);
  const severity =
    hit.similarity >= 0.85
      ? "critical"
      : hit.similarity >= 0.72
        ? "high"
        : hit.similarity >= 0.58
          ? "medium"
          : "low";
  const risk =
    hit.similarity >= 0.8
      ? "action"
      : hit.similarity >= 0.62
        ? "review"
        : "watch";

  return {
    id: hit.id,
    query: hit.query,
    title: hit.title,
    url: hit.sourceUrl || hit.imageUrl,
    snippet: `Öffentliches Bildsignal ${similarityPct} % · Quelle ${hit.sourceHost ?? "Web"} · Suchbezug ${hit.query}.`,
    category: "image",
    filterCategory: "image",
    displayCategory: "Bildtreffer",
    fetchedAt: hit.fetchedAt,
    source: hit.sourceHost ?? "Public Image Discovery",
    sourceType: "serpapi_images",
    visibility: "public_index",
    relevance: "relevant",
    risk,
    status: "verified",
    whyFound: `Öffentlich indexierter Bildtreffer für „${hit.query}“ über die Smart Discovery.`,
    whyRelevant:
      hit.scoreReasons?.join(" · ") ||
      `Hoher Personen- und Kontextbezug (${similarityPct} % Confidence).`,
    visibleData: "Vorschaubild, Seitenkontext, Index-Quelle",
    isPublic: true,
    isProblematic: hit.similarity >= 0.8,
    risks:
      hit.similarity >= 0.8
        ? "Öffentliches Bild mit hohem Personen- und Kontextbezug — Sichtbarkeit und Umfeld prüfen."
        : "Möglicher personenrelevanter Bildtreffer — manuelle Prüfung empfohlen.",
    canIgnore: true,
    shouldAct: hit.similarity >= 0.7,
    recommendation:
      hit.similarity >= 0.8
        ? "Bild und Quelle prüfen; bei unerwünschter Veröffentlichung Entfernung oder Datenschutzanfrage veranlassen."
        : "Treffer verifizieren und Sichtbarkeit bewerten.",
    severity,
    riskPercent: similarityPct,
    identityConfidence: similarityPct,
    identityConfidenceLabel:
      similarityPct >= 85 ? "Sehr hoher Personenbezug" : "Prüfen empfohlen",
    whyFoundPlain: `Gefunden über die öffentliche Bildsuche nach „${hit.query}“.`,
    whyRelevantPlain: `${similarityPct} % Relevanz-/Confidence-Wert aus Suchbezug, Domain und Kontext.`,
    belongsToYou:
      similarityPct >= 80
        ? "Hoher Personenbezug — bitte kurz verifizieren."
        : "Unklar — manuell prüfen.",
    isDangerous:
      hit.similarity >= 0.85
        ? "Kann reputations- oder datenschutzrelevant sein, wenn Name, Alias oder sensible Plattformen sichtbar sind."
        : "Abhängig vom Veröffentlichungskontext.",
    needsAction: hit.similarity >= 0.7 ? "Ja — Quelle prüfen" : "Optional",
    aiEvaluation: {
      stars: hit.similarity >= 0.85 ? 5 : hit.similarity >= 0.72 ? 4 : 3,
      headline: `${similarityPct} % Discovery-Confidence`,
      reasons: [
        "Öffentlich indexierter Bildtreffer.",
        `Treffergruppe: ${hit.queryGroup ?? "allgemein"}.`,
        `Quelle: ${hit.sourceHost ?? "Web"}.`,
      ],
      dangers:
        hit.similarity >= 0.8
          ? [
              "Unerwünschte öffentliche Sichtbarkeit einer personenrelevanten Bildquelle.",
            ]
          : [],
      recommendation:
        hit.similarity >= 0.8
          ? "Originalseite öffnen, Kontext prüfen, ggf. Entfernung veranlassen."
          : "Treffer manuell verifizieren.",
    },
  };
}
