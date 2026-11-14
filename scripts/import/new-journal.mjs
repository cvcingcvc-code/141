#!/usr/bin/env node
/**
 * scripts/import/new-journal.mjs — journal 草稿生成器（A4，T4.3，见 AGENTS.md §3）
 *
 * 做什么：把「人写的结构化笔记」转成一个**合法但未定稿**的 journal 草稿。
 * 不做什么（硬约束，见 docs/IMPORT.md）：
 *   - 不自动抓取任何数据源（不联网、不读第三方笔记应用）
 *   - 不生成用户没写过的内容：did / learned / summary 必须来自用户输入，
 *     缺失就报错，绝不虚构句子凑合法字段
 *   - 不写 published / published_by / approved_at / approved_by 的实值
 *   - 不 approve、不 commit、不 merge、不部署
 *
 * 安全边界（T4.3）：
 *   - 默认只在仓库外生成草稿；仅 --authorize 才写入 content/journal/<YYYY>/。
 *   - --date 是唯一决定 id / 文件名 / 目录的输入，且强制校验为真实 YYYY-MM-DD，
 *     因此文件名与目录不含任何用户可控路径段，杜绝路径穿越。
 *   - --out 在非授权时必须落在仓库外，否则拒绝（防「输出路径逃逸」）。
 *   - --vault-ref 只接受 vault:<相对路径>（正则与 schema.ts 同构），阻止 ../ 与绝对路径。
 *
 * 用法：
 *   node scripts/import/new-journal.mjs --date 2026-11-08 --from note.md
 *   node scripts/import/new-journal.mjs --date 2026-11-08 --title "..." --summary "..." \
 *       --did "做了A" --did "做了B" --learned "学到X"
 *   node scripts/import/new-journal.mjs --date 2026-11-08 --from note.md --authorize --dry-run
 *
 * 退出码：0 成功（或 dry-run）；1 参数/校验/安全拒绝
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import yaml from 'js-yaml';

import { isRealDate, parseEntry } from '../../src/content/schema.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_JOURNAL = path.join(REPO_ROOT, 'content', 'journal');

/** 私密库默认目录（C-18 约定 F:\141-vault）；可用 --out 覆盖 */
const DEFAULT_VAULT_DIR = process.env.VAULT_DIR || 'F:\\141-vault';

/** 与 schema.ts 的 VAULT_REF_RE 同构（schema 未导出该常量） */
const VAULT_REF_RE = /^vault:(?!\/)(?!.*\.\.)[A-Za-z0-9._\-/]+$/;
const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SOURCE_VALUES = ['self-reported', 'agent-drafted'];

const HELP = `复盘导入（生成 draft 草稿，不发布，默认写到仓库外）

  node scripts/import/new-journal.mjs --date YYYY-MM-DD [选项]

选项
  --date <YYYY-MM-DD>      必填，复盘日期（决定 id / 文件名 / 目录）
  --from <结构化笔记.md>    源笔记：含 "# 标题"、摘要段、"## did"/"## learned"（可选 ## blocked/## tomorrow）
  --title <标题>            覆盖/补充标题（4..80 字）
  --summary <摘要>          覆盖/补充摘要（20..200 字）
  --did <一句话>            当天做的事，可重复传；至少 1 条
  --learned <一句话>        当天学到的，可重复传；至少 1 条
  --blocked <一句话>        卡住的事，可重复（可选）
  --tomorrow <一句话>       次日打算，可重复（可选）
  --source <值>             自述来源 self-reported|agent-drafted（默认 agent-drafted）
  --energy <1..5>           当天精力（可选；非 nullable，缺省省略）
  --vault-ref <vault:...>   原始记录指针（仅合法 vault: 相对引用）
  --tags <a,b,c>            标签（逗号分隔，须小写 kebab）
  --out <目录>              草稿输出目录（默认 <私密库>/drafts；仅非授权时生效，须在仓库外）
  --authorize               显式授权：写入 content/journal/<YYYY>/（否则只写仓库外草稿）
  --dry-run                 只打印，不写文件
  --force                   同日期文件已存在时允许覆盖（已发布条目仍拒绝）
  -h, --help                显示本帮助
`;

function fail(msg) {
  process.stderr.write(`错误: ${msg}\n`);
  process.exit(1);
}

const toPosix = (p) => p.split(path.sep).join('/');
const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();

/** 去掉文件开头的 YAML frontmatter（用户拿别的模板写的笔记常带一层） */
function stripFrontmatter(text) {
  const m = String(text).match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? text.slice(m[0].length) : text;
}

/* ----------------------------- 参数 ----------------------------- */

