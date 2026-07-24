/**
 * Score-Engine facade — Identity confidence scoring for OSINT hits.
 */
export {
  scoreIdentityConfidence,
  buildSignalsFromIdentity,
  type IdentitySignals,
  type ConfidenceBreakdown,
  type ConfidenceCheck,
} from "@/lib/analysis/osint/confidence-scorer";
