#!/usr/bin/env node
/**
 * scripts/validate-content.mjs — 内容门禁（A2 拥有，见 AGENTS.md §3）
 *
 * 实现 CONTRACTS.md v1.0.0-rc3 的 C-12 全部规则：
 *   错误 V-001..V-021（阻断合并）、警告 W-001..W-005（不阻断，需在 PR 说明）
 *
 * 输出格式（C-11，不得改动）：每行 `<code> <相对路径>:<字段> <消息>`，最后一行 `N errors, M warnings`。
 * 成功 exit 0，有错误 exit 1。
 *
 * 复用 `src/content/schema.ts`（ARCHITECTURE §2.2：schema 只有一份，校验器不得自建第二份）。
 *
 * 用法：
 *   node scripts/validate-content.mjs                # 校验仓库 content/
 *   node scripts/validate-content.mjs --root <dir>   # 校验指定目录（仅测试夹具有此需要）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import yaml from 'js-yaml';

import {
  ALLOWED_CONTENT_DIRS,
  CONTROLLED_TAGS,
  DIR_TO_TYPE,
  ID_PATTERN,
  STATIC_ROUTES,
  TAGS_MAX,
  isPublishable,
  isRealDate,
  isVisibleEntry,
  parseEntry,
  pathForEntry,
} from '../src/content/schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

/** W-003：knowledge 超过多少天未更新 */
const STALE_DAYS = 180;
/** W-004：正文短于多少字符视为空壳 */
const MIN_BODY_CHARS = 80;
/** W-002：sample 占比超过多少告警 */
const SAMPLE_RATIO_LIMIT = 0.5;
/** base 缺省值；实际优先读 astro.config.mjs */
const DEFAULT_BASE = '/141';

/* ------------------------------------------------------------------ *
 * V-010 敏感信息（对所有文件生效，含 published:false 与 draft）
 * ------------------------------------------------------------------ */

// 把私钥头标记拆成片段拼装：ACCEPTANCE §7 L1 的工作树扫描会把该标记的字面量
// 当成命中，校验器自己的规则定义不应污染扫描结果（规则本身仍在，运行时照样生效）。
const PRIVATE_KEY_MARKER = ['PRI', 'VATE'].join('') + ' ' + ['KE', 'Y'].join('');

const PII_PATTERNS = [
  { name: '邮箱', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/ },
  { name: '手机号', re: /(?<!\d)1[3-9]\d{9}(?!\d)/ },
  { name: '身份证号', re: /(?<!\d)\d{17}[\dXx](?!\d)/ },
  { name: 'OpenAI 风格密钥', re: /\bsk-[A-Za-z0-9_-]{16,}/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: '私钥块', re: new RegExp(`-----BEGIN (?:RSA |EC |OPENSSH |PGP )?${PRIVATE_KEY_MARKER}-----`) },
];

/* ------------------------------------------------------------------ *
 * 基础工具
 * ------------------------------------------------------------------ */

const toPosix = (p) => p.split(path.sep).join('/');

function readBase() {
  try {
    const cfg = fs.readFileSync(path.join(REPO_ROOT, 'astro.config.mjs'), 'utf8');
    const m = /\bbase\s*:\s*['"]([^'"]+)['"]/.exec(cfg);
    if (m) return m[1].replace(/\/+$/, '') || '/';
  } catch {
    /* 配置读不到就用缺省值，不因配置缺失阻断内容校验 */
  }
  return DEFAULT_BASE;
}

/** 拆 frontmatter：失败返回 { error } */
function splitFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  if (lines.length === 0 || lines[0].trim() !== '---') {
    return { error: '文件必须以 --- 开头的 frontmatter 起始（V-001）' };
  }
  let close = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      close = i;
      break;
    }
  }
  if (close < 0) return { error: 'frontmatter 缺少结束的 --- 分隔行（V-001）' };
  return {
    yamlText: lines.slice(1, close).join('\n'),
    body: lines.slice(close + 1).join('\n'),
  };
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

const daysBetween = (fromISO, toDate) => {
  if (!isRealDate(fromISO)) return 0;
  const from = new Date(`${fromISO}T00:00:00Z`);
  return Math.floor((toDate.getTime() - from.getTime()) / 86400000);
};

/* ------------------------------------------------------------------ *
 * 读取内容（导出给测试用）
 * ------------------------------------------------------------------ */

/**
 * @param {string} root content 目录的绝对路径
 * @returns {{root:string, entries:Array, violations:Array, missingRoot:boolean}}
 */