function parseArgs(argv) {
  const a = {
    date: null, from: null, title: null, summary: null, did: [], learned: [],
    blocked: [], tomorrow: [], source: 'agent-drafted', energy: null, vaultRef: null,
    tags: null, out: null, authorize: false, dryRun: false, force: false, help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const val = () => { i += 1; return argv[i]; };
    switch (arg) {
      case '--date': a.date = val(); break;
      case '--from': a.from = val(); break;
      case '--title': a.title = val(); break;
      case '--summary': a.summary = val(); break;
      case '--did': a.did.push(val()); break;
      case '--learned': a.learned.push(val()); break;
      case '--blocked': a.blocked.push(val()); break;
      case '--tomorrow': a.tomorrow.push(val()); break;
      case '--source': a.source = val(); break;
      case '--energy': a.energy = val(); break;
      case '--vault-ref': a.vaultRef = val(); break;
      case '--tags': a.tags = val(); break;
      case '--out': a.out = val(); break;
      case '--authorize': a.authorize = true; break;
      case '--dry-run': a.dryRun = true; break;
      case '--force': a.force = true; break;
      case '-h': case '--help': a.help = true; break;
      default:
        if (arg.startsWith('-')) fail(`未知参数 ${arg}`);
    }
  }
  return a;
}

/* ------------------------- 源笔记解析 --------------------------- */

/** 从结构化笔记解析 title/summary/did/learned/blocked/tomorrow */
function parseNote(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = clean.split('\n');
  let title = null;
  let summary = [];
  const sections = new Map();
  let current = null;
  for (const line of lines) {
    const h1 = /^#\s+(.+)$/.exec(line);
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h1 && title === null) title = h1[1].trim();
    else if (h2) { current = h2[1].trim().toLowerCase(); if (!sections.has(current)) sections.set(current, []); }
    else if (/^\s*-\s+/.test(line) && current) {
      const item = line.replace(/^\s*-\s+/, '').trim();
      if (item) sections.get(current).push(item);
    } else if (current === null && title !== null && line.trim()) {
      summary.push(line.trim());
    }
  }
  const listOf = (n) => sections.get(n) || [];
  return { title: title ?? '', summary: summary.join(' ').trim(), did: listOf('did'), learned: listOf('learned'), blocked: listOf('blocked'), tomorrow: listOf('tomorrow') };
}

/* ----------------------------- 校验 ----------------------------- */

function validateDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`--date 必须是 YYYY-MM-DD（实际 "${date}"）`);
  if (!isRealDate(date)) fail(`--date "${date}" 不是真实日期`);
}

function validateVaultRef(v) {
  if (v === null || v === undefined || v === '') return undefined;
  if (!VAULT_REF_RE.test(v)) fail(`--vault-ref 必须是 "vault:<相对路径>"，不允许绝对路径/盘符/../ 穿越或其它协议（实际 "${v}"）`);
  return v;
}

function parseTags(s) {
  if (!s) return [];
  const tags = s.split(',').map((t) => t.trim()).filter(Boolean);
  for (const t of tags) if (!TAG_RE.test(t)) fail(`标签 "${t}" 必须是小写 kebab-case`);
  if (tags.length > 12) fail('tags 最多 12 项');
  return tags;
}

function validateEnergy(v) {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) fail('--energy 必须是 1..5 的整数');
  return n;
}

/* ----------------------------- 生成 ----------------------------- */

function buildFrontmatter(o) {
  const missing = [];
  if (!o.title) missing.push('title');
  if (!o.summary) missing.push('summary');
  if (o.did.length === 0) missing.push('did（至少 1 条，用户实际完成的事）');
  if (o.learned.length === 0) missing.push('learned（至少 1 条，用户真正学到的）');
  if (missing.length > 0) {
    fail(`必填信息缺失，请补齐（不要用虚构句子凑数）：\n  - ${missing.join('\n  - ')}`);
  }

  const fm = {
    id: `DJ-${o.date}`,
    type: 'journal',
    title: oneLine(o.title),
    summary: oneLine(o.summary),
    created: o.date,
    updated: o.date,
    published: false,
    tags: o.tags,
    sample: false,
    vault_ref: null,
    date: o.date,
    review_status: 'draft',
    source: o.source,
    approved_at: null,
    approved_by: null,
    did: o.did.map((x) => x.trim()).filter(Boolean),
    learned: o.learned.map((x) => x.trim()).filter(Boolean),
    blocked: o.blocked.map((x) => x.trim()).filter(Boolean),
    tomorrow: o.tomorrow.map((x) => x.trim()).filter(Boolean),
    linked_knowledge: [],
    linked_projects: [],
    linked_errors: [],
    raw_source: null,
  };
  if (o.energy !== undefined && o.energy !== null) fm.energy = o.energy;
  if (o.vaultRef !== undefined) fm.raw_source = o.vaultRef;

  const parsed = parseEntry('journal', fm);
  if (!parsed.ok) {
    const detail = parsed.issues.map((i) => `  ${i.code} ${i.field}: ${i.message}`).join('\n');
    fail(`生成的 frontmatter 未通过 Schema 校验，拒绝产出：\n${detail}`);
  }
  return { fm, bodyFrom: o.body };
}

