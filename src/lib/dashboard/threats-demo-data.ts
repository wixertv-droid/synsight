/**
 * Threat level labels shared by ThreatsCenter.
 * Demo catalogue removed — threats come from real analysis reports.
 */
export {
  threatLevelMeta,
  type PlatformThreat,
} from "@/lib/dashboard/build-threats-from-reports";

/** @deprecated Use PlatformThreat — kept for any transitional imports. */
export type { PlatformThreat as DemoThreat } from "@/lib/dashboard/build-threats-from-reports";
