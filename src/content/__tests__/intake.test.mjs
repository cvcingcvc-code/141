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
  const docs = ['README.md', 'field-checklist.md', 'source-verification.md', 'pending-confirmation.md', 'intake-form.md']
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
  console.log(`采集资产 → ${docs.length} 份文档 PII 0 命中`);
});

test('采集资产位于 content/ 之外，正式内容加载器看不到它', () => {
  const rel = path.relative(path.join(REPO_ROOT, 'content'), INTAKE).split(path.sep).join('/');
  assert.ok(rel.startsWith('..'), `采集目录不得位于 content/ 内（实际相对路径 "${rel}"）`);

  // content collections 的五个 loader base 只允许这五个子目录（src/content.config.ts / C-1）
  const config = fs.readFileSync(path.join(REPO_ROOT, 'src/content.config.ts'), 'utf8');
  const bases = [...config.matchAll(/base:\s*'\.\/content\/([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(bases, ['errors', 'journal', 'knowledge', 'profile', 'projects'], `loader base 异常：${bases.join(', ')}`);
  console.log(`加载器隔离 → intake 在 content/ 之外；loader base 仅五个子目录`);
});

test('content/ 内不存在会被误解析为条目的文件（根目录只允许非 .md）', () => {
  const contentRoot = path.join(REPO_ROOT, 'content');
  const allowedDirs = new Set(['profile', 'knowledge', 'projects', 'journal', 'errors']);
  const offenders = [];

  const walk = (dir) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, item.name);
      const relToContent = path.relative(contentRoot, abs).split(path.sep).join('/');
      const top = relToContent.split('/')[0];
      if (item.isDirectory()) {
        if (relToContent.includes('/')) {
          // 二级以下目录只在 journal/<YYYY>/ 合法
          if (top !== 'journal') offenders.push(`${relToContent}/（不允许的多级目录）`);
          walk(abs);
        } else if (!allowedDirs.has(top)) {
          offenders.push(`${relToContent}/（content/ 下不允许的新目录，C-1）`);
        } else {
          walk(abs);
        }
        continue;
      }
      if (!item.name.toLowerCase().endsWith('.md')) continue; // 非 .md 不会被内容解析器读取
      if (relToContent.includes('/')) continue; // 五类目录内的条目由 validate 负责
      offenders.push(`${relToContent}（content/ 根目录的 .md 会被当作条目 → V-012）`);
    }
  };

  walk(contentRoot);
  assert.deepEqual(offenders, [], `content/ 存在会被误解析的文件：\n${offenders.join('\n')}`);
  console.log('解析隔离 → content/ 根目录无 .md，无未登记子目录');
});

test('填写表覆盖五类内容与授权块（采集闭环不缺项）', () => {
  const form = read('intake-form.md');
  const required = ['授权块', 'profile', 'knowledge', 'projects', 'journal', 'errors', '标签', '关联'];
  const missing = required.filter((key) => !form.includes(key));
  assert.deepEqual(missing, [], `填写表缺少：${missing.join(', ')}`);
  assert.ok(form.includes('不要在本仓库内填写'), '填写表必须警告不要在公开仓库里填写');
  console.log(`填写表 → 覆盖 ${required.length} 项（含授权块与五类）`);
});
