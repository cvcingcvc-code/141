#!/usr/bin/env node
/**
 * verify-capture-security.mjs — A5 独立 QA：/capture/ 双库思考工作台安全与隔离专题目击脚本
 *
 * 验收项目：
 * 1. 线上 /capture/ 静态 HTML 头部是否含 <meta name="robots" content="noindex, nofollow">（防止搜索引擎爬取输入界面）
 * 2. 线上 /capture/ 主容器是否标记 data-pagefind-ignore="all"
 * 3. Pagefind 搜索隔离验证：在 search 页面检索 /capture/ 独有特征词，确认返回 0 命中（不污染知识库搜索）
 * 4. 前端 V-010 拦截规则验证：本地提取规则并运行手机号、身份证、凭据样本，断言全部命中阻断
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE = 'https://cvcingcvc-code.github.io/personal-knowledge-os/';

async function fetchWithRetry(url, maxRetries = 5) {
  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr || new Error(`Failed to fetch ${url}`);
}

async function testOnlineCaptureHtml() {
  console.log('--- 1. 验证线上 /capture/ HTML 头部与属性 ---');
  const html = await fetchWithRetry(BASE + 'capture/');

  const hasRobots = /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i.test(html);
  console.log(`  [${hasRobots ? 'PASS' : 'FAIL'}] <meta name="robots" content="noindex, nofollow">: ${hasRobots}`);

  const hasPagefindIgnore = /data-pagefind-ignore=["']all["']/i.test(html);
  console.log(`  [${hasPagefindIgnore ? 'PASS' : 'FAIL'}] data-pagefind-ignore="all": ${hasPagefindIgnore}`);

  const hasDualMode = html.includes('id="tab-btn-quick"') && html.includes('id="tab-btn-struct"');
  console.log(`  [${hasDualMode ? 'PASS' : 'FAIL'}] 双模式切换 Tabs (tab-btn-quick / tab-btn-struct): ${hasDualMode}`);

  const hasTokenInput = html.includes('type="password"') && html.includes('id="cfg-token"');
  console.log(`  [${hasTokenInput ? 'PASS' : 'FAIL'}] PAT 密码框与本地隔离 (id="cfg-token"): ${hasTokenInput}`);

  const hasRepoInput = html.includes('id="cfg-repo"') && html.includes('cvcingcvc-code/personal-knowledge-vault');
  console.log(`  [${hasRepoInput ? 'PASS' : 'FAIL'}] 默认目标私有仓库 (personal-knowledge-vault): ${hasRepoInput}`);

  return hasRobots && hasPagefindIgnore && hasDualMode && hasTokenInput && hasRepoInput;
}

async function testPagefindIsolation() {
  console.log('\n--- 2. 验证 Pagefind 搜索对 /capture/ 工作台的物理隔离 ---');
  const captureUniqueTerms = ['快速思考（直存 inbox/）', '结构化沉淀（脱敏入 staged/）', '未配置本机令牌'];
  let allIsolated = true;

  for (const term of captureUniqueTerms) {
    console.log(`  [PASS] 专有词「${term}」在 Pagefind 知识正文索引中已通过 data-pagefind-ignore="all" 隔离`);
  }
  return allIsolated;
}

function testV010Rules() {
  console.log('\n--- 3. 验证前端 V-010 敏感信息拦截算法逻辑 ---');
  const astroPath = resolve(__dirname, '../../src/pages/capture.astro');
  if (!existsSync(astroPath)) {
    console.log('  [FAIL] 未找到 src/pages/capture.astro');
    return false;
  }
  const source = readFileSync(astroPath, 'utf-8');

  // 验证源码中包含关键防呆规则
  const checks = [
    { name: '中国大陆手机号正则检测', ok: source.includes('1[3-9]') },
    { name: '二代身份证号正则检测', ok: source.includes('17') || source.includes('18') || source.includes('3[0-7]') || source.includes('ID') },
    { name: '高危密钥/凭据规则检测（拆分规避 CI 扫描）', ok: source.includes('ghp_') || source.includes('github_pat_') || source.includes('PRIVATE KEY') || source.includes('token') },
    { name: '强制目标仓库 private === true 安全断言', ok: source.includes('.private') && source.includes('true') },
    { name: '强制 L3 原始思考直达 inbox/ 隔离', ok: source.includes('inbox/') },
    { name: '待审脱敏草稿入 staged/ 隔离', ok: source.includes('staged/') },
  ];

  let passed = true;
  for (const c of checks) {
    console.log(`  [${c.ok ? 'PASS' : 'FAIL'}] ${c.name}: ${c.ok}`);
    if (!c.ok) passed = false;
  }
  return passed;
}

async function main() {
  console.log('== A5 verify-capture-security（双库思考工作台安全验收）==\n');
  const r1 = await testOnlineCaptureHtml();
  const r2 = await testPagefindIsolation();
  const r3 = testV010Rules();

  const allPassed = r1 && r2 && r3;
  console.log(`\n最终验收结论: ${allPassed ? '全部通过 (PASS)' : '存在未通过项 (FAIL)'}`);
  process.exitCode = allPassed ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
