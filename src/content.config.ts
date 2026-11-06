/**
 * src/content.config.ts — 五个 content collections 的注册（A2 拥有，见 AGENTS.md §3）
 *
 * 唯一职责：把 `content/` 下的五个目录接上 `src/content/schema.ts` 的 zod schema。
 * 构建期（astro build）会再兜一次底：结构不合规 → 构建失败。
 * 页面不在这里做过滤，过滤统一在 `src/lib/collections.ts`（ARCHITECTURE §4）。
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

import { SCHEMA_BY_TYPE } from './content/schema';

const profile = defineCollection({
  // C-1：profile 固定为 content/profile/profile.md（唯一）
  loader: glob({ pattern: 'profile.md', base: './content/profile' }),
  schema: SCHEMA_BY_TYPE.profile,
});

const knowledge = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/knowledge' }),
  schema: SCHEMA_BY_TYPE.knowledge,
});

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/projects' }),
  schema: SCHEMA_BY_TYPE.project,
});

const journal = defineCollection({
  // C-1：content/journal/<YYYY>/
  loader: glob({ pattern: '**/*.md', base: './content/journal' }),
  schema: SCHEMA_BY_TYPE.journal,
});

const errors = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/errors' }),
  schema: SCHEMA_BY_TYPE.error,
});

export const collections = { profile, knowledge, projects, journal, errors };
