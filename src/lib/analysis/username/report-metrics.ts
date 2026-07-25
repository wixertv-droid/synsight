import type {
  UsernameActionItem,
  UsernameHeatmapCell,
  UsernameHit,
  UsernameIdentityGraphEdge,
  UsernameIdentityGraphNode,
  UsernameManagementOverview,
  UsernamePlatformOverviewItem,
  UsernameRiskLevel,
  UsernameTimelineItem,
} from "@/lib/analysis/username/types";

function maxRisk(
  a: UsernameRiskLevel,
  b: UsernameRiskLevel
): UsernameRiskLevel {
  const rank = { low: 0, medium: 1, high: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export function buildPlatformOverview(
  hits: UsernameHit[]
): UsernamePlatformOverviewItem[] {
  const map = new Map<string, UsernamePlatformOverviewItem>();
  for (const hit of hits) {
    const key = hit.platform;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        platform: hit.platform,
        category: hit.category,
        count: 1,
        avgConfidence: hit.confidence,
        maxRisk: hit.riskLevel,
      });
      continue;
    }
    const count = existing.count + 1;
    existing.avgConfidence = Math.round(
      (existing.avgConfidence * existing.count + hit.confidence) / count
    );
    existing.count = count;
    existing.maxRisk = maxRisk(existing.maxRisk, hit.riskLevel);
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || b.avgConfidence - a.avgConfidence
  );
}

export function buildIdentityGraph(
  username: string,
  hits: UsernameHit[]
): {
  nodes: UsernameIdentityGraphNode[];
  edges: UsernameIdentityGraphEdge[];
} {
  const nodes: UsernameIdentityGraphNode[] = [
    {
      id: "username",
      label: username || "Username",
      kind: "username",
      weight: 100,
    },
  ];
  const edges: UsernameIdentityGraphEdge[] = [];
  const seen = new Set<string>();

  for (const hit of hits.slice(0, 12)) {
    const platformId = `p:${hit.platform}`;
    if (!seen.has(platformId)) {
      seen.add(platformId);
      nodes.push({
        id: platformId,
        label: hit.platform,
        kind: "platform",
        weight: hit.confidence,
      });
      edges.push({
        from: "username",
        to: platformId,
        label: `${hit.confidence}%`,
      });
    }
    if (hit.isProblematic) {
      const signalId = `s:${hit.problemTags[0] ?? "risk"}`;
      if (!seen.has(signalId)) {
        seen.add(signalId);
        nodes.push({
          id: signalId,
          label: hit.problemTags[0] ?? "Risiko",
          kind: "signal",
          weight: hit.confidence,
        });
        edges.push({
          from: platformId,
          to: signalId,
          label: "risk",
        });
      }
    }
  }

  return { nodes, edges };
}

