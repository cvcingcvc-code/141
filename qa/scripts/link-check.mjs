#!/usr/bin/env node
/**
 * link-check.mjs — A5 独立 QA：路由契约探测 + 站内链接爬取（Wave 2）
 *
 * 相比 T5.1 基线的增强：
 *   1. 区分「固定路由」与「动态路由」两类，分别输出矩阵。
 *   2. 动态路由额外做「无效 ID」探测：期望 HTTP 404 且正文含 404 特征，
 *      以区分「正确的 404 处理」与「未实现导致的全 404」。
 *   3. 对 localhost 目标自动 fallback 到 IPv6 [::1]（Astro preview 只监听 ::1）。
 *
 * 用法（不经 package.json，见 CONTRACTS C-11）：
 *   node qa/scripts/link-check.mjs [--base http://localhost:4321/141/] [--strict]
 *
 * 退出码：默认模式下，断链>0 或出现异常状态码 → 1。
 *         --strict 额外要求：固定路由 + 动态有效 ID 全部 200，且无效 ID 全部正确 404。
 *
 * 依赖：Node 22（全局 fetch，零 npm 依赖）。只读站点，不伪装通过。
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { base: 'http://localhost:4321/141/', strict: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--strict') args.strict = true;
  }
  args.base = args.base.replace(/\/+$/, '') + '/';
  return args;
}

/** C-9 固定路由（8 条） */
const STATIC_ROUTES = [
  { path: '', desc: '首页' },
  { path: 'about/', desc: '个人介绍（profile）' },
  { path: 'knowledge/', desc: '知识列表' },
  { path: 'projects/', desc: '项目列表' },
  { path: 'journal/', desc: '复盘列表（仅 approved）' },
  { path: 'errors/', desc: '错误经验列表' },
  { path: 'search/', desc: '全文搜索（Pagefind）' },
  { path: '404.html', desc: '未找到页（固定文件名）' },
];

/** 动态路由有效 ID（契约示例 id；若 content.json 存在则以其 path 为准） */
const DYNAMIC_VALID = [
  { path: 'knowledge/kb-eng-001/', type: 'knowledge', id: 'KB-ENG-001' },
  { path: 'projects/pj-141/', type: 'project', id: 'PJ-141' },
  { path: 'journal/2026-11-06/', type: 'journal', id: 'DJ-2026-11-06' },
  { path: 'errors/er-20261106-01/', type: 'error', id: 'ER-20261106-01' },
];

/** 动态路由无效 ID（不应存在的 id，期望落到 404） */
const DYNAMIC_INVALID = [
  { path: 'knowledge/qa-not-exist-999/', type: 'knowledge' },
  { path: 'projects/pj-not-exist/', type: 'project' },
  { path: 'journal/2099-01-01/', type: 'journal' },
  { path: 'errors/er-99999999-99/', type: 'error' },
];

const NOTFOUND_MARKER = '没有找到这个页面';

/** 若目标是 localhost 且失败，回退到 [::1]（preview 只监听 IPv6） */
function fallbackIpv6(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost') return url.replace('://localhost', '://[::1]');
  } catch { /* ignore */ }
  return null;
}

async function probe(url) {
  let lastErr;
  const candidates = [url, fallbackIpv6(url)].filter(Boolean);
  for (const c of candidates) {
    try {
      const res = await fetch(c, { redirect: 'manual' });
      return { status: res.status, text: await res.text() };
    } catch (e) { lastErr = e; }
  }
  return { status: 0, error: String(lastErr?.cause?.code || lastErr?.message || lastErr) };
}

