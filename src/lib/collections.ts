/**
 * src/lib/collections.ts — 集合查询与发布过滤的唯一入口（A2 拥有，见 AGENTS.md §3）
 *
 * 规则（ARCHITECTURE §4，硬约束）：
 *   1. 页面、content.json、搜索索引都只能通过本文件取数，**不得在组件里各自过滤**。
 *   2. 过滤判定只来自 `src/content/schema.ts` 的 `isVisibleEntry`（纯函数，可单测）。
 *      - `published` 默认 false → 缺字段即不发布
 *      - `published_by` 必须是人工标识
 *      - journal 额外要求 `review_status: approved`
 *   3. `sample: true` 的条目照常返回，但调用方必须渲染「示例」徽章（C-13）。
 *
 * 本文件是 A3（页面）与 A4（content.json）的交接面（TASKS §7 H1）。
 */
import { getCollection, type CollectionEntry } from 'astro:content';

import { isVisibleEntry, pathForEntry } from '../content/schema';

export type ContentEntry = CollectionEntry<'profile' | 'knowledge' | 'projects' | 'journal' | 'errors'>;

/** C-13 `ContentCard.item` 的形状（A4 生成 content.json 时沿用同一形状，见 C-10） */
export interface ListItem {
  id: string;
  type: 'profile' | 'knowledge' | 'project' | 'journal' | 'error';
  title: string;
  summary: string;
  path: string;
  tags: string[];
  updated: string;
  sample: boolean;
  /** knowledge 专属（C-10 示例包含这两项） */
  domain?: string;
  status?: string;
}

const byUpdatedDesc = (a: ContentEntry, b: ContentEntry) =>
  String(b.data.updated).localeCompare(String(a.data.updated));

const byDateDesc = (a: CollectionEntry<'journal'>, b: CollectionEntry<'journal'>) =>
  String(b.data.date).localeCompare(String(a.data.date));

/** 取某个集合中"可上站"的条目（唯一过滤点） */
async function visibleOf<K extends 'profile' | 'knowledge' | 'projects' | 'journal' | 'errors'>(
  name: K,
): Promise<CollectionEntry<K>[]> {
  const all = (await getCollection(name)) as CollectionEntry<K>[];
  return all.filter((entry) => isVisibleEntry(entry as never));
}

/** C-10 / C-13 的列表项；调用方不要再自己拼 path */
export function toListItem(entry: ContentEntry): ListItem {
  const data = entry.data as Record<string, unknown>;
  const type = data.type as ListItem['type'];
  const item: ListItem = {
    id: String(data.id),
    type,
    title: String(data.title),
    summary: String(data.summary),
    path: pathForEntry(type, String(data.id)),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    updated: String(data.updated),
    sample: data.sample === true,
  };
  if (type === 'knowledge') {
    item.domain = String(data.domain);
    item.status = String(data.status);
  }
  return item;
}

/* ------------------------------ knowledge ------------------------------ */

export async function getAllKnowledge(): Promise<CollectionEntry<'knowledge'>[]> {
  return (await visibleOf('knowledge')).sort(byUpdatedDesc);
}

export async function getKnowledgeById(id: string): Promise<CollectionEntry<'knowledge'> | null> {
  const target = id.toLowerCase();
  return (await getAllKnowledge()).find((e) => e.data.id.toLowerCase() === target) ?? null;
}

/* ------------------------------- projects ------------------------------ */

export async function getAllProjects(): Promise<CollectionEntry<'projects'>[]> {
  return (await visibleOf('projects')).sort(byUpdatedDesc);
}

export async function getProjectById(id: string): Promise<CollectionEntry<'projects'> | null> {
  const target = id.toLowerCase();
  return (await getAllProjects()).find((e) => e.data.id.toLowerCase() === target) ?? null;
}

/* -------------------------------- journal ------------------------------ */

export async function getAllJournal(): Promise<CollectionEntry<'journal'>[]> {
  return (await visibleOf('journal')).sort(byDateDesc);
}

/** 路由参数是 `YYYY-MM-DD`（C-9 第 8 行），不是 `DJ-...` */
export async function getJournalByDate(date: string): Promise<CollectionEntry<'journal'> | null> {
  return (await getAllJournal()).find((e) => String(e.data.date) === date) ?? null;
}

/* -------------------------------- errors ------------------------------- */

export async function getAllErrors(): Promise<CollectionEntry<'errors'>[]> {
  return (await visibleOf('errors')).sort(byUpdatedDesc);
}

export async function getErrorById(id: string): Promise<CollectionEntry<'errors'> | null> {
  const target = id.toLowerCase();
  return (await getAllErrors()).find((e) => e.data.id.toLowerCase() === target) ?? null;
}

/* -------------------------------- profile ------------------------------ */

/** C-1：profile 唯一；未发布时返回 null，页面需自行处理"未发布"空态 */
export async function getProfile(): Promise<CollectionEntry<'profile'> | null> {
  const list = await visibleOf('profile');
  return list[0] ?? null;
}

/* ------------------------------ 交接面汇总 ---------------------------- */

/**
 * 一次性拿到全部可上站条目，用于首页聚合与 content.json（C-10）。
 * counts 的键与 C-10 一致：knowledge / projects / journal / errors / profile
 */
export async function getAllVisible(): Promise<{
  profile: ListItem | null;
  knowledge: ListItem[];
  projects: ListItem[];
  journal: ListItem[];
  errors: ListItem[];
  counts: { knowledge: number; projects: number; journal: number; errors: number; profile: number };
}> {
  const [profile, knowledge, projects, journal, errors] = await Promise.all([
    getProfile(),
    getAllKnowledge(),
    getAllProjects(),
    getAllJournal(),
    getAllErrors(),
  ]);

  return {
    profile: profile ? toListItem(profile as ContentEntry) : null,
    knowledge: knowledge.map((e) => toListItem(e as ContentEntry)),
    projects: projects.map((e) => toListItem(e as ContentEntry)),
    journal: journal.map((e) => toListItem(e as ContentEntry)),
    errors: errors.map((e) => toListItem(e as ContentEntry)),
    counts: {
      knowledge: knowledge.length,
      projects: projects.length,
      journal: journal.length,
      errors: errors.length,
      profile: profile ? 1 : 0,
    },
  };
}
