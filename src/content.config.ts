import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { domains } from "./config/domains";
import type { DomainSlug } from "./config/domains";

const domainSlugs = domains.map((d) => d.slug) as readonly [
  DomainSlug,
  ...DomainSlug[],
];

const daily = defineCollection({
  loader: glob({ base: "./src/content/daily", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string().min(1),
    domain: z.enum(domainSlugs),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD"),
    itemCount: z.number().int().nonnegative(),
    generatedAt: z.string().datetime({ offset: true }),
  }),
});

export const collections = { daily };
