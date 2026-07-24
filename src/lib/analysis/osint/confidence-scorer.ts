/**
 * Confidence scorer — re-exports Score-Engine (harte OSINT-Regeln).
 */
export {
  scoreIdentityConfidence,
  buildSignalsFromIdentity,
  exactAliasMatch,
  findForeignMajorCities,
  MAJOR_DE_CITIES,
  type IdentitySignals,
  type ConfidenceBreakdown,
  type ConfidenceCheck,
} from "@/lib/analysis/osint/score-engine";