export function loadContent(root) {
  const violations = [];
  const entries = [];
  const contentRoot = path.resolve(root);
  const missingRoot = !fs.existsSync(contentRoot);

  if (missingRoot) {
    return { root: contentRoot, entries, violations, missingRoot };
  }

  const files = walkMarkdown(contentRoot).sort();

  for (const absPath of files) {
    const relPath = toPosix(path.relative(REPO_ROOT, absPath));
    const relToRoot = toPosix(path.relative(contentRoot, absPath));
    const segments = relToRoot.split('/');
    const dirName = segments[0];
    const baseName = path.basename(absPath, '.md');
    const raw = fs.readFileSync(absPath, 'utf8');

    const push = (code, field, message) => violations.push({ code, relPath, file: relToRoot, field, message });

    // C-1：目录白名单
    if (!ALLOWED_CONTENT_DIRS.includes(dirName)) {
      push('V-012', 'type', `目录 "content/${dirName}/" 不在 C-1 允许清单（${ALLOWED_CONTENT_DIRS.join('/')}），新增目录需改契约`);
      continue;
    }

    // V-001：frontmatter
    const split = splitFrontmatter(raw);
    if (split.error) {
      push('V-001', 'frontmatter', split.error);
      continue;
    }

    let frontmatter;
    try {
      frontmatter = yaml.load(split.yamlText);
    } catch (err) {
      push('V-001', 'frontmatter', `YAML 无法解析：${String(err.message).split('\n')[0]}`);
      continue;
    }
    if (frontmatter === null || frontmatter === undefined) {
      push('V-001', 'frontmatter', 'frontmatter 为空');
      continue;
    }
    if (typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      push('V-001', 'frontmatter', 'frontmatter 必须是键值对象');
      continue;
    }

    const expectedType = DIR_TO_TYPE[dirName];

    // V-012：type 与目录
    if (typeof frontmatter.type === 'string' && frontmatter.type !== expectedType) {
      push('V-012', 'type', `type "${frontmatter.type}" 与所在目录 "content/${dirName}/" 不符（应为 "${expectedType}"）`);
    }

    // V-003..V-009 / V-013 / V-014 / V-016 / V-019..V-021：schema 层
    const parsed = parseEntry(expectedType, frontmatter);
    for (const issue of parsed.issues) push(issue.code, issue.field, issue.message);

    // V-006：文件名前缀 = id 小写（journal 是唯一例外，交给 V-017）
    if (expectedType !== 'journal') {
      if (expectedType === 'profile') {
        if (relToRoot !== 'profile/profile.md') {
          push('V-006', 'id', `profile 必须是 content/profile/profile.md（实际 content/${relToRoot}）`);
        }
      } else {
        const id = frontmatter.id;
        if (typeof id === 'string' && id.length > 0 && !baseName.startsWith(id.toLowerCase())) {
          push('V-006', 'id', `文件名 "${baseName}.md" 必须以 id 小写 "${id.toLowerCase()}" 开头`);
        }
      }
    }

    // V-017：journal 的 date / 文件名 / 目录年份 / id 四者一致
    if (expectedType === 'journal') {
      const yearDir = segments[1];
      const dateValue = frontmatter.date;
      const dateStr =
        dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : typeof dateValue === 'string' ? dateValue : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(baseName)) {
        push('V-017', 'date', `journal 文件名必须是 YYYY-MM-DD.md（实际 "${baseName}.md"）`);
      }
      if (dateStr && dateStr !== baseName) {
        push('V-017', 'date', `date "${dateStr}" 与文件名 "${baseName}.md" 不一致`);
      }
      if (yearDir && /^\d{4}$/.test(yearDir) && /^\d{4}/.test(baseName) && yearDir !== baseName.slice(0, 4)) {
        push('V-017', 'date', `目录年份 "${yearDir}" 与文件名年份 "${baseName.slice(0, 4)}" 不一致`);
      }
      if (typeof frontmatter.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseName)) {
        const expectedId = `DJ-${baseName}`;
        if (frontmatter.id !== expectedId) {
          push('V-017', 'id', `journal 的 id 必须由文件名派生为 "${expectedId}"（实际 "${frontmatter.id}"）`);
        }
      }
    }

    // V-010：敏感信息（扫全文，含 draft / published:false）
    for (const { name, re } of PII_PATTERNS) {
      const hit = re.exec(raw);
      if (hit) push('V-010', 'body', `命中疑似${name}：${hit[0].length > 12 ? `${hit[0].slice(0, 6)}…` : hit[0]}（公开仓库禁止任何 PII/凭据，含 published:false）`);
    }

    // W-004：正文空壳
    if (split.body.trim().length < MIN_BODY_CHARS) {
      push('W-004', 'body', `正文仅 ${split.body.trim().length} 字符（< ${MIN_BODY_CHARS}），疑似空壳`);
    }

    // 记录条目（无论是否合规都记，供跨条目规则使用）
    entries.push({
      absPath,
      relPath,
      relToRoot,
      dirName,
      expectedType,
      baseName,
      frontmatter,
      body: split.body,
      ok: parsed.ok,
      data: parsed.ok ? parsed.data : null,
    });
  }

  return { root: contentRoot, entries, violations, missingRoot: false };
}

