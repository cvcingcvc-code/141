#!/usr/bin/env node
/**
 * link-check.mjs — A5 独立 QA：路由契约探测 + 已发布详情页动态核验 + 未发布隔离 + 站内链接爬取
 *
 * 检查维度：
 *   1. 固定路由（8 条，C-9）：全部返回 HTTP 200。
 *   2. 动态有效路由（已发布详情页）：请求 ${base}data/content.json 动态加载全部已发布详情条目，
 *      逐条验证返回 HTTP 200。
 *   3. 未发布 sample 路由隔离（4 条）：验证仓库内 sample:true 未发布条目在线上/产物中返回正确 404。
 *   4. 动态路由无效 ID（4 条）：期望 HTTP 404 且正文含自定义 404 特征文本，区分正确 404 与空白错误页。
 *   5. 全站站内链接爬取：从首页出发爬取站内 href/src，断言 0 断链。
 *   6. 对 localhost 目标自动 fallback 到 IPv6 [::1]（Astro preview 只监听 ::1）。
 *
 * 用法（不经 package.json，见 CONTRACTS C-11）：
 *   node qa/scripts/link-check.mjs [--base http://localhost:4321/personal-knowledge-os/] [--strict]
 *
 * 退出码：默认模式下，断链>0、异常状态码、未发布泄漏(200)或无效 ID 未正确 404 → 1。
 *         --strict 额外要求：固定路由全部 200、content.json 可达且已发布动态详情页(>0)全部 200、
 *         四类动态路由（knowledge/project/journal/error）至少各 1 条可见、未发布隔离与无效 ID 全部正确 404。
 *
 * 依赖：Node 22（全局 fetch，零 npm 依赖）。只读站点，不伪装通过。
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { base: 'http://localhost:4321/personal-knowledge-os/', strict: false };
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

/** 未发布 sample 条目路由（期望不在 content.json 中且访问返回正确 404，验证未批准内容隔离） */
const UNPUBLISHED_SAMPLE_ROUTES = [
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
  if (status === 404) return '未实现/未发布(404)';
  if (status === 0) return '连接失败';
  return `异常(${status})`;
}

function classifyExpected404(status, text, error, labelOk = '正确 404') {
  if (status === 404 && typeof text === 'string' && text.includes(NOTFOUND_MARKER)) {
    return labelOk;
  }
  if (status === 404) return '404 但非自定义 404 页（疑似空白/默认错误页）';
  if (status === 200) return '错误：应 404 却返回 200（泄漏/误放行）';
  if (status === 0) return `连接失败(${error})`;
  return `异常(${status})`;
}