export function buildTimeline(hits: UsernameHit[]): UsernameTimelineItem[] {
  const items: UsernameTimelineItem[] = hits
    .filter((h) => h.firstSeen)
    .map((h) => ({
      label: h.platform,
      detail: h.firstSeen ?? "unbekannt",
      sortKey: h.firstSeen ?? "9999",
    }));

  if (items.length === 0) {
    const byCategory = buildPlatformOverview(hits).slice(0, 6);
    return byCategory.map((item) => ({
      label: item.platform,
      detail: `${item.count} Treffer · Ø ${item.avgConfidence}% Confidence`,
      sortKey: item.platform,
    }));
  }

  return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function buildHeatmap(hits: UsernameHit[]): UsernameHeatmapCell[] {
  const map = new Map<string, number>();
  for (const hit of hits) {
    map.set(hit.category, (map.get(hit.category) ?? 0) + 1);
  }
  const max = Math.max(...map.values(), 1);
  return [...map.entries()]
    .map(([category, count]) => ({
      category,
      count,
      intensity: Math.round((count / max) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildManagementOverview(input: {
  username: string;
  hits: UsernameHit[];
  identityScore: number;
  riskScore: number;
  confidence: number;
}): UsernameManagementOverview {
  const platforms = new Set(input.hits.map((h) => h.platform));
  const problematic = input.hits.filter((h) => h.isProblematic);
  const categories = buildHeatmap(input.hits).map((c) => c.category);

  let overallRisk: UsernameRiskLevel = "low";
  if (input.riskScore >= 70 || problematic.length >= 2) overallRisk = "high";
  else if (input.riskScore >= 40 || problematic.length >= 1)
    overallRisk = "medium";

  const threatLevel =
    overallRisk === "high"
      ? "HIGH"
      : overallRisk === "medium"
        ? "MEDIUM"
        : "LOW";

  const uniqueUsername =
    input.hits.length > 0 &&
    platforms.size >= 3 &&
    input.hits.every((h) => h.confidence >= 70);

  const headline =
    input.hits.length === 0
      ? `Keine belastbaren öffentlichen Treffer zu „${input.username}“ ab Confidence ≥ 60 %.`
      : `${platforms.size} Plattformen · ${input.hits.length} Identity-Treffer zu „${input.username}“.`;

  return {
    headline,
    overallRisk,
    overallRiskLabel:
      overallRisk === "high"
        ? "HOCH"
        : overallRisk === "medium"
          ? "MITTEL"
          : "NIEDRIG",
    identityScore: input.identityScore,
    threatLevel,
    confidence: input.confidence,
    platformCount: platforms.size,
    hitCount: input.hits.length,
    uniqueUsername,
    problematicCount: problematic.length,
    topCategories: categories.slice(0, 5),
  };
}

export function buildActionPlan(
  hits: UsernameHit[],
  overview: UsernameManagementOverview
): UsernameActionItem[] {
  const actions: UsernameActionItem[] = [];

  if (overview.problematicCount > 0) {
    const sample = hits.find((h) => h.isProblematic);
    actions.push({
      priority: "SOFORT",
      title: "Problematische Plattform-Präsenz prüfen",
      why: `Es wurden ${overview.problematicCount} Treffer mit sensiblen Kategorien erkannt.`,
      riskReduced: "Reputations- und Erpressungspotenzial",
      how: "Konten prüfen, Inhalte entfernen oder Profile privat schalten; ggf. Betreiber kontaktieren.",
      effort: "30–90 Min.",
      difficulty: "mittel",
      benefit: "Sichtbare Risikoflächen werden reduziert.",
      relatedPlatform: sample?.platform ?? null,
    });
  }

  if (overview.platformCount >= 3) {
    actions.push({
      priority: "HOCH",
      title: "Benutzername-Wiederverwendung reduzieren",
      why: "Derselbe Username erscheint auf mehreren Plattformen und erleichtert Identitätsverknüpfung.",
      riskReduced: "Cross-Platform Tracking",
      how: "Neue Handles wählen, alte Profile bereinigen oder auf Privat stellen.",
      effort: "1–2 Std.",
      difficulty: "mittel",
      benefit: "Verknüpfbarkeit sinkt deutlich.",
      relatedPlatform: null,
    });
  }

  const social = hits.filter((h) =>
    ["Social", "Communities", "Foren"].includes(h.category)
  );
  if (social.length > 0) {
    actions.push({
      priority: "MITTEL",
      title: "Öffentliche Profilinformationen minimieren",
      why: "In Foren und Social-Profilen sind zusätzliche Identitätsmerkmale sichtbar.",
      riskReduced: "Social Engineering",
      how: "Profilfelder (Wohnort, Firma, E-Mail) entfernen und Sichtbarkeit einschränken.",
      effort: "20–45 Min.",
      difficulty: "leicht",
      benefit: "Weniger Ableitbarkeit der Person hinter dem Username.",
      relatedPlatform: social[0]?.platform ?? null,
    });
  }

  actions.push({
    priority: "OPTIONAL",
    title: "Monitoring für Username-Treffer einrichten",
    why: "Neue öffentliche Indexierungen können jederzeit entstehen.",
    riskReduced: "Früherkennung neuer Exposition",
    how: "Periodisch Username Intelligence Scan wiederholen und Alerts prüfen.",
    effort: "10 Min. / Monat",
    difficulty: "leicht",
    benefit: "Kontinuierliche Kontrolle der digitalen Identität.",
    relatedPlatform: null,
  });

  if (overview.hitCount === 0) {
    return [
      {
        priority: "OPTIONAL",
        title: "Alias-Angaben im Profil ergänzen",
        why: "Ohne belastbare Treffer bleibt die Lage unklar — mehr Alias-Signale verbessern künftige Scans.",
        riskReduced: "Blind spots",
        how: "Weitere Benutzernamen/Gaming-Namen im Identitätsprofil hinterlegen und Scan wiederholen.",
        effort: "5 Min.",
        difficulty: "leicht",
        benefit: "Höhere Trefferqualität beim nächsten Lauf.",
        relatedPlatform: null,
      },
    ];
  }

  return actions;
}

export function computeRiskScore(hits: UsernameHit[]): number {
  if (hits.length === 0) return 8;
  let score = Math.min(40, hits.length * 4);
  score += hits.filter((h) => h.isProblematic).length * 18;
  score += hits.filter((h) => h.riskLevel === "high").length * 10;
  score += hits.filter((h) => h.riskLevel === "medium").length * 5;
  const avgConf =
    hits.reduce((sum, h) => sum + h.confidence, 0) / Math.max(1, hits.length);
  if (avgConf >= 90) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeIdentityScore(hits: UsernameHit[]): number {
  if (hits.length === 0) return 0;
  const avg = hits.reduce((sum, h) => sum + h.identityScore, 0) / hits.length;
  const platformBonus = Math.min(
    20,
    new Set(hits.map((h) => h.platform)).size * 4
  );
  return Math.max(0, Math.min(100, Math.round(avg * 0.75 + platformBonus)));
}
