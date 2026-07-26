import type {
  UsernameActionItem,
  UsernameAmpel,
  UsernameHeatmapCell,
  UsernameHit,
  UsernameIdentityFindings,
  UsernameIdentityGraphEdge,
  UsernameIdentityGraphNode,
  UsernameManagementOverview,
  UsernamePlatformOverviewItem,
  UsernameRiskLevel,
  UsernameSecurityOverview,
  UsernameTimelineItem,
  SynSightOrderType,
} from "@/lib/analysis/username/types";

function maxRisk(
  a: UsernameRiskLevel,
  b: UsernameRiskLevel
): UsernameRiskLevel {
  const rank = { low: 0, medium: 1, high: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function riskRank(level: UsernameRiskLevel): number {
  return { high: 3, medium: 2, low: 1 }[level];
}

export function sortHitsByRisk(hits: UsernameHit[]): UsernameHit[] {
  return [...hits].sort(
    (a, b) =>
      riskRank(b.riskLevel) - riskRank(a.riskLevel) ||
      Number(b.isProblematic) - Number(a.isProblematic) ||
      b.confidence - a.confidence ||
      a.platform.localeCompare(b.platform)
  );
}

export function splitPrimaryAndWeakHits(hits: UsernameHit[]): {
  primary: UsernameHit[];
  weak: UsernameHit[];
} {
  const primary: UsernameHit[] = [];
  const weak: UsernameHit[] = [];
  for (const hit of hits) {
    if (
      hit.isWeakMatch ||
      (hit.confidence < 70 && hit.riskLevel === "low" && !hit.isProblematic)
    ) {
      weak.push(hit);
    } else {
      primary.push(hit);
    }
  }
  return {
    primary: sortHitsByRisk(primary),
    weak: sortHitsByRisk(weak),
  };
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
      ? `Keine belastbaren öffentlichen Treffer zu „${input.username}“.`
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

export function buildSecurityOverview(input: {
  hits: UsernameHit[];
  actions: UsernameActionItem[];
  overallRisk: UsernameRiskLevel;
}): UsernameSecurityOverview {
  const { primary, weak } = splitPrimaryAndWeakHits(input.hits);
  const critical = primary.filter(
    (h) => h.riskLevel === "high" || h.isProblematic
  ).length;
  const linkable = primary.filter((h) => h.confidence >= 80).length;
  const publicPlatforms = new Set(
    primary
      .filter((h) =>
        ["Social", "Foren", "Communities", "Dating", "Gaming"].includes(
          h.category
        )
      )
      .map((h) => h.platform)
  ).size;

  let ampel: UsernameAmpel = "green";
  let ampelLabel = "Geringes Risiko";
  let ampelDetail =
    "Keine kritischen öffentlichen Identitätsverknüpfungen erkannt.";
  if (critical >= 2 || input.overallRisk === "high") {
    ampel = "red";
    ampelLabel = "Kritisches Risiko";
    ampelDetail =
      "Mehrere kritische oder problematische Treffer erfordern Maßnahmen.";
  } else if (critical === 1 || input.overallRisk === "medium") {
    ampel = "orange";
    ampelLabel = "Erhöhtes Risiko";
    ampelDetail =
      "Verknüpfbare Profile und sensible Kategorien wurden gefunden.";
  } else if (primary.length >= 3) {
    ampel = "yellow";
    ampelLabel = "Auffällige Exposition";
    ampelDetail =
      "Mehrere öffentliche Profile — Beobachtung und Bereinigung sinnvoll.";
  }

  return {
    ampel,
    ampelLabel,
    ampelDetail,
    foundProfiles: primary.length,
    linkableIdentities: linkable,
    publicPlatforms,
    criticalHits: critical,
    possibleFalsePositives: weak.length,
    recommendedActions: input.actions.length,
  };
}

export function buildIdentityFindings(
  hits: UsernameHit[]
): UsernameIdentityFindings {
  const text = hits
    .map((h) => `${h.title} ${h.snippet} ${h.visibleInfo.join(" ")}`)
    .join(" ")
    .toLowerCase();

  const matched = (re: RegExp) => re.test(text);
  const countCat = (...cats: string[]) =>
    hits.filter((h) => cats.includes(h.category)).length;

  const interests = new Set<string>();
  for (const hit of hits) {
    if (/auto|bmw|audi|motor|fahrzeug/i.test(`${hit.title} ${hit.snippet}`))
      interests.add("Autos");
    if (
      /game|gaming|steam|xbox|playstation|sim/i.test(
        `${hit.title} ${hit.snippet}`
      )
    )
      interests.add("Gaming");
    if (/flug|flight|simulat/i.test(`${hit.title} ${hit.snippet}`))
      interests.add("Flugsimulation");
    if (/musik|music|spotify|soundcloud/i.test(`${hit.title} ${hit.snippet}`))
      interests.add("Musik");
    if (/code|github|dev|programmier/i.test(`${hit.title} ${hit.snippet}`))
      interests.add("Entwicklung");
    if (/forum|community/i.test(hit.category)) interests.add("Foren");
  }

  return {
    nameFound:
      matched(/\b(name|vorname|nachname)\b/) ||
      hits.some((h) =>
        (h.matchChecks ?? []).some(
          (c) =>
            c.matched &&
            (c.label.includes("Vorname") || c.label.includes("Nachname"))
        )
      ),
    locationFound:
      matched(/\b(berlin|hamburg|münchen|köln|wohnort|stadt)\b/) ||
      hits.some((h) =>
        (h.matchChecks ?? []).some(
          (c) => c.matched && c.label.includes("Wohnort")
        )
      ),
    emailFound:
      matched(/@/) ||
      hits.some((h) =>
        (h.matchChecks ?? []).some(
          (c) => c.matched && c.label.includes("E-Mail")
        )
      ),
    phoneFound: matched(/\+?\d[\d\s/-]{6,}\d/),
    datingFound:
      countCat("Dating") > 0 ||
      hits.some((h) => /dating|singletreff|tinder|lovoo/i.test(h.platform)),
    gamingCount: countCat("Gaming"),
    forumCount: countCat("Foren", "Communities"),
    socialCount: countCat("Social"),
    developerCount: countCat("Developer", "Code"),
    publicComments: hits.filter((h) =>
      /kommentar|comment|antwort|reply/i.test(`${h.title} ${h.snippet}`)
    ).length,
    interests: [...interests].slice(0, 10),
  };
}

function orderTypeForHit(hit: UsernameHit): SynSightOrderType | null {
  const cat = hit.category.toLowerCase();
  const platform = hit.platform.toLowerCase();
  if (/dating|forum|social|community|gaming/.test(cat)) return "profile_delete";
  if (/google|bing|suche/.test(platform)) return "google_removal";
  if (/forum|community/.test(cat)) return "forum_contact";
  if (hit.isProblematic) return "gdpr";
  if (hit.confidence >= 80) return "privacy_request";
  return "cache_removal";
}

function selfGuideFor(title: string, platform: string | null): string[] {
  const p = platform ?? "der Plattform";
  if (/löschen|profil/i.test(title)) {
    return [
      `Auf ${p} einloggen.`,
      "Profil löschen oder vollständig anonymisieren.",
      "Sichtbarkeit und öffentliche Beiträge prüfen.",
      "Danach den Username Intelligence Scan erneut starten.",
    ];
  }
  if (/google|löschanfrage|cache/i.test(title)) {
    return [
      "Direkten Profil-Link bereithalten.",
      "Über das Entfernungsformular der Suchmaschine eine Löschanfrage stellen.",
      "Alternativ: Inhaltsentfernung beim Seitenbetreiber anfordern.",
      "Scan nach einigen Tagen wiederholen.",
    ];
  }
  return [
    `Kontext auf ${p} öffnen und eigenen Account prüfen.`,
    "Persönliche Angaben entfernen oder Profil privat schalten.",
    "Öffentliche Kommentare und Bilder kontrollieren.",
    "Scan erneut ausführen, um den Fortschritt zu prüfen.",
  ];
}

function ampelFromRisk(level: UsernameRiskLevel): UsernameAmpel {
  if (level === "high") return "red";
  if (level === "medium") return "orange";
  return "yellow";
}

export function buildActionPlan(
  hits: UsernameHit[],
  overview: UsernameManagementOverview
): UsernameActionItem[] {
  const { primary } = splitPrimaryAndWeakHits(hits);
  const actions: UsernameActionItem[] = [];
  const seenPlatforms = new Set<string>();

  for (const hit of sortHitsByRisk(primary).slice(0, 8)) {
    if (seenPlatforms.has(hit.platform) && !hit.isProblematic) continue;
    seenPlatforms.add(hit.platform);

    const orderType = orderTypeForHit(hit);
    const title =
      hit.isProblematic || hit.riskLevel === "high"
        ? `Profil löschen · ${hit.platform}`
        : `Präsenz prüfen · ${hit.platform}`;

    actions.push({
      priority:
        hit.riskLevel === "high" || hit.isProblematic
          ? "SOFORT"
          : hit.riskLevel === "medium"
            ? "HOCH"
            : "MITTEL",
      title,
      why: `Treffer auf ${hit.platform} (${hit.category}) mit ${hit.confidence}% Confidence.`,
      riskReduced:
        hit.riskLevel === "high"
          ? "Hohes Reputations- und Verknüpfungsrisiko"
          : "Öffentliche Identitätsverknüpfung",
      how: "Profil löschen, anonymisieren oder Sichtbarkeit stark einschränken.",
      selfGuide: selfGuideFor(title, hit.platform),
      effort: hit.riskLevel === "high" ? "15 Minuten" : "20–40 Minuten",
      effortMinutes: hit.riskLevel === "high" ? 15 : 30,
      difficulty: "mittel",
      benefit: hit.riskLevel === "high" ? "Sehr hoch" : "Hoch",
      relatedPlatform: hit.platform,
      relatedHitId: hit.id,
      relatedUrl: hit.profileUrl,
      ampel: ampelFromRisk(hit.riskLevel),
      orderType,
    });
  }

  if (overview.platformCount >= 3) {
    actions.push({
      priority: "HOCH",
      title: "Benutzername-Wiederverwendung reduzieren",
      why: "Derselbe Username erscheint auf mehreren Plattformen.",
      riskReduced: "Cross-Platform Tracking",
      how: "Neue Handles wählen und alte Profile bereinigen.",
      selfGuide: [
        "Liste aller betroffenen Plattformen erstellen.",
        "Pro Plattform Handle ändern oder Konto schließen.",
        "Alte öffentlichen Beiträge prüfen.",
        "Scan erneut starten.",
      ],
      effort: "1–2 Std.",
      effortMinutes: 90,
      difficulty: "mittel",
      benefit: "Hoch",
      relatedPlatform: null,
      relatedHitId: null,
      relatedUrl: null,
      ampel: "orange",
      orderType: null, // local / account hygiene — SynSight cannot do this
    });
  }

  if (overview.hitCount === 0) {
    return [
      {
        priority: "OPTIONAL",
        title: "Alias-Angaben im Profil ergänzen",
        why: "Ohne belastbare Treffer bleibt die Lage unklar.",
        riskReduced: "Blind spots",
        how: "Weitere Benutzernamen im Identitätsprofil hinterlegen und Scan wiederholen.",
        selfGuide: [
          "Identitätsprofil öffnen.",
          "Alle bekannten Benutzernamen und Gamertags eintragen.",
          "Speichern und Username Intelligence erneut starten.",
        ],
        effort: "5 Min.",
        effortMinutes: 5,
        difficulty: "leicht",
        benefit: "Mittel",
        relatedPlatform: null,
        relatedHitId: null,
        relatedUrl: null,
        ampel: "green",
        orderType: null,
      },
    ];
  }

  return actions.slice(0, 10);
}

export function computeRiskScore(hits: UsernameHit[]): number {
  const { primary } = splitPrimaryAndWeakHits(hits);
  if (primary.length === 0) return hits.length === 0 ? 8 : 18;
  let score = Math.min(40, primary.length * 4);
  score += primary.filter((h) => h.isProblematic).length * 18;
  score += primary.filter((h) => h.riskLevel === "high").length * 10;
  score += primary.filter((h) => h.riskLevel === "medium").length * 5;
  const avgConf =
    primary.reduce((sum, h) => sum + h.confidence, 0) /
    Math.max(1, primary.length);
  if (avgConf >= 90) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeIdentityScore(hits: UsernameHit[]): number {
  const { primary } = splitPrimaryAndWeakHits(hits);
  const use = primary.length > 0 ? primary : hits;
  if (use.length === 0) return 0;
  const avg = use.reduce((sum, h) => sum + h.identityScore, 0) / use.length;
  const platformBonus = Math.min(
    20,
    new Set(use.map((h) => h.platform)).size * 4
  );
  return Math.max(0, Math.min(100, Math.round(avg * 0.75 + platformBonus)));
}
