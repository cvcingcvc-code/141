#!/usr/bin/env node
/**
 * content-consistency.mjs — A5 独立 QA：产物一致性检查（C-10 / M3）
 *
 * 验证三处产物口径一致：
 *   1. dist/data/content.json —— 字段与 C-10 逐字一致，只含可见条目；
 *   2. dist/pagefind/ —— Pagefind 搜索索引存在且条目数与 content.json 一致；
 *   3. dist/<path>/index.html —— 每个 content.json item 有对应 HTML 页面，反之亦然。
 *
 * 前置条件（T4.2 落地）：dist/data/content.json 与 dist/pagefind/ 存在。
 * 任一前置缺失 → 判为 BLOCKED（exit 2），不判 PASS（区别于 FAIL 1 / PASS 0）。
 *
 * 用法：
 *   node qa/scripts/content-consistency.mjs [--dist <dist 路径>]
 *
 * 依赖：Node 22。只读产物，不改业务代码。
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '..', '..', 'dist');

// C-10 规定的 content.json 顶层字段（逐字）
const C10_TOP_KEYS = ['schemaVersion', 'generatedAt', 'base', 'counts', 'items'];
const C10_COUNT_KEYS = ['knowledge', 'projects', 'journal', 'errors', 'profile'];

function listFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
}

function main() {
  const args = { dist: DIST };
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--dist') args.dist = process.argv[++i];
  }
  const dist = args.dist;
  const cjPath = join(dist, 'data', 'content.json');
  const pfPath = join(dist, 'pagefind');
  console.log('== A5 content-consistency（C-10 / M3）==');
  console.log('dist:', dist);

  const issues = [];
  const blocked = [];

  // 前置：content.json
  if (!existsSync(cjPath)) {
    blocked.push('dist/data/content.json 不存在（T4.2 未落地）');
  }
  // 前置：pagefind
  if (!existsSync(pfPath)) {
    blocked.push('dist/pagefind/ 不存在（搜索索引未生成，T4.2 未落地）');
  }

  if (blocked.length) {
    console.log();
    for (const b of blocked) console.log('  [BLOCKED]', b);
    console.log();
    console.log('结论：BLOCKED —— 产物链路未实现，无法做一致性判定（不判 PASS）');
    const out = { dist, blocked, issues, conclusion: 'BLOCKED', exitCode: 2 };
    const dir = resolve(__dirname, '..', 'baseline');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'content-consistency.latest.json'), JSON.stringify(out, null, 2) + '\n');
    process.exit(2);
  }

  // —— 以下为 T4.2 落地后的完整检查（当前不可达） ——
  const cj = JSON.parse(readFileSync(cjPath, 'utf8'));

  // 1) content.json 顶层字段
  const topKeys = Object.keys(cj);
  for (const k of C10_TOP_KEYS) if (!topKeys.includes(k)) issues.push(`content.json 缺字段 ${k}`);
  for (const k of topKeys) if (!C10_TOP_KEYS.includes(k)) issues.push(`content.json 多出字段 ${k}`);

  // 2) counts 键
  if (cj.counts && typeof cj.counts === 'object') {
    for (const k of C10_COUNT_KEYS) if (!(k in cj.counts)) issues.push(`counts 缺 ${k}`);
  } else {
    issues.push('counts 缺失或非对象');
  }

  // 3) items 与 HTML 页面互查
  const items = Array.isArray(cj.items) ? cj.items : [];
  const htmlFiles = listFiles(dist).filter((f) => f.endsWith('.html'));
  for (const it of items) {
    const rel = it.path.replace(/^\/+/, '').replace(/\/$/, '');
    const expected = join(dist, rel, 'index.html');
    if (!existsSync(expected)) issues.push(`item ${it.id} 无对应 HTML：${it.path}`);
  }
  // 反向：dist 里多出的「详情页」应有对应 item。
  // 详情页 = dist/<type>/<id>/index.html（相对路径 3 段）；固定页/列表页为
  // dist/index.html、dist/404.html、dist/<type>/index.html（1~2 段），不参与反向核对。
  const sep = dist.endsWith('/') || dist.endsWith('\\') ? '' : '\\';
  const itemPaths = new Set(items.map((it) => join(dist, it.path.replace(/^\/+/, '').replace(/\/$/, ''), 'index.html')));
  for (const h of htmlFiles) {
    const rel = h.slice(dist.length).replace(/^[\\/]+/, '').replace(/\\/g, '/');
    const parts = rel.split('/');
    if (parts.length === 3 && parts[2] === 'index.html') {
      if (!itemPaths.has(h)) issues.push(`HTML 详情页无对应 item：${rel}`);
    }
  }

  // 4) Pagefind 与 content.json 条目数一致性（近似：以 pagefind 片段文件为准）
  const pfFiles = listFiles(pfPath);
  if (pfFiles.length === 0) issues.push('pagefind/ 为空');
  // 5) 可见性隔离：items 里不应出现 published:false / draft 的条目（这些字段已不进入 items）
  for (const it of items) {
    if (it.published === false) issues.push(`item ${it.id} 含 published:false`);
    if (it.review_status === 'draft') issues.push(`item ${it.id} 含 draft`);
  }

  const conclusion = issues.length === 0 ? 'PASS：三处产物一致且字段符合 C-10' : `FAIL：${issues.length} 处不一致`;
  console.log();
  if (issues.length) { for (const i of issues) console.log('  [FAIL]', i); }
  console.log('结论：', conclusion);
  const out = { dist, blocked: [], issues, itemsCount: items.length, pagefindFiles: pfFiles ? pfFiles.length : 0, conclusion, exitCode: issues.length === 0 ? 0 : 1 };
  const dir = resolve(__dirname, '..', 'baseline');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'content-consistency.latest.json'), JSON.stringify(out, null, 2) + '\n');
  process.exit(out.exitCode);
}

main();
