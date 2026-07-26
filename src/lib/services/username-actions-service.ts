/**
 * Compatibility re-exports — prefer `@/lib/services/hit-actions-service`.
 */
export {
  clearHitAction,
  createSynSightOrder,
  filterIgnoredFromUsernameReport,
  listHitActions,
  listIgnoredFingerprints,
  listSynSightOrders,
  upsertHitAction,
  type AnalysisSourceModule,
  type HitActionKind,
  type HitActionRecord,
  type SynSightOrderRecord,
} from "@/lib/services/hit-actions-service";
