/**
 * 正向用例 P-01..P-04（ACCEPTANCE.md §5）+ T2.1 专项回归
 *
 * 目的：证明修完 R-04 / R-09 之后没有把合法形态一起判死。
 * 只测"该报的报了"不够，这是 M1 门禁的另一半。
 *
 * 设计约束（D1-001 修正）：
 * - 断言规则，不断言"仓库永远只有未发布内容"：发布是用户的决定，不是测试的禁令。
 * - W-002（示例占比）用夹具验证触发与不触发，真实仓库只要求 0 errors。
 * - 发布门禁是"用户确认合入 main"，字段只是证据；测试不假装能拦住 Agent 填字段。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { BASELINE, codesOf, doc, makeContent, patch } from './fixtures.mjs';
import { validateContent } from '../../../scripts/validate-content.mjs';
import { CONTROLLED_TAGS, isPublishable, isVisibleEntry } from '../schema.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');

const KNOWLEDGE = 'knowledge/kb-eng-001-baseline.md';
const PROJECT = 'projects/pj-141-baseline.md';
const JOURNAL = 'journal/2026/2026-11-06.md';

/* P-01 ----------------------------------------------------------------- */
test('P-01 agent-drafted + draft 且无审批字段 → 不报错、不发布', () => {
  const root = makeContent();
  const result = validateContent(root);
  const journal = result.entries.find((e) => e.expectedType === 'journal');

  assert.equal(result.errors, 0, `合法形态不得报错：${codesOf(result).join(', ')}`);
  assert.equal(journal.frontmatter.source, 'agent-drafted');
  assert.equal(journal.frontmatter.review_status, 'draft');
  assert.equal(journal.frontmatter.approved_at, undefined);
  assert.equal(journal.frontmatter.approved_by, undefined);
  assert.equal(isVisibleEntry({ data: journal.data }), false);
  console.log(`P-01 → errors=0, warnings=${result.warnings}, visible=false`);
});

/* P-02 ----------------------------------------------------------------- */
test('P-02 journal 命名例外：不报 V-006，V-017 通过', () => {
  const root = makeContent();
  const result = validateContent(root);
  const codes = codesOf(result);
  assert.equal(result.errors, 0, `合法形态不得报错：${codes.join(', ')}`);
  assert.ok(!codes.includes('V-006'), 'journal 不适用 V-006');
  assert.ok(!codes.includes('V-017'), 'date / 文件名 / 目录年份 / id 四者一致时不得报 V-017');
  const journal = result.entries.find((e) => e.expectedType === 'journal');
  assert.equal(journal.data.id, 'DJ-2026-11-06');
  assert.equal(String(journal.data.date), '2026-11-06');
  console.log(`P-02 → errors=0, journal id=DJ-2026-11-06, date=2026-11-06`);
});

/* P-03 ----------------------------------------------------------------- */
test('P-03 knowledge status: seed + sources: [] → 不报错', () => {
  const root = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, {
      'status: verified': 'status: seed',
      'confidence: high': 'confidence: low',
      'sources:\n  - kind: book\n    ref: "Baseline Source"\n    locator: "Ch.1"': 'sources: []',
    }),
  });
  const result = validateContent(root);
  assert.equal(result.errors, 0, `seed + 空来源必须合法：${codesOf(result).join(', ')}`);
  assert.ok(!codesOf(result).includes('V-009'));
  console.log(`P-03 → errors=0, V-009 未命中`);
});

/* P-04 ----------------------------------------------------------------- */
test('P-04 新增条目不写 published → 校验不报错、不发布', () => {
  const root = makeContent();
  const result = validateContent(root);
  const project = result.entries.find((e) => e.expectedType === 'project');

  assert.equal(result.errors, 0, `缺省 published 不得报错：${codesOf(result).join(', ')}`);
  assert.equal(Object.hasOwn(project.frontmatter, 'published'), false, '夹具里确实没写 published 字段');
  assert.equal(project.data.published, false, 'zod 默认值必须是 false');
  assert.equal(isPublishable(project.data), false);
  assert.equal(isVisibleEntry({ data: project.data }), false);
  console.log(`P-04 → errors=0, data.published=false（缺省注入）`);
});

/* T2.1 DoD #1：真实仓库样本 ----------------------------------------- */
test('仓库真实样本：npm run validate 等价调用应为 0 errors', () => {
  const result = validateContent(path.join(REPO_ROOT, 'content'));
  assert.equal(result.errors, 0, `真实样本必须 0 errors：\n${result.violations.map((v) => `${v.code} ${v.file} ${v.message}`).join('\n')}`);
  // 这里不再要求仓库永远带着 W-002：示例占比是内容进度，不是规则。
  // W-002 的触发/不触发改用夹具验证（见下方两条用例），真实仓库只要求 0 errors。
  console.log(`真实样本 → ${result.errors} errors, ${result.warnings} warnings；${codesOf(result).join(', ') || '无告警'}`);
});