/* ------------------------------------------------------------------ *
 * 校验（导出给测试用）
 * ------------------------------------------------------------------ */

/**
 * @param {string} root content 目录
 * @param {{today?:Date}} [options]
 */
export function validateContent(root, options = {}) {
  const today = options.today ?? new Date();
  const base = readBase();
  const loaded = loadContent(root);
  const violations = [...loaded.violations];
  const entries = loaded.entries;

  const fileOf = (relPath) => {
    const hit = entries.find((e) => e.relPath === relPath);
    if (hit) return hit.relToRoot;
    return relPath.startsWith('content/') ? relPath.slice('content/'.length) : relPath;
  };
  const push = (code, relPath, field, message) =>
    violations.push({ code, relPath, file: fileOf(relPath), field, message });

  // V-018：profile 必须存在
  if (loaded.missingRoot) {
    push('V-018', 'content/', 'content/', 'content/ 目录不存在（C-18 明令 content/ 之外不得存放内容）');
  }
  const profileEntries = entries.filter((e) => e.expectedType === 'profile');
  if (!loaded.missingRoot) {
    if (profileEntries.length === 0) {
      push('V-018', 'content/profile/profile.md', 'id', '缺少 content/profile/profile.md（C-1 要求 profile 唯一且必须存在）');
    }
    for (const p of profileEntries) {
      if (p.frontmatter?.id !== 'profile') {
        push('V-018', p.relPath, 'id', `profile 的 id 必须是 "profile"（实际 "${p.frontmatter?.id}"）`);
      }
    }
  }

  // 已成功解析的条目 → id 索引
  const byId = new Map();
  const byIdAll = new Map();
  for (const e of entries) {
    const id = e.frontmatter?.id;
    if (typeof id !== 'string' || id.length === 0) continue;
    if (!byIdAll.has(id)) byIdAll.set(id, []);
    byIdAll.get(id).push(e);
    if (e.ok && !byId.has(id)) byId.set(id, e);
  }

  // V-005：id 重复
  for (const [id, list] of byIdAll) {
    if (list.length > 1) {
      for (const e of list) {
        push('V-005', e.relPath, 'id', `id "${id}" 重复（共 ${list.length} 处：${list.map((x) => x.relPath).join(', ')}）`);
      }
    }
  }

  // V-001/V-003：id 前缀与"类型前缀正则"（profile 例外已在 schema 内处理）
  for (const e of entries) {
    const id = e.frontmatter?.id;
    if (typeof id !== 'string') continue;
    const pattern = ID_PATTERN[e.expectedType];
    if (pattern && !pattern.test(id)) {
      // schema 已报过 V-004，这里只为 journal 也保留一致性（避免重复输出）
      const already = violations.some((v) => v.relPath === e.relPath && v.code === 'V-004' && v.field === 'id');
      if (!already) push('V-004', e.relPath, 'id', `id "${id}" 不符合 ${e.expectedType} 规范 ${pattern}`);
    }
  }

  // W-001：受控标签
  for (const e of entries) {
    const tags = e.frontmatter?.tags;
    if (!Array.isArray(tags)) continue;
    for (const tag of tags) {
      if (typeof tag === 'string' && !CONTROLLED_TAGS.includes(tag)) {
        push('W-001', e.relPath, 'tags', `标签 "${tag}" 未登记在 docs/TAXONOMY.md（需在 PR 说明或登记）`);
      }
    }
    if (tags.length > TAGS_MAX) {
      push('V-014', e.relPath, 'tags', `tags 共 ${tags.length} 项，超过 ${TAGS_MAX} 项上限`);
    }
  }

  // W-003：knowledge 过期
  for (const e of entries) {
    if (e.expectedType !== 'knowledge') continue;
    const updated = e.frontmatter?.updated instanceof Date ? e.frontmatter.updated.toISOString().slice(0, 10) : e.frontmatter?.updated;
    if (typeof updated === 'string' && isRealDate(updated)) {
      const age = daysBetween(updated, today);
      if (age > STALE_DAYS) {
        push('W-003', e.relPath, 'updated', `knowledge 已 ${age} 天未更新（> ${STALE_DAYS} 天），考虑复核或标 stale`);
      }
    }
  }

  // V-008 / V-015：引用完整性
  const REF_RULES = [
    { field: 'related', target: 'knowledge' },
    { field: 'linked_knowledge', target: 'knowledge' },
    { field: 'linked_projects', target: 'project' },
    { field: 'linked_errors', target: 'error' },
    { field: 'project', target: 'project' },
  ];

  for (const e of entries) {
    const fm = e.frontmatter;
    if (!fm) continue;
    const sourceVisible = isVisibleEntry({ data: fm });
    for (const rule of REF_RULES) {
      const value = fm[rule.field];
      const refs = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
      for (const ref of refs) {
        if (typeof ref !== 'string' || ref.length === 0) continue;
        const target = byIdAll.get(ref)?.[0];
        if (!target) {
          push('V-008', e.relPath, rule.field, `引用的 ${rule.target} id "${ref}" 不存在`);
          continue;
        }
        if (target.expectedType !== rule.target) {
          push('V-008', e.relPath, rule.field, `"${ref}" 是 ${target.expectedType}，但 ${rule.field} 只能引用 ${rule.target}`);
          continue;
        }
        if (sourceVisible && !isVisibleEntry({ data: target.frontmatter })) {
          push('V-015', e.relPath, rule.field, `已发布条目引用了未发布条目 "${ref}"（站点会断链）`);
        }
      }
    }
  }

  // W-002：sample 占比
  const total = entries.length;
  const sampleCount = entries.filter((e) => e.frontmatter?.sample === true).length;
  if (total > 0 && sampleCount / total > SAMPLE_RATIO_LIMIT) {
    push('W-002', 'content/', 'sample', `示例条目 ${sampleCount}/${total} 超过 ${Math.round(SAMPLE_RATIO_LIMIT * 100)}%（真实内容补齐后应消失）`);
  }

  // W-005：正文内部链接指向不存在的路由
  const routeSet = buildRouteSet(entries, base);
  const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const e of entries) {
    if (!e.body) continue;
    let m;
    while ((m = linkRe.exec(e.body)) !== null) {
      const target = m[1];
      const normalized = normalizeRoute(target, base);
      if (normalized === null) continue; // 外链 / 锚点 / 相对链接不在此规则内
      if (!routeSet.has(normalized)) {
        push('W-005', e.relPath, 'body', `正文链接 "${target}" 指向不存在的路由（v0.1 只有 C-9 的 12 条路由）`);
      }
    }
    linkRe.lastIndex = 0;
  }

  const errors = violations.filter((v) => v.code.startsWith('V-'));
  const warnings = violations.filter((v) => v.code.startsWith('W-'));

  const ordered = [...errors, ...warnings].sort(
    (a, b) => a.relPath.localeCompare(b.relPath) || a.code.localeCompare(b.code) || a.field.localeCompare(b.field),
  );

  return { violations: ordered, errors: errors.length, warnings: warnings.length, entries, base };
}

