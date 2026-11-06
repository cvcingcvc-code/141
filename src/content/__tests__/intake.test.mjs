/**
 * T2.2 采集资产的一致性测试
 *
 * 目的：本轮的交付不是"新内容"，而是"采集与核对资产"。资产最容易的腐化方式是
 * 与 contract 脱钩（契约加了字段、清单没跟上），所以用测试把它钉住。
 * 另加一条 Wave 2 §11.6 红线守卫：content/ 里不允许出现任何"已发布/已批准"迹象。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { loadContent } from '../../../scripts/validate-content.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const INTAKE = path.join(REPO_ROOT, 'src/content/intake');

const read = (name) => fs.readFileSync(path.join(INTAKE, name), 'utf8');

/** C-3..C-8 的全部字段名（唯一来源仍是 CONTRACTS.md；此处作为测试侧的期望清单） */
const CONTRACT_FIELDS = [
  // C-3 公共
  'id', 'type', 'title', 'summary', 'created', 'updated',
  'published', 'published_at', 'published_by', 'tags', 'sample', 'vault_ref',
  // C-5 knowledge
  'domain', 'status', 'confidence', 'sources', 'related',
  // C-6 projects
  'role', 'period', 'stack', 'links', 'outcomes', 'linked_knowledge', 'linked_errors',
  // C-7 journal
  'date', 'review_status', 'source', 'approved_at', 'approved_by', 'energy',
  'did', 'learned', 'blocked', 'tomorrow', 'linked_projects', 'raw_source',
  // C-8 errors
  'occurred', 'severity', 'symptom', 'context', 'root_cause', 'fix', 'prevention',
  'evidence', 'project',
];

/** C-12 的编号全集（新增编号必须先改契约） */
const CONTRACT_CODES = new Set([
  ...Array.from({ length: 21 }, (_, i) => `V-${String(i + 1).padStart(3, '0')}`),
  ...Array.from({ length: 5 }, (_, i) => `W-${String(i + 1).padStart(3, '0')}`),
]);

test('采集清单覆盖 C-3..C-8 的全部字段（清单 ↔ schema 双向对齐）', () => {
  const checklist = read('field-checklist.md');
  const schema = fs.readFileSync(path.join(REPO_ROOT, 'src/content/schema.ts'), 'utf8');

  const missingInChecklist = CONTRACT_FIELDS.filter((f) => !checklist.includes(`\`${f}\``));
  assert.deepEqual(missingInChecklist, [], `清单缺少字段：${missingInChecklist.join(', ')}`);

  const missingInSchema = CONTRACT_FIELDS.filter((f) => !new RegExp(`\\b${f}\\s*:`).test(schema));
  assert.deepEqual(missingInSchema, [], `schema.ts 中找不到字段：${missingInSchema.join(', ')}`);

  console.log(`采集清单 → ${CONTRACT_FIELDS.length} 个契约字段全部覆盖（清单与 schema 一致）`);
});

test('采集清单只引用已冻结的校验编号（不得自造 V-/W-）', () => {
  const docs = ['field-checklist.md', 'source-verification.md', 'README.md'].map(read).join('\n');
  const used = new Set((docs.match(/\b[VW]-\d{3}\b/g) ?? []));
  const unknown = [...used].filter((code) => !CONTRACT_CODES.has(code));
  assert.deepEqual(unknown, [], `出现未定义编号：${unknown.join(', ')}`);
  console.log(`采集资产 → 引用 ${used.size} 个编号，全部在 C-12 范围内`);
});

test('待确认清单存在且标注 BLOCKED-D1，编号 D1-1..D1-10 齐全', () => {
  const pending = read('pending-confirmation.md');
  assert.ok(pending.includes('BLOCKED-D1'), '待确认清单必须显式标注 BLOCKED-D1');
  const missing = Array.from({ length: 10 }, (_, i) => `D1-${i + 1}`).filter((id) => !pending.includes(id));
  assert.deepEqual(missing, [], `待确认项缺失：${missing.join(', ')}`);
  console.log('待确认清单 → BLOCKED-D1 + D1-1..D1-10 齐全');
});

test('Wave 2 §11.6 红线：content/ 中不得存在已发布 / 已批准迹象', () => {
  const { entries } = loadContent(path.join(REPO_ROOT, 'content'));
  assert.ok(entries.length > 0, 'content/ 不应为空（示例条目仍在）');

  const offenders = [];
  for (const entry of entries) {
    const fm = entry.frontmatter ?? {};
    if (fm.published === true) offenders.push(`${entry.relToRoot}: published=true`);
    if (fm.published_by !== undefined && fm.published_by !== null) offenders.push(`${entry.relToRoot}: published_by=${fm.published_by}`);
    if (fm.approved_by !== undefined && fm.approved_by !== null) offenders.push(`${entry.relToRoot}: approved_by=${fm.approved_by}`);
    if (fm.review_status === 'approved') offenders.push(`${entry.relToRoot}: review_status=approved`);
  }
  assert.deepEqual(offenders, [], `违反 Wave 2 发布红线：\n${offenders.join('\n')}`);
  console.log(`发布红线 → ${entries.length} 条内容均为未发布/未批准`);
});

test('采集资产本身不得含 PII 或凭据（它也要进公开仓库）', () => {
  const docs = ['README.md', 'field-checklist.md', 'source-verification.md', 'pending-confirmation.md']
    .map((name) => [name, read(name)])
    .map(([name, text]) => ({ name, text }));
  const PII = [
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\.[A-Za-z]{2,}/,
    /(?<!\d)1[3-9]\d{9}(?!\d)/,
    /\bsk-[A-Za-z0-9_-]{16,}/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  ];
  const hits = [];
  for (const { name, text } of docs) {
    for (const re of PII) {
      const m = re.exec(text);
      if (m) hits.push(`${name}: ${m[0]}`);
    }
  }
  assert.deepEqual(hits, [], `采集资产含疑似敏感值：\n${hits.join('\n')}`);
  console.log('采集资产 → PII 0 命中');
});