/* --------------------------- 输出路径 --------------------------- */

function resolveOutput(args, date) {
  const year = date.slice(0, 4);
  const fileName = `${date}.md`;
  if (args.authorize) {
    return { dir: path.join(CONTENT_JOURNAL, year), file: path.join(CONTENT_JOURNAL, year, fileName), inRepo: true };
  }
  const baseDir = args.out ? path.resolve(args.out) : path.join(DEFAULT_VAULT_DIR, 'drafts');
  const rel = path.relative(REPO_ROOT, baseDir);
  const insideRepo = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  if (insideRepo) fail(`未授权(--authorize)时草稿必须落在仓库外，--out 指向了仓库内（${baseDir}）`);
  return { dir: baseDir, file: path.join(baseDir, fileName), inRepo: false };
}

/* ----------------------------- 主流程 --------------------------- */

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); process.exit(0); }
  if (!args.date) fail('缺少 --date');
  validateDate(args.date);
  if (!SOURCE_VALUES.includes(args.source)) fail(`--source 必须是 ${SOURCE_VALUES.join(' | ')}（实际 "${args.source}"）`);

  const energy = validateEnergy(args.energy);
  const vaultRef = validateVaultRef(args.vaultRef);
  const tags = parseTags(args.tags);

  // 输入：--from 结构化笔记优先，命令行覆盖
  let note = { title: '', summary: '', did: [], learned: [], blocked: [], tomorrow: [] };
  let body = '';
  if (args.from) {
    if (!fs.existsSync(args.from)) fail(`--from 文件不存在：${args.from}`);
    const raw = stripFrontmatter(fs.readFileSync(args.from, 'utf8'));
    note = parseNote(raw);
    body = raw.trim();
  }

  const o = {
    date: args.date,
    title: args.title || note.title,
    summary: args.summary || note.summary,
    did: args.did.length > 0 ? args.did : note.did,
    learned: args.learned.length > 0 ? args.learned : note.learned,
    blocked: args.blocked.length > 0 ? args.blocked : note.blocked,
    tomorrow: args.tomorrow.length > 0 ? args.tomorrow : note.tomorrow,
    source: args.source,
    energy,
    vaultRef,
    tags,
    body,
  };

  const { fm } = buildFrontmatter(o);
  const out = resolveOutput(args, args.date);

  if (fs.existsSync(out.file)) {
    const existing = fs.readFileSync(out.file, 'utf8');
    if (/^published:\s*true\s*$/m.test(existing)) fail(`拒绝：${toPosix(out.file)} 已存在且 published: true，脚本不覆盖已发布内容`);
    if (!args.force) fail(`拒绝：${toPosix(out.file)} 已存在（同日期已有草稿/条目）。确认覆盖加 --force`);
  }

  const yamlText = yaml.dump(fm, { lineWidth: -1, noRefs: true });
  const content = `---\n${yamlText}---\n\n## 原始记录\n\n${body || '（无 --from，正文待补充）'}\n`;

  const where = out.inRepo ? '仓库内 content/' : '仓库外草稿目录';
  console.log(`将写入（${where}）：${toPosix(out.file)}`);

  if (args.dryRun) {
    console.log(`--- dry-run 内容预览 ---\n${content}`);
    return;
  }

  fs.mkdirSync(out.dir, { recursive: true });
  fs.writeFileSync(out.file, content, 'utf8');
  console.log(`已生成 draft 草稿：${toPosix(out.file)}`);
  console.log('状态：review_status=draft, published=false, source=' + fm.source + '，无实值审批证据 —— 不会上站');
  console.log('下一步：npm run validate → 提 PR → 用户审核 → 合并；本脚本不 commit/merge/发布');

  // 生成后立即用仓库校验器复验（双保险；不在 dry-run 下执行）
  try {
    execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'validate-content.mjs')], { stdio: 'inherit' });
  } catch {
    console.error('\n校验未通过（文件已写出）。按上面报错改完再提交。');
    process.exit(1);
  }
}

main();
