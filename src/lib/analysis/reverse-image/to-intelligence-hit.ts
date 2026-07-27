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
    hit.similarity >= 0.9
      ? "critical"
      : hit.similarity >= 0.8
        ? "high"
        : hit.similarity >= 0.7
          ? "medium"
          : "low";
  const risk =
    hit.similarity >= 0.85
      ? "action"
      : hit.similarity >= 0.7
        ? "review"
        : "watch";

  return {
    id: hit.id,
    query: hit.query,
    title: hit.title,
    url: hit.sourceUrl || hit.imageUrl,
    snippet: `Visuelle Übereinstimmung ${similarityPct} % · Quelle ${hit.sourceHost ?? "Web"} · Referenz ${hit.referenceImageType ?? "Profil"}.`,
    category: "image",
    filterCategory: "image",
    displayCategory: "Bildtreffer",
    fetchedAt: hit.fetchedAt,
    source: hit.sourceHost ?? "Google Images",
    sourceType: "serpapi_images",
    visibility: "public_index",
    relevance: "relevant",
    risk,
    status: "verified",
    whyFound: `Google Images Index-Vorschau für „${hit.query}“ — öffentlich indexierte Seite.`,
    whyRelevant: `InsightFace-Abgleich mit Ihrem Referenzbild (${similarityPct} % Ähnlichkeit).`,
    visibleData: "Vorschaubild, Seitenkontext, Index-Quelle",
    isPublic: true,
    isProblematic: hit.similarity >= 0.85,
    risks:
      hit.similarity >= 0.85
        ? "Hohe Wahrscheinlichkeit, dass es Ihr Gesicht zeigt — prüfen Sie Kontext und Sichtbarkeit."
        : "Möglicher visueller Treffer — manuelle Prüfung empfohlen.",
    canIgnore: true,
    shouldAct: hit.similarity >= 0.75,
    recommendation:
      hit.similarity >= 0.85
        ? "Bild und Quelle prüfen; bei unerwünschter Veröffentlichung Entfernung veranlassen."
        : "Treffer verifizieren und bei Bedarf Maßnahmen einleiten.",
    severity,
    riskPercent: similarityPct,
    identityConfidence: similarityPct,
    identityConfidenceLabel:
      similarityPct >= 85 ? "Sehr wahrscheinlich Sie" : "Prüfen empfohlen",
    whyFoundPlain: `Gefunden über Google-Bildersuche nach „${hit.query}“.`,
    whyRelevantPlain: `${similarityPct} % visuelle Übereinstimmung mit Ihrem Referenzfoto.`,
    belongsToYou:
      similarityPct >= 80
        ? "Sehr wahrscheinlich — bitte kurz visuell bestätigen."
        : "Unklar — manuell prüfen.",
    isDangerous:
      hit.similarity >= 0.9
        ? "Kann reputationsschädigend sein, wenn der Kontext sensibel ist."
        : "Abhängig vom Veröffentlichungskontext.",
    needsAction: hit.similarity >= 0.75 ? "Ja — Quelle prüfen" : "Optional",
    aiEvaluation: {
      stars: hit.similarity >= 0.9 ? 5 : hit.similarity >= 0.8 ? 4 : 3,
      headline: `${similarityPct} % visuelle Übereinstimmung`,
      reasons: [
        "Öffentliche Google-Index-Vorschau (kein direkter Plattform-Scrape).",
        `Referenz: ${hit.referenceImageType ?? "Profilbild"}.`,
        `Quelle: ${hit.sourceHost ?? "Web"}.`,
      ],
      dangers:
        hit.similarity >= 0.85
          ? ["Unerwünschte Veröffentlichung Ihres Gesichts im Netz."]
          : [],
      recommendation:
        hit.similarity >= 0.85
          ? "Originalseite öffnen, Kontext prüfen, ggf. Entfernung veranlassen."
          : "Treffer manuell verifizieren.",
    },
  };
}