async function loadPublishedDynamicRoutes(base) {
  const cjUrl = base + 'data/content.json';
  const { status, text, error } = await probe(cjUrl);
  if (status !== 200) {
    return { ok: false, status, error: error || `HTTP ${status}`, items: [], routes: [] };
  }
  try {
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const routes = items
      .filter((it) => it.type !== 'profile' && typeof it.path === 'string')
      .map((it) => ({
        path: it.path.replace(/^\/+/, ''),
        type: it.type,
        id: it.id,
      }));
    return { ok: true, status: 200, items, routes };
  } catch (e) {
    return { ok: false, status, error: `JSON 解析失败: ${e.message}`, items: [], routes: [] };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('== A5 link-check（路由契约 + 动态详情 + 未发布隔离 + 站内爬虫）==');
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

  // 2) 动态路由：从 data/content.json 读取全部已发布详情页
  console.log();
  const cjInfo = await loadPublishedDynamicRoutes(args.base);
  console.log(`--- 动态路由：已发布详情页（来自 data/content.json，共 ${cjInfo.routes.length} 条）---`);
  if (!cjInfo.ok) {
    console.log(`  [异常] 无法读取 data/content.json：${cjInfo.error}`);
  } else if (cjInfo.routes.length === 0) {
    console.log('  (当前 data/content.json 无已发布非 profile 动态详情条目)');
  }
  const dynValid = [];
  for (const r of cjInfo.routes) {
    const url = args.base + r.path;
    const { status, error } = await probe(url);
    const v = verdictOf(status);
    dynValid.push({ path: r.path, id: r.id, type: r.type, status, verdict: v });
    console.log(`  [${v}] ${status}  ${r.path}  (${r.id}, ${r.type})${status === 0 ? '  (' + error + ')' : ''}`);
  }

  // 3) 未发布 sample 路由隔离（期望 404 + 自定义 404 页）
  console.log();
  console.log(`--- 未发布 sample 路由隔离（${UNPUBLISHED_SAMPLE_ROUTES.length} 条，期望 404 隔离）---`);
  const publishedIds = new Set(cjInfo.items.map((it) => it.id));
  const sampleIsolation = [];
  for (const r of UNPUBLISHED_SAMPLE_ROUTES) {
    if (publishedIds.has(r.id)) {
      sampleIsolation.push({ path: r.path, id: r.id, status: 200, verdict: '已在 content.json 显式发布（跳过未发布断言）', skipped: true });
      console.log(`  [跳过] ${r.path} (${r.id}) 已在 content.json 中显式发布`);
      continue;
    }
    const url = args.base + r.path;
    const { status, text, error } = await probe(url);
    const verdict = classifyExpected404(status, text, error, '已隔离(正确 404)');
    sampleIsolation.push({ path: r.path, id: r.id, status, verdict });
    console.log(`  [${verdict}] ${status}  ${r.path}  (${r.id})`);
  }

  // 4) 动态路由：无效 ID（期望 404 + 特征文本）
  console.log();
  console.log('--- 动态路由：无效 ID（4 条，期望 404 + 特征文本）---');
  const dynInvalid = [];
  for (const r of DYNAMIC_INVALID) {
    const url = args.base + r.path;
    const { status, text, error } = await probe(url);
    const verdict = classifyExpected404(status, text, error, '正确 404');
    dynInvalid.push({ path: r.path, status, verdict });
    console.log(`  [${verdict}] ${status}  ${r.path}`);
  }

  // 5) 站内链接爬取（从首页出发）
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
      // 跳过静态构建的资源脚本/样式或仅爬取 HTML/站内路径？保持原逻辑探测全部同前缀 URL
      links++;
      if (!visited.has(abs) && abs.startsWith(args.base)) queue.push(abs);
    }
  }
  console.log(`  已访问 ${pages} 个站内资源/页面，发现站内链接引用 ${links} 条`);
  if (broken.length) {
    console.log('  断链：');
    for (const b of broken) console.log(`    ${b.status}  ${b.url}${b.error ? '  (' + b.error + ')' : ''}`);
  } else {
    console.log('  断链：0');
  }

  // 6) 结论
  console.log();
  const okFixed = fixed.filter((r) => r.status === 200).length;
  const okDynValid = dynValid.filter((r) => r.status === 200).length;
  const activeSamples = sampleIsolation.filter((r) => !r.skipped);
  const okSampleIso = activeSamples.filter((r) => r.verdict === '已隔离(正确 404)').length;
  const okInvalid = dynInvalid.filter((r) => r.verdict === '正确 404').length;
  const abnormal = [...fixed, ...dynValid].filter((r) => r.status !== 200 && r.status !== 404).length;
  const badSampleIso = activeSamples.length - okSampleIso;
  const badInvalid = dynInvalid.length - okInvalid;

  const summary = [
    `固定路由 ${okFixed}/${STATIC_ROUTES.length}`,
    `已发布动态详情 ${okDynValid}/${dynValid.length}`,
    `未发布 sample 隔离 ${okSampleIso}/${activeSamples.length}`,
    `无效 ID 正确 404 ${okInvalid}/${DYNAMIC_INVALID.length}`,
    `断链 ${broken.length} 条`,
  ];
  let exit = 0;
  if (!cjInfo.ok) { summary.push('content.json 读取失败'); exit = 1; }
  if (broken.length > 0) { summary.push('存在断链'); exit = 1; }
  if (abnormal > 0) { summary.push('存在异常状态码'); exit = 1; }
  if (okDynValid !== dynValid.length) { summary.push('存在已发布详情页非 200'); exit = 1; }
  if (badSampleIso > 0) { summary.push('存在未发布 sample 路由未正确 404 隔离'); exit = 1; }
  if (badInvalid > 0) { summary.push('存在无效 ID 未正确 404'); exit = 1; }
  if (args.strict) {
    const coveredTypes = new Set(dynValid.filter((r) => r.status === 200).map((r) => r.type));
    const requiredTypes = ['knowledge', 'project', 'journal', 'error'];
    const missingTypes = requiredTypes.filter((t) => !coveredTypes.has(t));
    const allOk =
      cjInfo.ok &&
      okFixed === STATIC_ROUTES.length &&
      dynValid.length > 0 &&
      okDynValid === dynValid.length &&
      missingTypes.length === 0 &&
      badSampleIso === 0 &&
      badInvalid === 0 &&
      broken.length === 0;
    if (!allOk) {
      summary.push(`strict：门禁不通过${missingTypes.length ? '(缺动态路由类型:' + missingTypes.join(',') + ')' : ''}`);
      exit = 1;
    }
  }
  console.log('结论：', summary.join('；'));

  const out = {
    base: args.base,
    strict: args.strict,
    fixed,
    dynValid,
    sampleIsolation,
    dynInvalid,
    crawledCount: pages,
    linksCount: links,
    broken,
    summary,
    exitCode: exit,
  };
  const dir = resolve(__dirname, '..', 'baseline');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'link-check.latest.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('已写：', resolve(dir, 'link-check.latest.json'));
  process.exitCode = exit;
}

main().catch((e) => { console.error(e); process.exitCode = 2; });
