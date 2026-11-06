#!/usr/bin/env node
/**
 * data-isolation.mjs — A5 独立 QA：已发布 / 未发布 / 草稿数据隔离（P0-1 / C-10 / M3）
 *
 * 把 content/ 下的条目按发布状态分成三类，并交叉验证构建产物是否泄漏：
 *   1. 真实发布内容：published=true 且（journal）review_status=approved 且 published_by 为人工；
 *   2. 未授权数据：published=false 或 review_status=draft（不得进站点/索引/content.json）；
 *   3. 隔离测试内容：sample=true（示例条目，站点必须标注「示例」徽章）。
 *
 * 隔离判定（产物侧）：
 *   - 真实发布内容 → dist 应有对应 HTML；
 *   - 未授权数据 → dist 中 grep 不到其 id 与 title（0 泄漏）。
 *
 * 注意：本脚本只做「产物是否泄漏」的事实核查；「过滤逻辑是否生效」属于
 *       collections.ts 单测（src/content/__tests__）与 T3.2 页面接入后的回归范畴。
 *       当前若页面未接入内容（T3.2 未落地），隔离是「因未实现而成立」，记为 BLOCKED，
 *       不判 PASS —— 与 link-check 对无效 ID 的处理口径一致。
 *
 * 用法：node qa/scripts/data-isolation.mjs [--dist <dist>] [--content <content>]
 * 退出码：0 无泄漏；1 有泄漏；2 BLOCKED（无法判定）。
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const a = { dist: join(ROOT, 'dist'), content: join(ROOT, 'content') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dist') a.dist = argv[++i];
    else if (argv[i] === '--content') a.content = argv[++i];
  }
  return a;
}

function listMd(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listMd(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  for (const key of ['id', 'type', 'published', 'sample', 'review_status', 'published_by', 'title']) {
    const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
    const mm = m[1].match(re);
    if (mm) {
      let v = mm[1].trim();
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (v === 'null' || v === '~') v = null;
      else if (/^["'].*["']$/.test(v)) v = v.slice(1, -1);
      fm[key] = v;
    }
  }
  return fm;
}

const HUMAN_ACTORS = ['user'];
function isHuman(v) { return v == null ? false : HUMAN_ACTORS.includes(String(v)); }

function classify(fm) {
  const sample = fm.sample === true;
  const published = fm.published === true && isHuman(fm.published_by);
  const journalVisible = fm.type === 'journal' ? fm.review_status === 'approved' : true;
  const visible = published && journalVisible;
  if (visible) return 'published';           // 真实发布内容
  if (sample) return 'sample';               // 隔离测试内容（示例）
  return 'hidden';                            // 未授权数据（不发布）
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('== A5 data-isolation（已发布/未发布/草稿隔离）==');
  console.log('content:', args.content, '| dist:', args.dist);

  const files = listMd(args.content);
  const entries = [];
  for (const f of files) {
    const fm = frontmatter(readFileSync(f, 'utf8'));
    if (!fm.id) continue;
    entries.push({ file: relative(args.content, f).replace(/\\/g, '/'), ...fm, category: classify(fm) });
  }

  const published = entries.filter((e) => e.category === 'published');
  const sample = entries.filter((e) => e.category === 'sample');
  const hidden = entries.filter((e) => e.category === 'hidden');

  console.log();
  console.log(`  真实发布内容：${published.length} 条`);
  console.log(`  隔离测试内容（sample）：${sample.length} 条`);
  console.log(`  未授权数据（published:false / draft）：${hidden.length} 条`);
  for (const e of sample) console.log(`    [sample] ${e.id}  ${e.file}`);
  for (const e of hidden) console.log(`    [hidden] ${e.id}  ${e.file}${e.type === 'journal' ? ` (review_status=${e.review_status})` : ''}`);

  // 产物泄漏核查：dist 全量文本里 grep 每个 hidden/sample 条目的 id 与 title
  const leaks = [];
  function grepDist(needle, kind) {
    if (!existsSync(args.dist)) return;
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(html|json|js|xml|txt)$/.test(name)) {
          const t = readFileSync(p, 'utf8');
          if (t.includes(needle)) leaks.push({ needle, kind, file: relative(args.dist, p).replace(/\\/g, '/') });
        }
      }
    };
    walk(args.dist);
  }

  for (const e of [...hidden, ...sample]) {
    grepDist(String(e.id), e.category);
    if (e.title) grepDist(String(e.title), e.category);
  }

  console.log();
  if (leaks.length) {
    console.log(`  泄漏：${leaks.length} 处未授权/示例内容出现在产物中`);
    for (const l of leaks) console.log(`    [泄漏] ${l.kind} "${l.needle}" → ${l.file}`);
  } else {
    console.log('  泄漏：0（产物中未发现未授权/示例内容的 id 或 title）');
  }

  // 判定
  const hasContentPages = existsSync(join(args.dist, 'knowledge')) || existsSync(join(args.dist, 'projects'));
  const hasContentJson = existsSync(join(args.dist, 'data', 'content.json'));
  const routeUnimplemented = !hasContentPages && !hasContentJson;

  let conclusion, exit;
  if (leaks.length > 0) {
    conclusion = `FAIL：${leaks.length} 处未授权内容泄漏到产物（P0-1）`;
    exit = 1;
  } else if (routeUnimplemented && (sample.length > 0 || hidden.length > 0)) {
    conclusion = 'BLOCKED：产物侧无泄漏，但内容路由/产物未实现（T3.2/T4.2 未落地），隔离是「因未实现而成立」，不判 PASS';
    exit = 2;
  } else if (published.length === 0) {
    conclusion = 'BLOCKED：无真实发布内容可验证「发布链路」；隔离逻辑待真实内容上线后回归';
    exit = 2;
  } else {
    conclusion = 'PASS：无泄漏，且发布/未发布隔离经产物验证';
    exit = 0;
  }

  console.log('结论：', conclusion);
  const out = { published, sample, hidden, leaks, conclusion, exitCode: exit };
  const dir = resolve(__dirname, '..', 'baseline');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'data-isolation.latest.json'), JSON.stringify(out, null, 2) + '\n');
  process.exit(exit);
}

main();
