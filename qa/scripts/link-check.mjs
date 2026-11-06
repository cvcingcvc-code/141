#!/usr/bin/env node
/**
 * link-check.mjs — A5 独立 QA：站内链接 + C-9 路由契约探测
 *
 * 用法（不经 package.json，见 CONTRACTS C-11）：
 *   node qa/scripts/link-check.mjs [--base http://localhost:4321/141/] [--strict]
 *
 * 行为：
 *   1. 逐条探测 C-9 的 12 条路由，输出状态矩阵：
 *        200 → 可访问；404 → 未实现/待测试；其他 → 异常。
 *   2. 对可达页面抓取站内链接（<a>/<img>/<link>/<script>），递归检查，
 *      输出断链清单。
 *   3. 退出码：
 *        默认：0（存在断链或异常码时退 1）。
 *        --strict：额外要求 12 条路由全部 200，否则退 1（供 M2 门禁用）。
 *
 * 依赖：Node 22（全局 fetch，零 npm 依赖）。
 * 注意：本脚本只读站点、不改业务代码；未实现路由如实标注，不伪装通过。
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { base: 'http://localhost:4321/141/', strict: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--strict') args.strict = true;
  }
  // 规范化：base 以 / 结尾
  args.base = args.base.replace(/\/+$/, '') + '/';
  return args;
}

/**
 * C-9 契约的 12 条路由（v0.1）。动态路由用契约示例 id 占位。
 * 字段：path（相对 base）、desc（页面说明）。
 */
const CONTRACT_ROUTES = [
  { path: '', desc: '首页（profile + 最近 3 条 journal + 最近 3 条 knowledge）' },
  { path: 'about/', desc: '个人介绍' },
  { path: 'knowledge/', desc: '知识列表' },
  { path: 'knowledge/kb-eng-001/', desc: '知识详情（示例 id KB-ENG-001）' },
  { path: 'projects/', desc: '项目列表' },
  { path: 'projects/pj-141/', desc: '项目详情 + 关联条目纯文本链接（示例 id PJ-141）' },
  { path: 'journal/', desc: '复盘列表（日期倒序，仅 approved）' },
  { path: 'journal/2026-11-06/', desc: '复盘详情（示例日期 2026-11-06）' },
  { path: 'errors/', desc: '错误经验列表' },
  { path: 'errors/er-20261106-01/', desc: '错误详情（示例 id ER-20261106-01）' },
  { path: 'search/', desc: '全文搜索（Pagefind）' },
  { path: '404.html', desc: '未找到页（GitHub Pages 固定文件名）' },
];

async function probe(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return { status: res.status };
  } catch (e) {
    return { status: 0, error: String(e.cause?.code || e.message) };
  }
}

/** 从 HTML 提取站内链接，返回规范化后的绝对 URL 集合。 */
function extractLinks(html, baseUrl) {
  const links = new Set();
  const attrRe = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    let href = m[1];
    if (!href || href.startsWith('#')) continue; // 锚点 / 空
    if (href.startsWith('data:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (/^https?:\/\//i.test(href)) {
      // 只关心站内：host 与 base 一致
      try {
        if (new URL(href).origin !== new URL(baseUrl).origin) continue;
      } catch { continue; }
      links.add(href);
    } else {
      links.add(new URL(href, baseUrl).href);
    }
  }
  return links;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base;
  console.log('== A5 link-check ==');
  console.log('base:', base, args.strict ? '(strict)' : '');
  console.log();

  // 1) 路由矩阵
  console.log('--- C-9 路由契约探测（12 条）---');
  const routeResults = [];
  for (const r of CONTRACT_ROUTES) {
    const url = new URL(r.path, base).href;
    const { status, error } = await probe(url);
    let verdict;
    if (status === 200) verdict = '可访问';
    else if (status === 404) verdict = '未实现/待测试';
    else if (status === 0) verdict = `连接失败(${error})`;
    else verdict = `异常(${status})`;
    routeResults.push({ path: r.path, status, verdict, desc: r.desc });
    console.log(`  [${verdict}] ${status}  ${r.path || '(首页)'}  — ${r.desc}`);
  }

  // 2) 站内链接爬取（仅从 200 页面出发）
  console.log();
  console.log('--- 站内链接爬取 ---');
  const visited = new Set();
  const queue = [new URL('', base).href]; // 首页
  const broken = [];
  const okCount = { pages: 0, links: 0 };

  while (queue.length) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    const { status, error } = await probe(url);
    if (status !== 200) {
      broken.push({ url, status, error: error || '' });
      continue;
    }
    okCount.pages++;
    const html = await (await fetch(url)).text();
    for (const link of extractLinks(html, base)) {
      okCount.links++;
      if (!visited.has(link) && link.startsWith(base)) queue.push(link);
    }
  }
  console.log(`  已访问页面 ${okCount.pages} 个，发现站内链接 ${okCount.links} 条`);
  if (broken.length) {
    console.log('  断链：');
    for (const b of broken) console.log(`    ${b.status}  ${b.url}${b.error ? '  (' + b.error + ')' : ''}`);
  } else {
    console.log('  断链：0');
  }

  // 3) 结论与退出码
  console.log();
  const okRoutes = routeResults.filter((r) => r.status === 200).length;
  const implRoutes = routeResults.filter((r) => r.status === 200 || r.status === 404).length;
  const abnormalRoutes = routeResults.length - implRoutes;
  const summary = [];
  summary.push(`可达路由 ${okRoutes}/12；未实现 ${routeResults.length - okRoutes - abnormalRoutes}/12；异常 ${abnormalRoutes}/12`);
  summary.push(`断链 ${broken.length} 条`);

  let exit = 0;
  if (broken.length > 0) { summary.push('存在断链'); exit = 1; }
  if (abnormalRoutes > 0) { summary.push('存在异常状态码'); exit = 1; }
  if (args.strict && okRoutes !== 12) { summary.push('strict：未达 12/12，门禁不通过'); exit = 1; }
  console.log('结论：', summary.join('；'));

  // 输出 JSON 供后续 CI/报告消费
  const out = {
    base,
    strict: args.strict,
    routeMatrix: routeResults,
    brokenLinks: broken,
    summary,
    exitCode: exit,
  };
  execFileSync('mkdir', ['-p', resolve(__dirname, '..', 'baseline')]);
  const jsonPath = resolve(__dirname, '..', 'baseline', 'link-check.latest.json');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(jsonPath, JSON.stringify(out, null, 2) + '\n');
  console.log('已写：', jsonPath);
  process.exit(exit);
}

main().catch((e) => { console.error(e); process.exit(2); });