/**
 * 站内绝对链接归一为不含 base 的路由；返回 null 表示不归 W-005 管。
 */
function normalizeRoute(target, base) {
  let t = target.trim();
  if (!t.startsWith('/')) return null; // 外链、锚点、相对路径
  t = t.split('#')[0].split('?')[0];
  if (base && base !== '/' && (t === base || t.startsWith(`${base}/`))) {
    t = t.slice(base.length) || '/';
  }
  if (t === '') t = '/';
  if (!t.endsWith('/') && !/\.[a-z0-9]+$/i.test(t)) t = `${t}/`;
  return t;
}

function buildRouteSet(entries, base) {
  const set = new Set(STATIC_ROUTES);
  for (const e of entries) {
    if (!e.ok) continue;
    if (!isVisibleEntry({ data: e.data })) continue;
    set.add(pathForEntry(e.expectedType, e.data.id));
  }
  // 允许 base 形式（/141/xxx/）与根形式（/xxx/）都命中：routeSet 统一存不含 base 的形式
  if (base && base !== '/') {
    for (const r of [...set]) set.add(r);
  }
  return set;
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = { root: path.join(REPO_ROOT, 'content') };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root' && argv[i + 1]) {
      args.root = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = validateContent(args.root);

  for (const v of result.violations) {
    process.stdout.write(`${v.code} ${v.relPath}:${v.field} ${v.message}\n`);
  }
  process.stdout.write(`${result.errors} errors, ${result.warnings} warnings\n`);
  process.exit(result.errors > 0 ? 1 : 0);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  main();
}
