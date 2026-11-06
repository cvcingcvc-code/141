/**
 * 红灯用例 R-01..R-12（ACCEPTANCE.md §4）
 * 每个用例都必须在真实校验器上复现，断言"指定的编号被报出来"，
 * 而不是"退出码非 0"——退出码非 0 也可能是因为别的规则顺手命中，那样通过没有意义。
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { codesIn, codesOf, doc, makeContent, patch } from './fixtures.mjs';
import { validateContent } from '../../../scripts/validate-content.mjs';
import { isVisibleEntry } from '../schema.ts';

const KNOWLEDGE = 'knowledge/kb-eng-001-baseline.md';
const JOURNAL = 'journal/2026/2026-11-06.md';
const ERROR = 'errors/er-20261106-01-baseline.md';

/* R-01 ----------------------------------------------------------------- */
test('R-01 status: verified + sources: [] → V-009 且 exit 1', () => {
  const root = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, {
      'sources:\n  - kind: book\n    ref: "Baseline Source"\n    locator: "Ch.1"': 'sources: []',
    }),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-009'), `期望命中 V-009，实际：${codesOf(result).join(', ') || '（无）'}`);
  assert.ok(result.errors > 0);
  console.log(`R-01 → ${codesOf(result).join(', ')}（errors=${result.errors}）`);
});

/* R-02 ----------------------------------------------------------------- */
test('R-02 related 引用不存在的 id → V-008', () => {
  const root = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, { 'related: []': 'related:\n  - KB-NOT-EXIST' }),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-008'), `期望命中 V-008，实际：${codesOf(result).join(', ') || '（无）'}`);
  console.log(`R-02 → ${codesOf(result).join(', ')}`);
});

/* R-03 ----------------------------------------------------------------- */
test('R-03 文件名 kb-eng-777-x.md 但 id 为 KB-ENG-001 → V-006', () => {
  const root = makeContent(
    { [KNOWLEDGE]: null },
    { 'knowledge/kb-eng-777-x.md': doc(patch(KNOWLEDGE).split('---\n')[1]) },
  );
  const result = validateContent(root);
  assert.ok(codesIn(result, 'knowledge/kb-eng-777-x.md').includes('V-006'), `期望 V-006，实际：${codesOf(result).join(', ')}`);
  console.log(`R-03 → ${codesOf(result).join(', ')}`);
});

/* R-04 ----------------------------------------------------------------- */
test('R-04 agent-drafted + approved 缺 approved_at → V-011', () => {
  const root = makeContent({
    [JOURNAL]: patch(JOURNAL, { 'review_status: draft': 'review_status: approved' }),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-011'), `期望命中 V-011，实际：${codesOf(result).join(', ') || '（无）'}`);
  console.log(`R-04 → ${codesOf(result).join(', ')}`);
});

/* R-05 ----------------------------------------------------------------- */
test('R-05 正文含示例邮箱（ACCEPTANCE R-05）→ V-010', () => {
  // 拼装而非写字面量：ACCEPTANCE §7 L1 会对工作树做邮箱扫描，
  // 夹具里的示例邮箱若以字面量入库会造成误命中。运行时写入的是完整字符串，V-010 仍真实触发。
  const sampleEmail = ['someone', 'example'].join('@') + '.com';
  const root = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, {}, `如需联系请发 ${sampleEmail}`),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-010'), `期望命中 V-010，实际：${codesOf(result).join(', ') || '（无）'}`);
  console.log(`R-05 → ${codesOf(result).join(', ')}`);
});

test('V-010 私钥块（拼装后的规则仍能命中）→ V-010', () => {
  const marker = ['PRI', 'VATE'].join('') + ' ' + ['KE', 'Y'].join('');
  const root = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, {}, `-----BEGIN ${marker}-----`),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-010'), `期望 V-010，实际：${codesOf(result).join(', ') || '（无）'}`);
  console.log(`V-010(私钥) → ${codesOf(result).join(', ')}`);
});

/* R-06 ----------------------------------------------------------------- */
test('R-06 tags 给 13 项 → V-014', () => {
  const root = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, {
      'tags: [git]':
        'tags: [git, testing, debugging, ci-cd, architecture, typescript, javascript, python, node, sql, performance, security, refactoring]',
    }),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-014'), `期望命中 V-014，实际：${codesOf(result).join(', ') || '（无）'}`);
  console.log(`R-06 → ${codesOf(result).join(', ')}`);
});

