/**
 * 正向用例 P-01..P-04（ACCEPTANCE.md §5）+ T2.1 专项回归
 *
 * 目的：证明修完 R-04 / R-09 之后没有把合法形态一起判死。
 * 只测"该报的报了"不够，这是 M1 门禁的另一半。
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
  // 全是 sample 时 W-002 必然命中（T2.2 补真实内容后消失），这是预期而非缺陷
  assert.ok(codesOf(result).includes('W-002'), '当前 100% 示例内容，W-002 应当被报出并在 PR 说明');
  console.log(`真实样本 → ${result.errors} errors, ${result.warnings} warnings；${codesOf(result).join(', ')}`);
});

/* T2.1 DoD #4：真实样本的发布态分布 ---------------------------------- */
test('真实样本同时覆盖显式发布 / 缺省不发布 / 显式不发布 / draft 四种形态', () => {
  const result = validateContent(path.join(REPO_ROOT, 'content'));
  const visible = result.entries.filter((e) => e.ok && isVisibleEntry({ data: e.data })).map((e) => e.data.id);
  const hidden = result.entries.filter((e) => e.ok && !isVisibleEntry({ data: e.data })).map((e) => e.data.id);

  assert.deepEqual(visible.sort(), ['KB-ENG-001', 'KB-ENG-002', 'profile'].sort(), '可上站的只能是显式 published:true 的三条');
  assert.ok(hidden.includes('PJ-141'), 'PJ-141 缺省 published，不得上站');
  assert.ok(hidden.includes('DJ-2026-11-06'), 'journal draft 不得上站');
  assert.ok(hidden.includes('ER-20261106-01'), '显式 published:false 不得上站');
  for (const e of result.entries) {
    assert.equal(e.frontmatter.sample, true, `${e.file} 必须标注 sample: true`);
  }
  console.log(`发布过滤 → visible=[${visible.join(', ')}] hidden=[${hidden.join(', ')}]`);
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
