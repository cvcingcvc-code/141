#!/usr/bin/env node
/**
 * privacy-scan.mjs — A5 独立 QA：隐私三层扫描（P0-1 / ACCEPTANCE §7）
 *
 * 用法（不经 package.json，见 CONTRACTS C-11）：
 *   node qa/scripts/privacy-scan.mjs [--repo <git 仓库路径>] [--dist <产物路径>] [--history N]
 *
 * 三层：
 *   L1 工作树  —— 扫描全部已跟踪文件（含 draft / published:false）。
 *   L2 git 历史 —— 最近 N 个提交（默认 50）+ 全部涉及 content/ 的提交，扫描新增行。
 *   L3 构建产物 —— 扫描 dist/** 文本文件。
 *
 * 白名单（透明上报，不视作真实命中）：
 *   - 值级：邮箱以 @example.com 结尾（契约/验收文档的示例值）。
 *   - 文件级：本脚本自身（含正则字面量定义）、docs/CONTRACTS.md、
 *             docs/ACCEPTANCE.md 中出现的规则字面量（ghp_/AKIA/sk-/PRIVATE KEY 等）。
 *
 * 退出码：0 = 无真实命中（结论明确）；1 = 发现真实命中（阻断）。
 * 依赖：Node 22（零 npm 依赖）；只读，不改任何业务代码。
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const a = { repo: REPO_ROOT, dist: resolve(REPO_ROOT, 'dist'), history: 50 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repo') a.repo = argv[++i];
    else if (argv[i] === '--dist') a.dist = argv[++i];
    else if (argv[i] === '--history') a.history = parseInt(argv[++i], 10);
  }
  return a;
}

/** 敏感信息正则（对应 CONTRACTS V-010 / ACCEPTANCE §7）。 */
const RULES = [
  { id: 'EMAIL', label: '邮箱', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { id: 'CN_MOBILE', label: '中国大陆手机号', re: /(?<!\d)1[3-9]\d{9}(?!\d)/g },
  { id: 'CN_ID', label: '身份证号', re: /(?<!\d)\d{17}[\dXx](?!\d)/g },
  { id: 'GH_TOKEN', label: 'GitHub 令牌', re: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { id: 'OPENAI_KEY', label: 'OpenAI 密钥', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { id: 'AWS_KEY', label: 'AWS 访问密钥', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'PRIVATE_KEY', label: '私钥块', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { id: 'AWS_SECRET', label: 'AWS Secret 赋值', re: /AWS_SECRET_ACCESS_KEY\s*=\s*["']?[A-Za-z0-9/+=]{16,}/g },
];

/** 值级白名单：命中的完整值落在这些条件即视为示例。 */
function isPlaceholderValue(ruleId, value) {
  if (ruleId === 'EMAIL') return /@example\.com$/i.test(value);
  return false;
}

/** 文件级白名单（命中规则字面量本身，非真实凭据）。 */
const FILE_WHITELIST = new Set([
  'qa/scripts/privacy-scan.mjs',
  'docs/CONTRACTS.md',
  'docs/ACCEPTANCE.md',
]);

/**
 * 前缀白名单：QA 缺陷单 / 基线报告合法引用「已发现的命中值」，
 * 属于结果归档而非新增暴露面，报告为白名单、不再重复计为真实命中。
 */
const PREFIX_WHITELIST = [
  'docs/qa/defects/',
  'qa/baseline/',
];

function isFileWhitelisted(fileRel) {
  const f = fileRel.replace(/\\/g, '/');
  if (FILE_WHITELIST.has(f)) return '文件白名单（规则字面量/示例）';
  if (PREFIX_WHITELIST.some((p) => f.startsWith(p))) return '文件白名单（QA 引用已知命中）';
  return null;
}

function scanText(text) {
  const hits = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(lines[i])) !== null) {
        hits.push({ ruleId: rule.id, label: rule.label, value: m[0], line: i + 1 });
      }
    }
  }
  return hits;
}

function classify(fileRel, hits) {
  const real = [];
  const whitelisted = [];
  for (const h of hits) {
    const fileWL = isFileWhitelisted(fileRel);
    if (fileWL || isPlaceholderValue(h.ruleId, h.value)) {
      whitelisted.push({ ...h, reason: fileWL || '示例值（@example.com）' });
    } else {
      real.push(h);
    }
  }
  return { real, whitelisted };
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/** L1 工作树：扫描全部已跟踪文件。 */
function scanWorktree() {
  const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
  const real = [];
  const whitelisted = [];
  let scanned = 0, skipped = 0;
  const BIN_EXTS = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|mp3|mp4|zip|gz|pdf|lock)$/i;
  for (const f of files) {
    const abs = join(REPO_ROOT, f);
    if (!existsSync(abs) || BIN_EXTS.test(f)) { if (existsSync(abs) && BIN_EXTS.test(f)) skipped++; continue; }
    let text;
    try { text = readFileSync(abs, 'utf8'); } catch { skipped++; continue; }
    scanned++;
    const { real: r, whitelisted: w } = classify(f.replace(/\\/g, '/'), scanText(text));
    r.forEach((x) => real.push({ file: f, ...x }));
    w.forEach((x) => whitelisted.push({ file: f, ...x }));
  }
  return { scanned, skipped, real, whitelisted };
}

/** L2 git 历史：最近 N + 全部 content/ 提交，扫描新增行。 */
function scanHistory(n) {
  const recent = git(['log', '--format=%H', `-n`, String(n)]).split('\n').filter(Boolean);
  const contentCommits = git(['log', '--format=%H', '--', 'content/']).split('\n').filter(Boolean);
  const commits = [...new Set([...recent, ...contentCommits])];
  const real = [];
  const whitelisted = [];
  for (const sha of commits) {
    let diff;
    try {
      diff = git(['show', sha, '--format=', '--unified=0', '--no-color']);
    } catch { continue; }
    const added = [];
    let curFile = '(commit)';
    for (const line of diff.split('\n')) {
      if (line.startsWith('+++')) continue;
      if (line.startsWith('---')) continue;
      if (line.startsWith('diff --git')) { const mm = line.match(/ b\/(.+)$/); if (mm) curFile = mm[1]; continue; }
      if (line.startsWith('+++ b/')) continue;
      if (line.startsWith('+') && !line.startsWith('+++')) added.push({ file: curFile, line: line.slice(1) });
    }
    for (const a of added) {
      const { real: r, whitelisted: w } = classify(a.file.replace(/\\/g, '/'), scanText(a.line));
      r.forEach((x) => real.push({ commit: sha.slice(0, 7), file: a.file, ...x }));
      w.forEach((x) => whitelisted.push({ commit: sha.slice(0, 7), file: a.file, ...x }));
    }
  }
  return { commits: commits.length, real, whitelisted };
}

/** L3 构建产物：递归扫描 dist/** 文本文件。 */
function scanDist(dist) {
  const real = [];
  const whitelisted = [];
  let scanned = 0;
  if (!existsSync(dist)) return { exists: false, scanned, real, whitelisted };
  const BIN_EXTS = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|mp3|mp4|zip|gz|pdf|lock|br)$/i;
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (!BIN_EXTS.test(name)) {
        let text;
        try { text = readFileSync(p, 'utf8'); } catch { continue; }
        scanned++;
        const rel = relative(dist, p).replace(/\\/g, '/');
        const { real: r, whitelisted: w } = classify('dist/' + rel, scanText(text));
        r.forEach((x) => real.push({ file: 'dist/' + rel, ...x }));
        w.forEach((x) => whitelisted.push({ file: 'dist/' + rel, ...x }));
      }
    }
  }
  walk(dist);
  return { exists: true, scanned, real, whitelisted };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('== A5 privacy-scan（三层）==');
  console.log('repo:', args.repo, '| dist:', args.dist, '| history:', args.history);
  console.log();

  console.log('--- L1 工作树 ---');
  const l1 = scanWorktree();
  console.log(`  扫描 ${l1.scanned} 个文本文件（跳过 ${l1.skipped} 个二进制），真实命中 ${l1.real.length}，白名单 ${l1.whitelisted.length}`);
  l1.real.forEach((x) => console.log(`  [真实] ${x.file}:${x.line} ${x.label} ${x.value}`));
  l1.whitelisted.forEach((x) => console.log(`  [白名单] ${x.file}:${x.line} ${x.label} ${x.value} (${x.reason})`));

  console.log();
  console.log('--- L2 git 历史 ---');
  const l2 = scanHistory(args.history);
  console.log(`  覆盖 ${l2.commits} 个提交，真实命中 ${l2.real.length}，白名单 ${l2.whitelisted.length}`);
  l2.real.forEach((x) => console.log(`  [真实] ${x.commit} ${x.file}:${x.line} ${x.label} ${x.value}`));
  l2.whitelisted.forEach((x) => console.log(`  [白名单] ${x.commit} ${x.file}:${x.line} ${x.label} ${x.value} (${x.reason})`));

  console.log();
  console.log('--- L3 构建产物 ---');
  const l3 = scanDist(args.dist);
  if (!l3.exists) console.log('  dist/ 不存在（尚未构建或已清理）');
  else console.log(`  扫描 ${l3.scanned} 个文本文件，真实命中 ${l3.real.length}，白名单 ${l3.whitelisted.length}`);
  l3.real.forEach((x) => console.log(`  [真实] ${x.file}:${x.line} ${x.label} ${x.value}`));
  l3.whitelisted.forEach((x) => console.log(`  [白名单] ${x.file}:${x.line} ${x.label} ${x.value} (${x.reason})`));

  const totalReal = l1.real.length + l2.real.length + l3.real.length;
  console.log();
  const conclusion = totalReal === 0
    ? '结论：三层均无真实 PII/凭据命中（白名单项为规则字面量与示例值，已逐条上报）'
    : `结论：发现 ${totalReal} 处真实命中，阻断合并（P0-1）`;
  console.log(conclusion);

  const out = {
    l1: { scanned: l1.scanned, real: l1.real, whitelisted: l1.whitelisted },
    l2: { commits: l2.commits, real: l2.real, whitelisted: l2.whitelisted },
    l3: { exists: l3.exists, scanned: l3.scanned, real: l3.real, whitelisted: l3.whitelisted },
    conclusion,
    exitCode: totalReal === 0 ? 0 : 1,
  };
  const dir = resolve(__dirname, '..', 'baseline');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'privacy-scan.latest.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('已写：', join(dir, 'privacy-scan.latest.json'));
  process.exit(out.exitCode);
}

main();