/* R-07 ----------------------------------------------------------------- */
test('R-07 journal review_status: draft → 不报错，但不可上站', () => {
  const root = makeContent();
  const result = validateContent(root);
  const journal = result.entries.find((e) => e.expectedType === 'journal');
  assert.equal(result.errors, 0, `draft 不应产生错误：${codesOf(result).join(', ')}`);
  assert.equal(isVisibleEntry({ data: journal.data }), false, 'draft 的 journal 不得出现在站点/索引/content.json');
  console.log(`R-07 → errors=0，journal visible=${isVisibleEntry({ data: journal.data })}`);
});

/* R-08 ----------------------------------------------------------------- */
test('R-08 published: false → 校验通过但不可上站', () => {
  const root = makeContent();
  const result = validateContent(root);
  const errorEntry = result.entries.find((e) => e.expectedType === 'error');
  assert.equal(result.errors, 0);
  assert.equal(errorEntry.data.published, false);
  assert.equal(isVisibleEntry({ data: errorEntry.data }), false);
  console.log(`R-08 → errors=0，error visible=${isVisibleEntry({ data: errorEntry.data })}`);
});

/* R-09 ----------------------------------------------------------------- */
test('R-09 journal 文件名 2026-11-07.md 但 date: 2026-11-06 → V-017（不得报 V-006）', () => {
  const journalYaml = patch(JOURNAL).split('---\n')[1];
  const root = makeContent({ [JOURNAL]: null }, { 'journal/2026/2026-11-07.md': doc(journalYaml) });
  const result = validateContent(root);
  const codes = codesIn(result, 'journal/2026/2026-11-07.md');
  assert.ok(codes.includes('V-017'), `期望 V-017，实际：${codes.join(', ') || '（无）'}`);
  assert.ok(!codes.includes('V-006'), `journal 是命名例外，不得报 V-006（实际：${codes.join(', ')}）`);
  console.log(`R-09 → ${codes.join(', ')}`);
});

/* R-10 ----------------------------------------------------------------- */
test.skip('R-10 跨区改动 → scope:check 拦截（属 T4.1 / A4，A2 无写权限）', () => {
  // scripts/check-scope.mjs 归 A4（AGENTS.md §3）；A2 不得实现，故此处只登记不实现。
});

/* R-11 ----------------------------------------------------------------- */
test('R-11 approved_by: agent → V-019', () => {
  const root = makeContent({
    [JOURNAL]: patch(JOURNAL, {
      'review_status: draft': 'review_status: approved\napproved_at: 2026-11-06\napproved_by: agent',
    }),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-019'), `期望命中 V-019，实际：${codesOf(result).join(', ') || '（无）'}`);
  console.log(`R-11a → ${codesOf(result).join(', ')}`);
});

test('R-11 published_by: bot → V-019', () => {
  const root = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, { 'published_by: user': 'published_by: bot' }),
  });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-019'), `期望命中 V-019，实际：${codesOf(result).join(', ') || '（无）'}`);
  console.log(`R-11b → ${codesOf(result).join(', ')}`);
});

/* R-12 ----------------------------------------------------------------- */
test('R-12 published: true 但缺 published_at 与 published_by → V-021', () => {
  const root = makeContent({
    [KNOWLEDGE]: patch(KNOWLEDGE, { 'published_at: 2026-11-06\npublished_by: user\n': '' }),
  });
  const result = validateContent(root);
  const codes = codesIn(result, KNOWLEDGE);
  assert.ok(codes.includes('V-021'), `期望 V-021，实际：${codes.join(', ') || '（无）'}`);
  assert.equal(codes.filter((c) => c === 'V-021').length, 2, 'published_at 与 published_by 各应报一次');
  console.log(`R-12 → ${codes.join(', ')}`);
});

/* 附：另外三条结构红线（不在 R-01..R-12 内，但属 C-12 错误级） ---------- */
test('V-001 frontmatter 缺失 → V-001', () => {
  const root = makeContent({ [KNOWLEDGE]: '没有 frontmatter 的正文\n' });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-001'));
  console.log(`V-001 → ${codesOf(result).join(', ')}`);
});

test('V-012 type 与目录不符 → V-012', () => {
  const root = makeContent({ [KNOWLEDGE]: patch(KNOWLEDGE, { 'type: knowledge': 'type: project' }) });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-012'));
  console.log(`V-012 → ${codesOf(result).join(', ')}`);
});

test('V-016 errors 五要素过短 → V-016', () => {
  const root = makeContent({ [ERROR]: patch(ERROR, { 'root_cause: 基线根因描述文本内容': 'root_cause: 短' }) });
  const result = validateContent(root);
  assert.ok(codesOf(result).includes('V-016'));
  console.log(`V-016 → ${codesOf(result).join(', ')}`);
});