function verdictOf(status) {
  if (status === 200) return '可访问';
  if (status === 404) return '未实现/待测试';
  if (status === 0) return '连接失败';
  return `异常(${status})`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('== A5 link-check（Wave 2）==');
  console.log('base:', args.base, args.strict ? '(strict)' : '');
  console.log();

  // 1) 固定路由
  console.log('--- 固定路由（8 条）---');
  const fixed = [];
  for (const r of STATIC_ROUTES) {
    const url = args.base + r.path;
    const { status, error } = await probe(url);
    const v = verdictOf(status);
    fixed.push({ path: r.path, status, verdict: v, desc: r.desc });
    console.log(`  [${v}] ${status}  ${r.path || '(首页)'}  — ${r.desc}${status === 0 ? '  (' + error + ')' : ''}`);
  }

  // 2) 动态路由：有效 ID
  console.log();
  console.log('--- 动态路由：有效 ID（4 条）---');
  const dynValid = [];
  for (const r of DYNAMIC_VALID) {
    const url = args.base + r.path;
    const { status, error } = await probe(url);
    const v = verdictOf(status);
    dynValid.push({ path: r.path, id: r.id, status, verdict: v });
    console.log(`  [${v}] ${status}  ${r.path}  (${r.id})${status === 0 ? '  (' + error + ')' : ''}`);
  }

  // 3) 动态路由：无效 ID（期望 404 + 特征文本）
  console.log();
  console.log('--- 动态路由：无效 ID（4 条，期望 404 + 特征文本）---');
  const dynInvalid = [];
  for (const r of DYNAMIC_INVALID) {
    const url = args.base + r.path;
    const { status, text, error } = await probe(url);
    let verdict;
    if (status === 404 && typeof text === 'string' && text.includes(NOTFOUND_MARKER)) {
      verdict = '正确 404';
    } else if (status === 404) {
      verdict = '404 但非 404 页（疑似空白/错误页）';
    } else if (status === 200) {
      verdict = '错误：应 404 却返回 200';
    } else if (status === 0) {
      verdict = `连接失败(${error})`;
    } else {
      verdict = `异常(${status})`;
    }
    dynInvalid.push({ path: r.path, status, verdict });
    console.log(`  [${verdict}] ${status}  ${r.path}`);
  }

  // 4) 站内链接爬取（从首页出发）
  console.log();
  console.log('--- 站内链接爬取 ---');
  const visited = new Set();
  const queue = [args.base];
  const broken = [];
  let pages = 0, links = 0;
  while (queue.length) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    const { status, text, error } = await probe(url);
    if (status !== 200) { broken.push({ url, status, error: error || '' }); continue; }
    pages++;
    const attrRe = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = attrRe.exec(text)) !== null) {
      let href = m[1];
      if (!href || href.startsWith('#') || /^(data:|mailto:|tel:)/i.test(href)) continue;
      let abs;
      try { abs = new URL(href, url).href; } catch { continue; }
      if (new URL(abs).origin !== new URL(args.base).origin) continue;
      links++;
      if (!visited.has(abs) && abs.startsWith(args.base)) queue.push(abs);
    }
  }
  console.log(`  已访问 ${pages} 页，发现站内链接 ${links} 条`);
  if (broken.length) {
    console.log('  断链：');
    for (const b of broken) console.log(`    ${b.status}  ${b.url}${b.error ? '  (' + b.error + ')' : ''}`);
  } else {
    console.log('  断链：0');
  }

  // 5) 结论
  console.log();
  const okFixed = fixed.filter((r) => r.status === 200).length;
  const okDynValid = dynValid.filter((r) => r.status === 200).length;
  const okInvalid = dynInvalid.filter((r) => r.verdict === '正确 404').length;
  const abnormal = [...fixed, ...dynValid].filter((r) => r.status !== 200 && r.status !== 404).length;
  const badInvalid = dynInvalid.length - okInvalid;

  const summary = [
    `固定路由 ${okFixed}/${STATIC_ROUTES.length}`,
    `动态有效 ID ${okDynValid}/${DYNAMIC_VALID.length}`,
    `无效 ID 正确 404 ${okInvalid}/${DYNAMIC_INVALID.length}`,
    `断链 ${broken.length} 条`,
  ];
  let exit = 0;
  if (broken.length > 0) { summary.push('存在断链'); exit = 1; }
  if (abnormal > 0) { summary.push('存在异常状态码'); exit = 1; }
  if (badInvalid > 0) { summary.push('存在无效 ID 未正确 404'); exit = 1; }
  if (args.strict) {
    const allOk = okFixed === STATIC_ROUTES.length && okDynValid === DYNAMIC_VALID.length && badInvalid === 0;
    if (!allOk) { summary.push('strict：门禁不通过'); exit = 1; }
  }
  console.log('结论：', summary.join('；'));

  const out = { base: args.base, strict: args.strict, fixed, dynValid, dynInvalid, broken, summary, exitCode: exit };
  const dir = resolve(__dirname, '..', 'baseline');
  writeFileSync(resolve(dir, 'link-check.latest.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('已写：', resolve(dir, 'link-check.latest.json'));
  process.exit(exit);
}

main().catch((e) => { console.error(e); process.exit(2); });
