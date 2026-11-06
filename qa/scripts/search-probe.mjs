#!/usr/bin/env node
/**
 * search-probe.mjs — A5 独立 QA：真实关键词命中与跳转（M3）
 *
 * 验证 Pagefind 全文搜索：给定 N 个「真实关键词」，在部署/预览站点上
 * 执行搜索，断言每个关键词命中 ≥1 条且结果可跳转到正确详情页。
 *
 * 前置条件：
 *   1. T4.2 落地 —— dist/pagefind/ 存在（Pagefind UI 挂载于 /search/）；
 *   2. T2.2 落地 —— 存在 published 的真实内容可被索引。
 * 任一前置缺失 → BLOCKED（exit 2），不判 PASS。
 *
 * 关键词由调用方通过 --keywords 传入（逗号分隔）。Pagefind 是客户端库，
 * 无法用纯 HTTP 直接模拟搜索，故本脚本在 T4.2 落地前只能做前置探测；
 * 落地后需借助浏览器（参考 layout-check.mjs 的 CDP 通道）驱动真实搜索。
 *
 * 用法：
 *   node qa/scripts/search-probe.mjs --base http://localhost:4321/141/ \
 *        --keywords "git,rebase,schema,复盘,错误"
 *
 * 依赖：Node 22。只读站点。
 */

import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { base: 'http://localhost:4321/141/', keywords: 'git,rebase,schema,复盘,错误' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') a.base = argv[++i];
    else if (argv[i] === '--keywords') a.keywords = argv[++i];
  }
  a.base = a.base.replace(/\/+$/, '') + '/';
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dist = resolve(__dirname, '..', '..', 'dist');
  const pfPath = join(dist, 'pagefind');
  const keywords = args.keywords.split(',').map((s) => s.trim()).filter(Boolean);

  console.log('== A5 search-probe（关键词命中，M3）==');
  console.log('base:', args.base, '| keywords:', keywords.join(', '));

  const blocked = [];
  if (!existsSync(pfPath) || readdirSync(pfPath).length === 0) {
    blocked.push('dist/pagefind/ 不存在或为空（T4.2 未落地，搜索索引未生成）');
  }
  const cjPath = join(dist, 'data', 'content.json');
  if (!existsSync(cjPath)) {
    blocked.push('dist/data/content.json 不存在（无已发布内容可索引）');
  }

  if (blocked.length) {
    console.log();
    for (const b of blocked) console.log('  [BLOCKED]', b);
    console.log();
    console.log('结论：BLOCKED —— 搜索链路未实现，关键词命中无法判定（不判 PASS）');
    const out = { base: args.base, keywords, blocked, results: [], conclusion: 'BLOCKED', exitCode: 2 };
    const dir = resolve(__dirname, '..', 'baseline');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'search-probe.latest.json'), JSON.stringify(out, null, 2) + '\n');
    process.exit(2);
  }

  // T4.2 落地后：驱动浏览器在 /search/ 对每个关键词执行真实搜索（此处保留占位，等待落地）
  console.log();
  console.log('结论：PASS 待实现（T4.2 落地后用浏览器驱动真实搜索）');
  process.exit(2);
}

main();
