import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      author: z.string(),
      description: z.string().optional(),
      image: image(),
      imageAlt: z.string(),
      socialImage: image().optional(),
    }),
});

export const collections = { blog };
