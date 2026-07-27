/**
 * Heuristische Qualitäts-/Relevanzbewertung vor InsightFace.
 * Domain-Reputation + Titel/URL/Dateiname + Bildtyp-Hinweise.
 */

export type ImageKindHeuristic =
  | "portrait"
  | "selfie"
  | "person"
  | "group"
  | "avatar"
  | "logo"
  | "product"
  | "screenshot"
  | "meme"
  | "text"
  | "graphic"
  | "icon"
  | "drawing"
  | "unknown";

export type CandidateRiskBand = "private" | "public" | "identity" | "critical";

export interface CandidateScoreInput {
  title: string;
  imageUrl: string;
  sourceUrl: string | null;
  sourceHost: string;
  query: string;
  queryGroup?: "name" | "alias" | "username";
  snippet?: string | null;
}

export interface CandidateScoreResult {
  /** 0–100 Relevanz für Personen-OSINT */
  score: number;
  imageKind: ImageKindHeuristic;
  domainScore: number;
  reasons: string[];
  /** InsightFace nur bei ausreichend Score + Personenbild */
  allowFaceCompare: boolean;
  riskBand: CandidateRiskBand;
}

/** Domain-Reputation (höher = wertvoller für Identitäts-OSINT). */
const DOMAIN_REPUTATION: Array<{ test: RegExp; score: number; label: string }> =
  [
    { test: /(^|\.)instagram\.com$/i, score: 100, label: "Instagram" },
    {
      test: /(^|\.)facebook\.com$|(^|\.)fb\.com$/i,
      score: 98,
      label: "Facebook",
    },
    { test: /(^|\.)tiktok\.com$/i, score: 95, label: "TikTok" },
    { test: /(^|\.)x\.com$|(^|\.)twitter\.com$/i, score: 92, label: "X" },
    { test: /(^|\.)linkedin\.com$/i, score: 92, label: "LinkedIn" },
    {
      test: /(^|\.)tinder\.com$|(^|\.)bumble\.com$|(^|\.)badoo\.com$|(^|\.)lovoo\.com$|(^|\.)onlyfans\.com$|(^|\.)joyclub\./i,
      score: 90,
      label: "Dating / Adult",
    },
    {
      test: /(forum|board|community|phpbb|discourse)/i,
      score: 88,
      label: "Forum",
    },
    {
      test: /(^|\.)discord\.com$|(^|\.)discordapp\.com$/i,
      score: 85,
      label: "Discord",
    },
    {
      test: /(^|\.)github\.com$|(^|\.)gitlab\.com$/i,
      score: 82,
      label: "GitHub",
    },
    { test: /(^|\.)reddit\.com$/i, score: 82, label: "Reddit" },
    {
      test: /(^|\.)pinterest\./i,
      score: 72,
      label: "Pinterest",
    },
    {
      test: /(blog|wordpress|medium\.com|blogspot)/i,
      score: 70,
      label: "Blog",
    },
    {
      test: /(news|spiegel|zeit|bild\.de|faz\.|sueddeutsche)/i,
      score: 65,
      label: "News",
    },
    {
      test: /(shop|store|magento|shopify|ebay\.|etsy\.)/i,
      score: 20,
      label: "Shop",
    },
    { test: /(^|\.)amazon\./i, score: 10, label: "Amazon" },
  ];

const PRODUCT_RE =
  /schraube|lager|motor|ersatzteil|kugellager|brushless|produkt|product|sku|ebay|amazon|preis|€|eur\b|shop/i;
const LOGO_RE = /\blogo\b|wordmark|favicon|icon[_-]?pack|sprite/i;
const MEME_RE = /\bmeme\b|reaction|gif|comic|cartoon/i;
const SCREEN_RE = /screenshot|bildschirm|capture|snipping/i;
const AVATAR_RE = /avatar|profilbild|profile.?pic|dp\b|userpic/i;
const PERSON_RE =
  /selfie|portrait|gesicht|face|person|people|frau|mann|girl|boy|woman|man|foto von|photo of/i;
const GROUP_RE = /gruppe|group|team|familie|family|friends/i;

export const CANDIDATE_COMPARE_MIN_SCORE = Number.parseInt(
  process.env.REVERSE_IMAGE_COMPARE_MIN_SCORE ?? "40",
  10
);

export function resolveDomainReputation(host: string): {
  score: number;
  label: string;
} {
  const cleaned = host.replace(/^www\./i, "").toLowerCase();
  for (const entry of DOMAIN_REPUTATION) {
    if (entry.test.test(cleaned)) {
      return { score: entry.score, label: entry.label };
    }
  }
  return { score: 50, label: "Sonstige" };
}

