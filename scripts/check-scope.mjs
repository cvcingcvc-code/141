#!/usr/bin/env node
/**
 * check-scope.mjs — 分支改动范围门禁（C-17 / T4.1 / A4）
 *
 * 唯一数据来源：AGENTS.md §3（人工维护），本脚本以同构常量 SCOPE_RULES 实现；
 * 两者不一致视为契约撕裂，由 A1 在 PR 中同步（CONTRACTS.md C-17 第 3 条）。
 *
 * 用法：
 *   node scripts/check-scope.mjs [--base <ref>]
 *     --base  对比基线，默认 origin/main（本地与 CI 均可用）
 *
 * 逻辑（C-17）：
 *   1. 取 git diff --name-status <base>...HEAD
 *   2. 按分支前缀匹配允许路径集合；越界即 exit 1，
 *      逐条打印 `越界: <path>（属于 <owner>，当前分支 <prefix>）`
 *   3. 任意分支：docs/rfc/** 仅允许新增（A），修改/删除/重命名视为越界
 *
 * 已知局限（C-17 明文承认，不得假装完备）：
 *   - 只约束"改了哪些文件"，不约束"改得对不对"
 *   - fix/ 分支允许任意路径，靠 PR 引用缺陷编号 + A1 人工审核兜底
 *   - 若 GitHub 侧权限不足以读取 PR 标签，降级为 A1 人工核对
 *
 * 退出码：0 = 通过；1 = 越界或运行错误
 */

import { execFileSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// SCOPE_RULES —— 与 AGENTS.md §3 / CONTRACTS.md C-17 表逐字同构
// ---------------------------------------------------------------------------

// 根配置文件（C-17 "根配置文件、package.json"）。
// 注：.nvmrc 与 LICENSE 由 T1.2（A1）创建，未在 §3 逐字列出，
//     此处按"根配置 = A1"归类；若 A1 认为应另行登记，请同步改本常量（契约撕裂条款）。
const ROOT_CONFIG_FILES = [
  'package.json',
  'package-lock.json',
  'astro.config.mjs',
  'tsconfig.json',
  '.gitattributes',
  '.gitignore',
  '.nvmrc',
  'LICENSE',
];

// 带例外的目录规则
const PUBLIC_EXCEPT_DATA = { include: 'public/**', exclude: ['public/data/**'] };
const DOCS_EXCEPT_AREAS = {
  include: 'docs/**',
  exclude: ['docs/qa/**', 'docs/TAXONOMY.md', 'docs/IMPORT.md'],
};

/** @type {Record<string, (string|{include:string,exclude?:string[]})[] | null>} */
const SCOPE_RULES = {
  'feat/a2-': [
    'content/**',
    'src/content/**',
    // 注：src/content.config.ts 在 AGENTS §3 属 A2，C-17 表未逐字列出（src/content/** 不覆盖它），
    // 此处取并集；差异已在 T4.1 PR 中提请 A1 裁决。
    'src/content.config.ts',
    'src/lib/collections.ts',
    'scripts/validate-content.mjs',
    'docs/TAXONOMY.md',
  ],
  'feat/a3-': [
    'src/pages/**',
    'src/layouts/**',
    'src/components/**',
    'src/styles/**',
    'src/lib/format.ts',
    'src/lib/search.ts',
    PUBLIC_EXCEPT_DATA,
  ],
  'feat/a4-': [
    '.github/**',
    'scripts/build-data.mjs',
    'scripts/check-scope.mjs',
    'scripts/import/**',
    'templates/**',
    'public/data/**',
    'docs/IMPORT.md',
  ],
  'qa/a5-': ['qa/**', 'docs/qa/**'],
  'docs/': [DOCS_EXCEPT_AREAS, 'AGENTS.md', 'README.md', ...ROOT_CONFIG_FILES],
  'chore/': [DOCS_EXCEPT_AREAS, 'AGENTS.md', 'README.md', ...ROOT_CONFIG_FILES],
  // fix/：任意路径，PR 必须引用缺陷编号并由 A1 人工审核（C-17 已知局限，人工兜底）
  'fix/': null,
};

// ---------------------------------------------------------------------------
// OWNERSHIP —— 路径归属表，用于越界信息（数据来源：AGENTS.md §3，顺序敏感，具体在前）
// ---------------------------------------------------------------------------

const OWNERSHIP = [
  // A4 / A3 的 public 交界：public/data/** 归 A4，先于 public/**
  ['public/data/**', 'A4'],
  ['public/**', 'A3'],
  // A2
  ['content/**', 'A2'],
  ['src/content/**', 'A2'],
  ['src/content.config.ts', 'A2'],
  ['src/lib/collections.ts', 'A2'],
  ['scripts/validate-content.mjs', 'A2'],
  ['docs/TAXONOMY.md', 'A2'],
  // A3
  ['src/pages/**', 'A3'],
  ['src/layouts/**', 'A3'],
  ['src/components/**', 'A3'],
  ['src/styles/**', 'A3'],
  ['src/lib/format.ts', 'A3'],
  ['src/lib/search.ts', 'A3'],
  // A4
  ['.github/**', 'A4'],
  ['scripts/build-data.mjs', 'A4'],
  ['scripts/check-scope.mjs', 'A4'],
  ['scripts/import/**', 'A4'],
  ['templates/**', 'A4'],
  ['docs/IMPORT.md', 'A4'],
  // A5
  ['qa/**', 'A5'],
  ['docs/qa/**', 'A5'],
  // 共享
  ['docs/rfc/**', '共享（docs/rfc/** 仅允许新增，不得修改他人 RFC 结论）'],
  // A1（单点所有权）
  ['docs/incidents/**', 'A1'],
  ['docs/AUDIT.md', 'A1'],
  ['docs/PRODUCT.md', 'A1'],
  ['docs/ARCHITECTURE.md', 'A1'],
  ['docs/CONTRACTS.md', 'A1'],
  ['docs/TASKS.md', 'A1'],
  ['docs/ACCEPTANCE.md', 'A1'],
  ['docs/BRANCHES.md', 'A1'],
  ['package.json', 'A1'],
  ['package-lock.json', 'A1'],
  ['astro.config.mjs', 'A1'],
  ['tsconfig.json', 'A1'],
  ['.gitattributes', 'A1'],
  ['.gitignore', 'A1'],
  ['.nvmrc', 'A1（根配置，未在 §3 逐字登记）'],
  ['LICENSE', 'A1（根配置，未在 §3 逐字登记）'],
  ['README.md', 'A1'],
  ['AGENTS.md', 'A1'],
  ['src/**', '未登记子路径（src/ 下新增位置需对照 AGENTS §3，缺失则提请 A1 登记）'],
  ['scripts/**', '未登记子路径（scripts/ 下新增位置需对照 AGENTS §3，缺失则提请 A1 登记）'],
  ['docs/**', '未登记子路径（docs/ 下新增位置需对照 AGENTS §3，缺失则提请 A1 登记）'],
];

const RFC_GLOB = 'docs/rfc/**';

// ---------------------------------------------------------------------------
// 实现
// ---------------------------------------------------------------------------

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

/** 极简 glob → RegExp：`**` 跨目录，`*` 不跨目录，其余按字面转义 */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob.startsWith('**', i)) {
        re += '.*';
        i += 1; // 消费第二个 *
        if (glob[i + 1] === '/') i += 1; // 消费紧随的 /
      } else {
        re += '[^/]*';
      }
    } else if ('\\^$.|?+()[]{}'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

const globCache = new Map();
function matchGlob(path, glob) {
  if (!globCache.has(glob)) globCache.set(glob, globToRegExp(glob));
  return globCache.get(glob).test(path);
}

/** 判断 path 是否被单条允许规则命中（含例外表） */
function matchAllow(path, entry) {
  if (typeof entry === 'string') return matchGlob(path, entry);
  if (!matchGlob(path, entry.include)) return false;
  return !(entry.exclude ?? []).some((ex) => matchGlob(path, ex));
}

function ownerOf(path) {
  for (const [glob, owner] of OWNERSHIP) {
    if (matchGlob(path, glob)) return owner;
  }
  return '未登记（新增顶层文件/目录前需 A1 在 AGENTS.md §3 登记）';
}

function currentBranch() {
  // PR 事件：GITHUB_HEAD_REF 是源分支名（权威）
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF;
  let b = '';
  try {
    b = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  } catch {
    /* fallthrough */
  }
  if (!b || b === 'HEAD') {
    // push 事件 / detached：GITHUB_REF_NAME 形如 main、feat/a4-ci
    if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
    console.error('scope:check 错误：无法识别当前分支（detached HEAD 且无 GITHUB_REF_NAME）');
    process.exit(1);
  }
  return b;
}

function branchPrefix(branch) {
  // SCOPE_RULES 键是"前缀"，feat/a4-ci 命中 'feat/a4-'；docs/xxx 命中 'docs/'
  const keys = Object.keys(SCOPE_RULES).sort((a, b) => b.length - a.length);
  for (const k of keys) if (branch.startsWith(k)) return k;
  return null;
}

/** 解析 --base 参数，默认 origin/main */
function parseBase(argv) {
  const i = argv.indexOf('--base');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return 'origin/main';
}

function diffEntries(base) {
  const out = git(['diff', '--name-status', `${base}...HEAD`]);
  /** @type {{status:string, path:string, added:boolean}[]} */
  const entries = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const fields = line.split('\t');
    const status = fields[0];
    const letter = status[0]; // M / A / D / R / C ...
    if (letter === 'R' || letter === 'C') {
      // R100<TAB>old<TAB>new —— 新旧路径都算"改动"
      entries.push({ status, path: fields[1], added: false });
      entries.push({ status, path: fields[2], added: true });
    } else {
      entries.push({ status, path: fields[1], added: letter === 'A' });
    }
  }
  return entries;
}

