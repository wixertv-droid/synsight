import { z } from "zod";

export const searchProviderIds = [
  "serpapi",
  "dataforseo",
  "bing",
  "custom",
] as const;

export const searchProviderSaveSchema = z.object({
  provider: z.enum(searchProviderIds).default("serpapi"),
  apiKey: z.string().trim().min(8).max(4096),
  enabled: z.boolean().optional().default(true),
});

export const searchProviderTestSchema = z.object({
  provider: z.enum(searchProviderIds).default("serpapi"),
  apiKey: z.string().trim().min(8).max(4096).optional().nullable(),
});
