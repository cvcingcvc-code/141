#!/usr/bin/env node
/**
 * layout-check.mjs — A5 独立 QA：多视口布局检查（360 / 768 / 1280）
 *
 * 通过系统 Chrome 的 DevTools 协议实测：打开页面 → 设视口 → 读 scrollWidth。
 * 判定「横向滚动」的唯一依据是 `document.documentElement.scrollWidth > clientWidth`，
 * 不是「看起来没问题」。同时抓取 title / h1 作为页面可读性证据。
 *
 * 用法：
 *   node qa/scripts/layout-check.mjs [--base http://localhost:4321/141/]
 *                                   [--urls /,/404.html] [--views 360,768,1280]
 *                                   [--chrome <chrome 可执行路径>]
 *
 * 依赖：Node 22（全局 fetch + WebSocket）+ 系统 Chrome/Edge。只读站点。
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
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
    urls: ['/', '/404.html'],
    views: [360, 768, 1280],
    chrome: CHROME_CANDIDATES.find((p) => existsSync(p)) || null,
    port: 9222,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') a.base = argv[++i];
    else if (argv[i] === '--urls') a.urls = argv[++i].split(',');
    else if (argv[i] === '--views') a.views = argv[++i].split(',').map(Number);
    else if (argv[i] === '--chrome') a.chrome = argv[++i];
    else if (argv[i] === '--port') a.port = Number(argv[++i]);
  }
  a.base = a.base.replace(/\/+$/, '') + '/';
  return a;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForDebugger(port) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch { /* not ready */ }
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
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    });
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function newPage(basePort, url) {
  // 新版 Chrome 用 PUT /json/new
  const res = await fetch(`http://127.0.0.1:${basePort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return await res.json();
}

async function measure(port, url, width) {
  const page = await newPage(port, url);
  const cdp = new CDPSession(page.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url });
  await sleep(700); // 等待静态页渲染（无 JS 依赖，宽裕）
  const r = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const el = document.documentElement;
      return {
        title: document.title,
        h1: (document.querySelector('h1')||{}).textContent || null,
        innerWidth: window.innerWidth,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        hasHorizontalScroll: el.scrollWidth > el.clientWidth,
      };
    })()`,
  });
  cdp.close();
  // 关闭该 tab（尽力而为，失败忽略）
  try { await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`); } catch {}
  return r.result.value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.chrome) { console.error('未找到 Chrome/Edge 可执行文件，请用 --chrome 指定'); process.exit(2); }
  console.log('== A5 layout-check（多视口）==');
  console.log('chrome:', args.chrome, '| base:', args.base, '| views:', args.views.join('/'));
  console.log();

  const chrome = spawn(args.chrome, [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + args.port,
    '--user-data-dir=' + join(tmpdir(), 'a5-qa-chrome-' + Date.now()),
    '--no-first-run', '--no-default-browser-check', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForDebugger(args.port);
    const results = [];
    for (const rel of args.urls) {
      // 注意：不能用 new URL('/x', base)——前导 / 会解析到 origin 根而非 base。
      // base 已保证以 / 结尾，故直接去掉 rel 前导 / 后拼接。
      const url = args.base + rel.replace(/^\/+/, '');
      for (const w of args.views) {
        const m = await measure(args.port, url, w);
        const verdict = m.hasHorizontalScroll ? '有横向滚动 ❌' : '无横向滚动 ✅';
        results.push({ url: rel, view: w, ...m, verdict });
        console.log(`  [${verdict}] ${w}px  ${rel}  scrollWidth=${m.scrollWidth} clientWidth=${m.clientWidth}  title="${m.title}"`);
      }
    }
    const bad = results.filter((r) => r.hasHorizontalScroll);
    const out = { base: args.base, views: args.views, results, conclusion: bad.length === 0 ? '全部视口无横向滚动' : `${bad.length} 处横向滚动`, exitCode: bad.length === 0 ? 0 : 1 };
    const dir = resolve(__dirname, '..', 'baseline');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'layout-check.latest.json'), JSON.stringify(out, null, 2) + '\n');
    console.log();
    console.log('结论：', out.conclusion);
    process.exit(out.exitCode);
  } finally {
    chrome.kill();
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
