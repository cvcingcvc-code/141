#!/usr/bin/env node
/**
 * scripts/build-data.mjs — content.json 生成器（A4 拥有，T4.2，见 AGENTS.md §3）
 *
 * 严格按 CONTRACTS.md C-10 产出 `dist/data/content.json`：
 *   { schemaVersion, generatedAt, base, counts, items }
 *
 * 过滤唯一锚点 = `src/content/schema.ts` 的纯函数 `isVisibleEntry`（ARCHITECTURE §4：
 * 页面 / content.json / 搜索索引都只认这一个判定，不得散落到各处自建第二套过滤）：
 *   - `published: true` 且 `published_by` 是人工标识 → 可上站（缺字段 = 不发布，P0-1）
 *   - journal 额外要求 `review_status: approved`
 *
 * 与 `src/lib/collections.ts`（Astro 运行时页面取数）的差异：
 *   两者都只调 `schema.ts` 的 `isVisibleEntry` + `pathForEntry`，因此过滤与 path 必然一致。
 *   本脚本是纯 Node（不能 import `astro:content`），故自行读 content/*.md 并复用
 *   `schema.ts` 的 `parseEntry`（zod 解析 + 默认值）来取 `data`，再交给 `isVisibleEntry`。
 *
 * 已知范围（TASKS T4.2）：
 *   - 不生成 `graph.json`（v0.2）
 *   - 只产出可见条目的元数据，不含正文全文（全文搜索由 Pagefind 索引 HTML）
 *
 * 用法：
 *   node scripts/build-data.mjs
 *   node scripts/build-data.mjs --content <dir> --out <file>   # 测试夹具用（仓库外隔离数据）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'js-yaml';

import {
  ALLOWED_CONTENT_DIRS,
  DIR_TO_TYPE,
  isVisibleEntry,
  parseEntry,
  pathForEntry,
} from '../src/content/schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CONTENT = path.join(REPO_ROOT, 'content');
const DEFAULT_OUT = path.join(REPO_ROOT, 'dist', 'data', 'content.json');

/** C-10 的 schemaVersion（契约撕裂时需同步） */
const SCHEMA_VERSION = '1.0';
/** counts / items 的稳定顺序（确定性输出，便于 diff 与测试） */
const TYPE_ORDER = ['profile', 'knowledge', 'project', 'journal', 'error'];

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

/** 读 astro.config.mjs 的 base，规范化为带尾斜杠的形式（与 Astro BASE_URL 一致） */
function readBase() {
  try {
    const cfg = fs.readFileSync(path.join(REPO_ROOT, 'astro.config.mjs'), 'utf8');
    const m = /\bbase\s*:\s*['"]([^'"]+)['"]/.exec(cfg);
    if (m) return normalizeBase(m[1]);
  } catch {
    /* 配置读不到就回退根路径，不因配置缺失阻断产物生成 */
  }
  return '/';
}

/** '/141' → '/141/'；'/' → '/'；'/141/' → '/141/' */
function normalizeBase(base) {
  let b = String(base || '/').trim();
  if (b === '' || b === '/') return '/';
  if (!b.startsWith('/')) b = `/${b}`;
  b = b.replace(/\/+$/, '');
  return `${b}/`;
}

/** 拆 frontmatter（与 validate-content.mjs 同一约定：--- 起止，先归一化 CRLF/BOM） */
function splitFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  if (lines.length === 0 || lines[0].trim() !== '---') return { error: '文件必须以 --- 开头' };
  let close = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      close = i;
      break;
    }
  }
  if (close < 0) return { error: 'frontmatter 缺少结束的 ---' };
  return { yamlText: lines.slice(1, close).join('\n'), body: lines.slice(close + 1).join('\n') };
}

function walkMarkdown(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, item.name);
    if (item.isDirectory()) walkMarkdown(abs, acc);
    else if (item.isFile() && item.name.toLowerCase().endsWith('.md')) acc.push(abs);
  }
  return acc;
}

/* ------------------------------------------------------------------ *
 * 读取 + 过滤
 * ------------------------------------------------------------------ */

/**
 * 从 content 根目录读取所有 md，解析 frontmatter 并只保留"可上站"条目。
 * @param {string} contentRoot 内容根目录绝对路径
 */
