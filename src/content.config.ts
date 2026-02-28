import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { domains } from "./config/domains";
import type { DomainSlug } from "./config/domains";

const domainSlugs = domains.map((d) => d.slug) as readonly [
  DomainSlug,
  ...DomainSlug[],
];

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD");
const generatedAtField = z.string().datetime({ offset: true });

const newsSchema = z.object({
  title: z.string().min(1),
  domain: z.enum(domainSlugs),
  date: dateField,
  itemCount: z.number().int().nonnegative(),
  generatedAt: generatedAtField,
});

const opportunitySchema = z.object({
  title: z.string().min(1),
  domain: z.literal("commercial-opportunity"),
  date: dateField,
  finalStatus: z.enum(["commercializable", "no_viable_proposal"]),
  retrievedCount: z.number().int().nonnegative(),
  scoredCount: z.number().int().nonnegative(),
  eliminatedCount: z.number().int().nonnegative(),
  searchDomains: z.string().optional(),
  proposalName: z.string().optional(),
  proposalScore: z.string().optional(),
  generatedAt: generatedAtField,
});

const daily = defineCollection({
  loader: glob({ base: "./src/content/daily", pattern: "**/*.md" }),
  schema: z.discriminatedUnion("domain", [newsSchema, opportunitySchema]),
});

export const collections = { daily };
