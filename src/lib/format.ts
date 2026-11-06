/**
 * src/lib/format.ts — 路径与文本格式化（A3 拥有）
 *
 * 规则：站内链接一律经 `href()` 拼接 BASE_URL，禁止硬编码 "/"。
 * 原因：GitHub Pages 部署在子路径 /141/，硬编码根路径会 404（ARCHITECTURE §2.3）。
 */

/** BASE_URL 归一化为带尾斜杠的形式（Astro 的 BASE_URL 为 "/141"，无尾斜杠） */
export function baseUrl(): string {
  const raw = import.meta.env.BASE_URL || '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/** 站内绝对路径：href('/knowledge/') → '/141/knowledge/' */
export function href(path: string): string {
  const clean = String(path || '/').replace(/^\/+/, '');
  return `${baseUrl()}${clean}`;
}

/** 列表项自身带的是不含 base 的路径（C-10 path），这里统一加前缀 */
export function entryHref(path: string): string {
  return href(path);
}

/** YYYY-MM-DD → 2026-11-06（保持稳定，不做本地化以免时区漂移） */
export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/** 列表用的紧凑日期：2026-11-06 → 11-06（跨年场景仍显示年） */
export function formatDateCompact(value: string | Date | undefined | null, now = new Date()): string {
  const iso = formatDate(value);
  if (!iso) return '';
  const sameYear = iso.slice(0, 4) === String(now.getFullYear());
  return sameYear ? iso.slice(5) : iso;
}

/** 纯文本截断（用于列表摘要，避免长文本撑破卡片） */
export function truncate(text: string, max = 120): string {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}