function loadVisible(contentRoot) {
  /** @type {{type:string, data:any}[]} */
  const visible = [];
  /** @type {string[]} 结构不合规被跳过的文件（不应发生：validate 是 PR 门禁，此处仅兜底告警） */
  const skipped = [];

  if (!fs.existsSync(contentRoot)) return { visible, skipped, missingRoot: true };

  const files = walkMarkdown(contentRoot).sort();
  for (const absPath of files) {
    const relToRoot = absPath.slice(contentRoot.length + 1).split(path.sep).join('/');
    const dirName = relToRoot.split('/')[0];

    // C-1：目录白名单（content/ 下不允许新增未登记目录）
    if (!ALLOWED_CONTENT_DIRS.includes(dirName)) {
      skipped.push(`${relToRoot}（目录 "${dirName}" 不在 C-1 清单）`);
      continue;
    }

    const type = DIR_TO_TYPE[dirName];
    const split = splitFrontmatter(fs.readFileSync(absPath, 'utf8'));
    if (split.error) {
      skipped.push(`${relToRoot}（${split.error}）`);
      continue;
    }

    let frontmatter;
    try {
      frontmatter = yaml.load(split.yamlText);
    } catch {
      skipped.push(`${relToRoot}（YAML 解析失败）`);
      continue;
    }
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      skipped.push(`${relToRoot}（frontmatter 非对象）`);
      continue;
    }

    const parsed = parseEntry(type, frontmatter);
    if (!parsed.ok) {
      skipped.push(`${relToRoot}（结构不合规）`);
      continue;
    }

    // 发布过滤唯一判定（ARCHITECTURE §4）：isVisibleEntry
    if (isVisibleEntry(parsed.data)) {
      visible.push({ type, data: parsed.data });
    }
  }

  return { visible, skipped, missingRoot: false };
}

/* ------------------------------------------------------------------ *
 * C-10 组装
 * ------------------------------------------------------------------ */

/** C-10 item 形状；knowledge 按 C-10 示例把 domain/status 插在 tags 与 updated 之间 */
function toItem(type, data) {
  const common = {
    id: String(data.id),
    type,
    title: String(data.title),
    summary: String(data.summary),
    path: pathForEntry(type, data.id),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    updated: String(data.updated),
    sample: data.sample === true,
  };
  if (type === 'knowledge') {
    return {
      id: common.id,
      type: common.type,
      title: common.title,
      summary: common.summary,
      path: common.path,
      tags: common.tags,
      domain: String(data.domain),
      status: String(data.status),
      updated: common.updated,
      sample: common.sample,
    };
  }
  return common;
}

function build(contentRoot) {
  const { visible, skipped, missingRoot } = loadVisible(contentRoot);

  const counts = { knowledge: 0, projects: 0, journal: 0, errors: 0, profile: 0 };
  const items = [];

  for (const { type, data } of visible) {
    const countKey = { knowledge: 'knowledge', project: 'projects', journal: 'journal', error: 'errors', profile: 'profile' }[type];
    if (countKey) counts[countKey] += 1;
    items.push(toItem(type, data));
  }

  // 确定性排序：type 固定顺序 + 同 type 内按 id
  items.sort((a, b) => {
    const ta = TYPE_ORDER.indexOf(a.type);
    const tb = TYPE_ORDER.indexOf(b.type);
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id));
  });

  // C-10：content.json 只允许这五个字段，任何新增字段都需 RFC（C-10 末尾明令）。
  // 日志/审计信息（sample 计数、跳过清单）不落盘，只在 stdout 打印。
  const content = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    base: readBase(),
    counts,
    items,
  };
  const meta = {
    missingRoot,
    skipped,
    sampleCount: visible.filter((v) => v.data.sample === true).length,
    visibleCount: visible.length,
  };
  return { content, meta };
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = { content: DEFAULT_CONTENT, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--content' && argv[i + 1]) {
      args.content = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--out' && argv[i + 1]) {
      args.out = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { content, meta } = build(args.content);

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(content, null, 2)}\n`, 'utf8');

  // 构建日志：可见条目数 + 样本条数（ARCHITECTURE §4 要求打印样本条数）
  const m = meta;
  process.stdout.write(
    `content.json → ${path.relative(REPO_ROOT, args.out)}\n` +
      `  可见 ${m.visibleCount} 条（knowledge ${content.counts.knowledge} / projects ${content.counts.projects} / journal ${content.counts.journal} / errors ${content.counts.errors} / profile ${content.counts.profile}）` +
      `，其中 sample ${m.sampleCount} 条\n`,
  );
  if (m.missingRoot) {
    process.stdout.write(`  注意：内容目录 ${args.content} 不存在，按空内容生成\n`);
  }
  for (const s of m.skipped) {
    process.stdout.write(`  跳过（非可见/结构不合规）：${s}\n`);
  }
}

main();
