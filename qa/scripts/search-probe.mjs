#!/usr/bin/env node
/**
 * search-probe.mjs — A5 独立 QA：真实关键词命中与跳转（M3 / T5.2）
 *
 * 用系统 Chrome 的 DevTools 协议驱动真实 Pagefind 搜索：
 *   1. 打开 /search/?q=<关键词>（SearchBox 支持 ?q= 直接查询）；
 *   2. 等待 Pagefind 异步加载 + 结果渲染；
 *   3. 读取结果链接（href + 标题），断言每个关键词命中 ≥1 条；
 *   4. 对首个结果用 fetch 验证目标页 200（跳转可达）。
 *
 * 关键词与期望目标由 --keywords / --expect 传入，格式：
 *   --keywords "鲸落九百零一,鲸落九百零二,..."
 *   --expect   "/knowledge/kb-eng-901/,/projects/pj-e2e/,..."
 *   （第 N 个关键词对应第 N 个期望路径；用 * 表示"不校验具体路径，只要 ≥1 命中"）
 *
 * 用法：
 *   node qa/scripts/search-probe.mjs --base http://localhost:4321/141/ \
 *        --keywords "鲸落九百零一,鲸落九百零二" --expect "/knowledge/kb-eng-901/,/projects/pj-e2e/"
 *
 * 依赖：Node 22（fetch + WebSocket）+ 系统 Chrome/Edge。只读站点。
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

function parseArgs(argv) {
  const a = {
    base: 'http://localhost:4321/141/',
    keywords: ['鲸落九百零一', '鲸落九百零二', '鲸落九百零三', '鲸落九百零四', '探针'],
    expect: ['/knowledge/kb-eng-901/', '/projects/pj-e2e/', '/journal/2026-11-05/', '/errors/er-20261105-99/', '*'],
    chrome: CHROME_CANDIDATES.find((p) => existsSync(p)) || null,
    port: 9223,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') a.base = argv[++i];
    else if (argv[i] === '--keywords') a.keywords = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === '--expect') a.expect = argv[++i].split(',').map((s) => s.trim());
    else if (argv[i] === '--chrome') a.chrome = argv[++i];
    else if (argv[i] === '--port') a.port = Number(argv[++i]);
  }
  a.base = a.base.replace(/\/+$/, '') + '/';
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDebugger(port) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(200);
  }
  throw new Error('Chrome DevTools 未就绪（端口 ' + port + '）');
}

class CDPSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      }
    });
  }
  async open() {
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', rej, { once: true });
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function newPage(port, url) {
  const r = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return await r.json();
}

/** 打开搜索页，等待结果渲染，返回 { status, links: [{href,title}] } */
async function runSearch(port, searchUrl) {
  const page = await newPage(port, searchUrl);
  const cdp = new CDPSession(page.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: searchUrl });
  // 轮询结果：等待 status 文本变为「找到 / 没有找到」，最多 8s
  let status = '';
  for (let i = 0; i < 40; i++) {
    await sleep(200);
    const r = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const s = document.querySelector('[data-search-status]');
        const status = s ? s.textContent : '';
        const items = Array.from(document.querySelectorAll('[data-search-results] a'));
        return { status, links: items.map(a => ({ href: a.getAttribute('href'), title: a.textContent })) };
      })()`,
    });
    const v = r.result.value;
    if (v.status && (v.status.includes('找到') || v.status.includes('没有找到'))) {
      status = v.status;
      cdp.close();
      try { await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`); } catch {}
      return { status, links: v.links };
    }
    status = v.status;
  }
  cdp.close();
  try { await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`); } catch {}
  return { status, links: [] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.chrome) { console.error('未找到 Chrome/Edge，请用 --chrome 指定'); process.exit(2); }
  console.log('== A5 search-probe（真实关键词命中与跳转）==');
  console.log('base:', args.base, '| chrome:', args.chrome);
  console.log();

  const chrome = spawn(args.chrome, [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + args.port,
    '--user-data-dir=' + join(tmpdir(), 'a5-qa-chrome-' + Date.now()),
    '--no-first-run', '--no-default-browser-check', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForDebugger(args.port);
    const results = [];
    for (let i = 0; i < args.keywords.length; i++) {
      const kw = args.keywords[i];
      const exp = args.expect[i] || '*';
      const searchUrl = args.base + 'search/?q=' + encodeURIComponent(kw);
      const { status, links } = await runSearch(args.port, searchUrl);

      const hit = links.length > 0;
      let firstHref = links[0] ? links[0].href : null;
      let firstOk = null;
      if (firstHref) {
        try {
          // Pagefind 返回的 url 是相对路径（如 /141/xxx/），须以 base 解析为绝对 URL
          let abs = new URL(firstHref, args.base).href;
          if (new URL(abs).hostname === 'localhost') abs = abs.replace('://localhost', '://[::1]');
          const r = await fetch(abs);
          firstOk = r.status === 200;
        } catch { firstOk = false; }
      }
      const expectMatch = exp === '*' ? hit : (firstHref || '').includes(exp);
      const pass = hit && expectMatch && (firstOk === true);

      results.push({ keyword: kw, expect: exp, hit, firstHref, firstOk, expectMatch, status, pass });
      const mark = pass ? 'PASS' : 'FAIL';
      console.log(`  [${mark}] 「${kw}」 命中 ${links.length} 条 → 首个 ${firstHref || '(无)'}（可达 ${firstOk}，期望 ${exp}）`);
      if (!pass && links.length === 0) console.log(`        状态：${status}`);
    }

    const passN = results.filter((r) => r.pass).length;
    const conclusion = `${passN}/${results.length} 关键词命中并跳转正确`;
    console.log();
    console.log('结论：', conclusion);
    const out = { base: args.base, results, conclusion, exitCode: passN === results.length ? 0 : 1 };
    const dir = resolve(__dirname, '..', 'baseline');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'search-probe.latest.json'), JSON.stringify(out, null, 2) + '\n');
    process.exit(out.exitCode);
  } finally {
    chrome.kill();
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