/* W-002：只在"示例占比 > 50%"时告警（夹具验证，不绑定真实仓库） -------- */
test('W-002 在示例占比 > 50% 的夹具上触发', () => {
  const samplePatch = (file) => patch(file, { 'sample: false': 'sample: true' });
  const root = makeContent({
    [KNOWLEDGE]: samplePatch(KNOWLEDGE),
    [PROJECT]: samplePatch(PROJECT),
    [JOURNAL]: samplePatch(JOURNAL),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('W-002'), `3/5 示例应触发 W-002，实际：${codesOf(result).join(', ') || '（无）'}`);
  console.log(`W-002 触发（3/5=60%）→ ${codesOf(result).join(', ')}`);
});

test('W-002 在示例占比 ≤ 50% 的夹具上不触发', () => {
  const samplePatch = (file) => patch(file, { 'sample: false': 'sample: true' });
  const root = makeContent({
    [KNOWLEDGE]: samplePatch(KNOWLEDGE),
    [PROJECT]: samplePatch(PROJECT),
  });
  const result = validateContent(root);
  assert.ok(!codesOf(result).includes('W-002'), `2/5 示例不应触发 W-002，实际：${codesOf(result).join(', ')}`);
  assert.equal(result.errors, 0);
  console.log('W-002 未触发（2/5=40%）');
});

/* 发布态：当前快照 + 合法发布路径 ------------------------------------- */
test('KB-ENG-003 当前为 sample:false / published:false（本次授权范围）', () => {
  const result = validateContent(path.join(REPO_ROOT, 'content'));
  const entry = result.entries.find((e) => e.frontmatter?.id === 'KB-ENG-003');
  assert.ok(entry, 'content/ 中应存在 KB-ENG-003');
  assert.equal(entry.data.sample, false, 'D1-001 是真实内容，sample 必须为 false');
  assert.equal(entry.data.published, false, '本轮授权仅入库，published 必须为 false');
  assert.equal(entry.frontmatter.published_at, undefined, '不得由 Agent 填 published_at');
  assert.equal(entry.frontmatter.published_by, undefined, '不得由 Agent 填 published_by');
  assert.equal(isVisibleEntry({ data: entry.data }), false);
  console.log('KB-ENG-003 → sample=false, published=false, 未上站');
});

test('发布路径不被禁止：已发布条目只要有合法人工证据就应可见', () => {
  // 夹具 BASELINE 的 profile 与 knowledge 自带 published:true + published_at + published_by:user
  const root = makeContent();
  const result = validateContent(root);
  assert.equal(result.errors, 0, `合法发布不得报错：${codesOf(result).join(', ')}`);

  const knowledge = result.entries.find((e) => e.expectedType === 'knowledge');
  const profile = result.entries.find((e) => e.expectedType === 'profile');
  for (const e of [knowledge, profile]) {
    assert.equal(e.data.published, true);
    assert.equal(isPublishable(e.data), true, '有合法人工证据的已发布条目必须可上站');
    assert.equal(isVisibleEntry({ data: e.data }), true);
  }
  console.log('合法发布 → profile / KB-ENG-001 visible=true（发布不是禁区）');
});

test('示例条目不得带人工审批痕迹（sample:true 与 published:true 不应共存于示例）', () => {
  const result = validateContent(path.join(REPO_ROOT, 'content'));
  const offenders = result.entries
    .filter((e) => e.frontmatter?.sample === true)
    .filter((e) => e.frontmatter.published_by !== undefined || e.frontmatter.approved_by !== undefined)
    .map((e) => e.file);
  assert.deepEqual(offenders, [], `示例条目不得出现人工审批字段：${offenders.join(', ')}`);
  console.log('示例条目 → 无 published_by / approved_by');
});

/* 词表漂移防护 --------------------------------------------------------- */
test('schema.ts 的 CONTROLLED_TAGS ⊆ docs/TAXONOMY.md（防止两份词表撕裂）', () => {
  const taxonomy = fs.readFileSync(path.join(REPO_ROOT, 'docs/TAXONOMY.md'), 'utf8');
  const missing = CONTROLLED_TAGS.filter((tag) => !new RegExp(`\`${tag}\``).test(taxonomy));
  assert.deepEqual(missing, [], `schema 中有但 TAXONOMY 未登记：${missing.join(', ')}`);
  console.log(`词表一致性 → ${CONTROLLED_TAGS.length} 个受控标签全部已登记`);
});

/* 附：V-020 / W-001 / W-003 / W-004 / W-005 能真的触发 ------------------ */
test('补充规则可触发：V-020 / W-001..W-005', () => {
  const stale = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, {
      'vault_ref: null': 'vault_ref: "https://example.com/private.md"',
      'tags: [git]': 'tags: [not-registered-tag]',
      'updated: 2026-11-06': 'updated: 2020-01-01',
      'created: 2026-11-06': 'created: 2020-01-01',
    }),
    'knowledge/kb-eng-003-thin.md': doc(`
id: KB-ENG-003
type: knowledge
title: 正文过短的条目
summary: 夹具条目，用于验证 W-004 空壳正文告警与 W-005 站内链接告警同时能被触发。
created: 2026-11-06
updated: 2026-11-06
published: false
tags: [git]
sample: false
domain: engineering
status: seed
confidence: low
sources: []
related: []`, '点这里 [一个不存在的页面](/141/knowledge/not-here/)'),
  });

  const result = validateContent(stale);
  const codes = codesOf(result);
  for (const code of ['V-020', 'W-001', 'W-003', 'W-004', 'W-005']) {
    assert.ok(codes.includes(code), `${code} 未触发，实际：${codes.join(', ')}`);
  }
  console.log(`补充规则 → ${codes.join(', ')}`);
});
