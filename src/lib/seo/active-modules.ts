import { getPublicPricingCatalog } from "@/lib/services/pricing-service";
import {
  DEMO_FIELD_TO_ANALYSIS_KEYS,
  filterDemoFieldsByActiveKeys,
  isToolVisibleForKeys,
  TOOL_SLUG_TO_ANALYSIS_KEYS,
  type DemoFieldKey,
} from "@/lib/seo/module-maps";
import { TOOL_LANDINGS, type ToolLanding } from "@/lib/seo/tool-landings";

export { DEMO_FIELD_TO_ANALYSIS_KEYS, TOOL_SLUG_TO_ANALYSIS_KEYS };

export async function getActiveAnalysisKeys(): Promise<Set<string>> {
  const catalog = await getPublicPricingCatalog();
  return new Set((catalog.analyses ?? []).map((row) => row.key));
}

export function isToolVisible(slug: string, activeKeys: Set<string>): boolean {
  return isToolVisibleForKeys(slug, activeKeys);
}

export async function getActiveToolLandings(): Promise<ToolLanding[]> {
  const activeKeys = await getActiveAnalysisKeys();
  return TOOL_LANDINGS.filter((tool) =>
    isToolVisibleForKeys(tool.slug, activeKeys)
  );
}

export async function getActiveDemoFields(): Promise<DemoFieldKey[]> {
  const activeKeys = await getActiveAnalysisKeys();
  return filterDemoFieldsByActiveKeys(activeKeys);
}