function main() {
  const base = parseBase(process.argv.slice(2));
  const branch = currentBranch();
  const prefix = branchPrefix(branch);

  // 基线必须存在，否则明确报错（不静默通过）
  try {
    git(['rev-parse', '--verify', `${base}^{commit}`]);
  } catch {
    console.error(`scope:check 错误：基线 ${base} 不存在（本地请先 git fetch origin）`);
    process.exit(1);
  }

  const entries = diffEntries(base);
  const violations = [];

  if (prefix === null) {
    if (entries.length === 0) {
      console.log(`scope:check 通过：分支 ${branch}（${base}...HEAD）无改动`);
      process.exit(0);
    }
    console.error(
      `scope:check 错误：分支 ${branch} 前缀不在 SCOPE_RULES（C-17），且有 ${entries.length} 个文件改动，拒绝放行。`
    );
    console.error('合法前缀：feat/a2- / feat/a3- / feat/a4- / qa/a5- / docs/ / chore/ / fix/');
    process.exit(1);
  }

  const allowlist = SCOPE_RULES[prefix];

  for (const e of entries) {
    // 规则 0（任意分支）：docs/rfc/** 仅允许新增
    if (matchGlob(e.path, RFC_GLOB)) {
      if (!e.added) {
        violations.push(`${e.path}（docs/rfc/** 仅允许新增，${e.status} 为修改/删除/重命名）`);
      }
      continue;
    }
    // fix/：任意路径放行（人工兜底，见文件头已知局限）
    if (allowlist === null) continue;
    if (!allowlist.some((entry) => matchAllow(e.path, entry))) {
      violations.push(`${e.path}（属于 ${ownerOf(e.path)}，当前分支 ${prefix}）`);
    }
  }

  console.log(`scope:check —— 分支 ${branch}（前缀 ${prefix}），基线 ${base}...HEAD，改动 ${entries.length} 个文件`);
  if (violations.length > 0) {
    for (const v of violations) console.log(`越界: ${v}`);
    console.log(`scope:check 失败：${violations.length} 处越界`);
    process.exit(1);
  }
  console.log('scope:check 通过：0 越界');
}

main();