export function detectImageKindHeuristic(
  input: CandidateScoreInput
): ImageKindHeuristic {
  const blob = [
    input.title,
    input.imageUrl,
    input.sourceUrl ?? "",
    input.snippet ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (PRODUCT_RE.test(blob)) return "product";
  if (LOGO_RE.test(blob)) return "logo";
  if (MEME_RE.test(blob)) return "meme";
  if (SCREEN_RE.test(blob)) return "screenshot";
  if (AVATAR_RE.test(blob)) return "avatar";
  if (GROUP_RE.test(blob)) return "group";
  if (/\bselfie\b/i.test(blob)) return "selfie";
  if (/\bportrait\b/i.test(blob)) return "portrait";
  if (PERSON_RE.test(blob)) return "person";
  if (/\b(icon|emoji)\b/i.test(blob)) return "icon";
  if (/\b(draw|sketch|illustration|vector)\b/i.test(blob)) return "drawing";
  if (/\b(text|quote|typography)\b/i.test(blob)) return "text";
  return "unknown";
}

function queryMentionBonus(input: CandidateScoreInput): {
  points: number;
  reason: string | null;
} {
  const q = input.query.trim().toLowerCase();
  if (q.length < 2) return { points: 0, reason: null };
  const hay =
    `${input.title} ${input.sourceUrl ?? ""} ${input.imageUrl}`.toLowerCase();
  if (hay.includes(q)) {
    return {
      points: input.queryGroup === "username" ? 22 : 14,
      reason:
        input.queryGroup === "username"
          ? "Username im Titel/URL"
          : "Suchbegriff im Titel/URL",
    };
  }
  const compact = q.replace(/[\s._-]+/g, "");
  const hayCompact = hay.replace(/[\s._-]+/g, "");
  if (compact.length >= 4 && hayCompact.includes(compact)) {
    return { points: 10, reason: "Suchbegriff ähnlich in URL/Titel" };
  }
  return { points: 0, reason: null };
}

function filenameHints(imageUrl: string): {
  points: number;
  reason: string | null;
} {
  try {
    const path = new URL(imageUrl).pathname.toLowerCase();
    if (/avatar|profile|face|portrait|selfie/.test(path)) {
      return { points: 8, reason: "Dateiname wirkt wie Personenbild" };
    }
    if (/product|sku|thumb_catalog|widget/.test(path)) {
      return { points: -20, reason: "Dateiname wirkt wie Produkt/Asset" };
    }
  } catch {
    /* ignore */
  }
  return { points: 0, reason: null };
}

const FACE_KINDS = new Set<ImageKindHeuristic>([
  "portrait",
  "selfie",
  "person",
  "group",
  "avatar",
  "unknown",
]);

export function scoreImageCandidate(
  input: CandidateScoreInput
): CandidateScoreResult {
  const reasons: string[] = [];
  const domain = resolveDomainReputation(input.sourceHost || "unknown");
  const imageKind = detectImageKindHeuristic(input);
  let score = Math.round(domain.score * 0.35);
  reasons.push(`Domain ${domain.label} (${domain.score})`);

  const mention = queryMentionBonus(input);
  if (mention.reason) {
    score += mention.points;
    reasons.push(mention.reason);
  }

  const fileHint = filenameHints(input.imageUrl);
  if (fileHint.reason) {
    score += fileHint.points;
    reasons.push(fileHint.reason);
  }

  switch (imageKind) {
    case "portrait":
    case "selfie":
      score += 18;
      reasons.push(`Bildtyp ${imageKind}`);
      break;
    case "person":
    case "avatar":
      score += 14;
      reasons.push(`Bildtyp ${imageKind}`);
      break;
    case "group":
      score += 8;
      reasons.push("Gruppenfoto");
      break;
    case "unknown":
      score += 4;
      break;
    case "product":
      score -= 40;
      reasons.push("Produktverdacht");
      break;
    case "logo":
    case "icon":
      score -= 35;
      reasons.push("Logo/Icon");
      break;
    case "meme":
    case "screenshot":
    case "graphic":
    case "drawing":
    case "text":
      score -= 25;
      reasons.push(`Wenig personenrelevant (${imageKind})`);
      break;
  }

  if (PRODUCT_RE.test(input.title)) {
    score -= 15;
    reasons.push("Produkttitel");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const minScore = Number.isFinite(CANDIDATE_COMPARE_MIN_SCORE)
    ? CANDIDATE_COMPARE_MIN_SCORE
    : 40;
  const allowFaceCompare =
    score >= minScore && FACE_KINDS.has(imageKind) && imageKind !== "logo";

  let riskBand: CandidateRiskBand = "public";
  if (
    domain.score >= 90 &&
    /dating|adult|onlyfans|joyclub|tinder/i.test(domain.label)
  ) {
    riskBand = "critical";
  } else if (mention.points >= 14 && domain.score >= 80) {
    riskBand = "identity";
  } else if (domain.score >= 85) {
    riskBand = "public";
  } else if (domain.score <= 25) {
    riskBand = "private";
  }

  return {
    score,
    imageKind,
    domainScore: domain.score,
    reasons: reasons.slice(0, 6),
    allowFaceCompare,
    riskBand,
  };
}

export function enrichCandidateWithScore<T extends CandidateScoreInput>(
  candidate: T
): T & {
  candidateScore: number;
  imageKind: ImageKindHeuristic;
  allowFaceCompare: boolean;
  scoreReasons: string[];
  riskBand: CandidateRiskBand;
} {
  const scored = scoreImageCandidate(candidate);
  return {
    ...candidate,
    candidateScore: scored.score,
    imageKind: scored.imageKind,
    allowFaceCompare: scored.allowFaceCompare,
    scoreReasons: scored.reasons,
    riskBand: scored.riskBand,
  };
}
