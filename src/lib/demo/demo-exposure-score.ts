/**
 * DemoScanner exposure score — derived from public landing-page scanner findings.
 * Specialist modules (Holehe, Maigret, PhoneInfoga, theHarvester, Photon)
 * get higher weights; generic SpiderFoot / OSINT fallback payloads are still
 * shown and scored so older scanner deployments do not result in an empty UI.
 */

export type DemoScoreFinding = {
  category?: string;
  title?: string;
  risk?: string;
  source?: string;
  url?: string;
};

export type DemoExposureScore = {
  score: number;
  risk: string;
  usableCount: number;
};

function riskRank(risk: string): number {
  const v = risk.toLowerCase();
  if (/high|hoch|kritisch|critical/.test(v)) return 3;
  if (/medium|mittel|erhöht/.test(v)) return 2;
  return 1;
}

function isNoise(finding: DemoScoreFinding): boolean {
  const category = (finding.category || "").toUpperCase();
  if (category === "ERROR") return true;
  if (category === "STATUS" || category === "EMPTY") return true;
  if (/gestartet|started|keine treffer/i.test(finding.title || "")) return true;
  return false;
}

function moduleWeight(source?: string): number {
  const s = (source || "").toLowerCase();
  if (s.includes("holehe")) return 9;
  if (s.includes("maigret")) return 7;
  if (s.includes("phone")) return 10;
  if (s.includes("harvest")) return 5;
  if (s.includes("photon")) return 4;
  if (s.includes("spiderfoot")) return 5;
  if (s.includes("publicosint") || s.includes("osint")) return 4;
  return 3;
}

/** Filter findings that should influence the demo exposure score. */
export function filterScoreFindings<T extends DemoScoreFinding>(
  findings: T[]
): T[] {
  return findings.filter((f) => !isNoise(f));
}

/**
 * Build 0–98 exposure score + German risk label from module findings.
 */
export function computeDemoExposureScore(
  findings: DemoScoreFinding[]
): DemoExposureScore {
  const usable = filterScoreFindings(findings);
  if (usable.length === 0) {
    return { score: 0, risk: "Niedrig", usableCount: 0 };
  }

  const high = usable.filter((f) => riskRank(String(f.risk || "")) >= 3).length;
  const medium = usable.filter(
    (f) => riskRank(String(f.risk || "")) === 2
  ).length;
  const low = usable.filter((f) => riskRank(String(f.risk || "")) <= 1).length;

  const weightBonus = usable.reduce(
    (sum, f) => sum + moduleWeight(f.source),
    0
  );
  const urlBonus = usable.filter((f) => Boolean(f.url)).length * 2;

  const score = Math.min(
    98,
    Math.round(
      10 +
        high * 16 +
        medium * 7 +
        low * 3 +
        usable.length +
        weightBonus * 0.35 +
        urlBonus
    )
  );

  let risk = "Niedrig";
  if (high >= 2 || score >= 75) risk = "Kritisch";
  else if (high >= 1 || score >= 50) risk = "Erhöht";
  else if (score >= 30) risk = "Mittel";

  return { score, risk, usableCount: usable.length };
}
