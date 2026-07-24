import type {
  IntelligenceHit,
  IntelligenceRecommendation,
} from "@/lib/analysis/types";
import type { AggregatedProfile } from "@/lib/analysis/osint/profile-aggregator";
import { detectSensitiveCategories } from "@/lib/analysis/osint/threat-evaluator";

/**
 * RecommendationEngine — konkrete, belegbare Empfehlungen.
 */
export function buildConcreteRecommendations(
  hits: IntelligenceHit[],
  profiles: AggregatedProfile[]
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];
  const verified = hits.filter(
    (h) =>
      h.sourceType === "serpapi_google" && (h.identityConfidence ?? 0) >= 70
  );
  const sensitive = detectSensitiveCategories(verified);

  for (const profile of profiles.slice(0, 8)) {
    if (profile.maxConfidence < 70) continue;
    if (profile.pageCount >= 2) {
      recs.push({
        title: `${profile.platform}: öffentliches Profil prüfen`,
        detail: `Auf ${profile.host} wurden ${profile.pageCount} öffentlich indexierte Seiten Ihrer Identität zugeordnet.`,
        why: "Mehrere Seiten derselben Domain erhöhen die Auffindbarkeit Ihrer digitalen Identität.",
        danger:
          "Dritte können Profilhistorie und Aktivitäten ohne Login nachverfolgen.",
        howToFix: `${profile.platform}-Profil enthält öffentlich indexierte Inhalte unter ${profile.url}. Wenn dieses Profil nicht mehr benötigt wird, empfehlen wir die Umstellung auf einen neutralen Benutzernamen oder die Deaktivierung der öffentlichen Indexierung.`,
        effort: "10–30 Minuten",
        priority: profile.maxConfidence >= 85 ? "Jetzt" : "Diese Woche",
        difficulty: "Mittel",
        relatedHitIds: profile.hitIds.slice(0, 5),
      });
    }
  }

  const contactHits = verified.filter((h) =>
    /@|\+?\d[\d\s/-]{6,}|telefon|e-?mail/i.test(
      `${h.title} ${h.snippet} ${h.url}`
    )
  );
  if (contactHits.length > 0) {
    recs.push({
      title: "Öffentliche Kontaktdaten entfernen lassen",
      detail: `${contactHits.length} verifizierte Treffer enthalten Hinweise auf Telefon oder E-Mail.`,
      why: "Öffentlich indexierte Kontaktdaten ermöglichen Spam und Social Engineering.",
      danger: "Unaufgeforderter Kontakt und Identitätsmissbrauch.",
      howToFix:
        "Öffnen Sie den Originaltreffer, kontaktieren Sie den Seitenbetreiber und beantragen Sie Entfernung oder Anonymisierung der Kontaktdaten.",
      effort: "15–45 Minuten pro Eintrag",
      priority: "Jetzt",
      difficulty: "Mittel",
      relatedHitIds: contactHits.map((h) => h.id).slice(0, 8),
    });
  }

  for (const label of sensitive) {
    recs.push({
      title: `Inhaltstyp prüfen: ${label}`,
      detail: `In den verifizierten Treffern wurden belegbare Hinweise auf „${label}" gefunden.`,
      why: "Diese Inhalte sind öffentlich indexiert und Ihrer Identität zugeordnet.",
      danger:
        "Reputations- und Missbrauchsrisiko durch öffentliche Auffindbarkeit.",
      howToFix: `Prüfen Sie die Originalquellen zu „${label}" und entscheiden Sie über Löschung, Privatisierung oder rechtliche Schritte.`,
      effort: "variabel",
      priority: "Jetzt",
      difficulty: "Hoch",
      relatedHitIds: verified
        .filter((h) =>
          `${h.title} ${h.snippet} ${h.url}`
            .toLowerCase()
            .includes(label.toLowerCase().slice(0, 6))
        )
        .map((h) => h.id)
        .slice(0, 5),
    });
  }

  if (recs.length === 0 && verified.length > 0) {
    recs.push({
      title: "Verifizierte Treffer manuell prüfen",
      detail: `${verified.length} Treffer mit Confidence ≥ 70 % vorliegen.`,
      why: "Auch unkritische öffentliche Spuren sollten periodisch kontrolliert werden.",
      danger: "Schrittende Kontrolle lässt neue Indexierungen unbemerkt.",
      howToFix:
        "Öffnen Sie die Originalquellen und prüfen Sie, ob die Einträge aktuell und erwünscht sind.",
      effort: "10–20 Minuten",
      priority: "Diese Woche",
      difficulty: "Niedrig",
      relatedHitIds: verified.map((h) => h.id).slice(0, 5),
    });
  }

  return recs.slice(0, 12);
}
