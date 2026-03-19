import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    categoryLabel: z.string(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
    productLinks: z.array(z.object({
      title: z.string(),
      url: z.string(),
    })).optional(),
  }),
});

export const collections = { articles };
