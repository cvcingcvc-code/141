/**
 * src/content/__tests__/fixtures.mjs
 *
 * 校验器单测的夹具工厂：每次在系统临时目录造一份最小合规的 content/，
 * 再由具体用例做单点破坏（红灯）或单点保留（正向）。
 *
 * 为什么不在仓库 content/ 里造非法条目：那会让 main 永远红着；
 * 也不放在 docs/ 之类的地方：夹具必须和校验器一起被 QA 复现。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FILLER = '这是一段用于满足 W-004（正文 ≥80 字符）的填充说明文本，不含任何真实个人信息、联系方式或凭据。'.repeat(2);

const doc = (frontmatter, body = FILLER) => `---\n${frontmatter.trim()}\n---\n\n${body}\n`;

/** 最小合规基线：五类各一条，`npm run validate` 级别的 0 errors / 0 warnings */
export const BASELINE = Object.freeze({
  'profile/profile.md': doc(`
id: profile
type: profile
title: 基线 Profile
summary: 夹具基线 profile，只服务于校验器单测，不代表任何真实身份或真实个人信息。
created: 2026-11-06
updated: 2026-11-06
published: true
published_at: 2026-11-06
published_by: user
tags: [workflow]
sample: false
vault_ref: null`),

  'knowledge/kb-eng-001-baseline.md': doc(`
id: KB-ENG-001
type: knowledge
title: 基线知识条目
summary: 夹具基线 knowledge，用于红灯用例的正向对照，字段形态与 C-5 完全对齐并保持最小。
created: 2026-11-06
updated: 2026-11-06
published: true
published_at: 2026-11-06
published_by: user
tags: [git]
sample: false
vault_ref: null
domain: engineering
status: verified
confidence: high
sources:
  - kind: book
    ref: "Baseline Source"
    locator: "Ch.1"
related: []`),

  'projects/pj-141-baseline.md': doc(`
id: PJ-141
type: project
title: 基线项目条目
summary: 夹具基线 project，刻意不写 published 字段，用于验证缺省即不发布这条规则。
created: 2026-11-06
updated: 2026-11-06
tags: [architecture]
sample: false
vault_ref: null
status: active
role: 基线角色
period:
  start: 2026-11
  end: null
stack: [astro]
links:
  - label: Repository
    url: https://github.com/cvcingcvc-code/141
outcomes:
  - 基线结果：可被第三人复现的验证动作
linked_knowledge: []
linked_errors: []`),

  'journal/2026/2026-11-06.md': doc(`
id: DJ-2026-11-06
type: journal
title: 基线复盘条目
summary: 夹具基线 journal，agent-drafted + draft 的合法形态，用于验证 P-01 与 V-017 命名一致性。
created: 2026-11-06
updated: 2026-11-06
tags: [review]
sample: false
vault_ref: null
date: 2026-11-06
review_status: draft
source: agent-drafted
energy: 3
did:
  - 基线事项占位
learned:
  - 基线结论占位
blocked: []
tomorrow: []
linked_knowledge: []
linked_projects: []
linked_errors: []
raw_source: null`),

  'errors/er-20261106-01-baseline.md': doc(`
id: ER-20261106-01
type: error
title: 基线错误条目
summary: 夹具基线 error，五要素齐全且 published 显式为 false，用于验证 L2 不发布形态。
created: 2026-11-06
updated: 2026-11-06
published: false
tags: [debugging]
sample: false
vault_ref: null
occurred: 2026-11-06
severity: medium
symptom: 基线症状描述文本内容
context: 基线上下文描述文本内容
root_cause: 基线根因描述文本内容
fix: 基线修复描述文本内容
prevention: 基线预防描述文本内容
evidence:
  - kind: commit
    ref: "a6dbf83"
project: PJ-141`),
});

/**
 * 造一份夹具 content/。
 * @param {Record<string,string>} overrides 键为相对 content/ 的路径，值为文件全文；值为 null 表示删除该文件
 * @param {Record<string,string>} [extra] 额外新增的文件
 * @returns {string} 夹具 content 目录绝对路径
 */
export function makeContent(overrides = {}, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'a2-content-'));
  const files = { ...BASELINE, ...overrides };
  for (const [relative, content] of Object.entries(files)) {
    if (content === null) continue;
    const abs = path.join(root, relative);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  for (const [relative, content] of Object.entries(extra)) {
    const abs = path.join(root, relative);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  return root;
}

/** 把基线里某个文件替换成"改几个字段"的版本 */
export function patch(relative, replacements = {}, bodyAppend = '') {
  let text = BASELINE[relative];
  for (const [from, to] of Object.entries(replacements)) {
    if (!text.includes(from)) {
      throw new Error(`夹具补丁失败：${relative} 中找不到 "${from}"`);
    }
    text = text.replace(from, to);
  }
  return bodyAppend ? `${text}\n${bodyAppend}\n` : text;
}

/** 只取编号列表，便于断言 */
export const codesOf = (result) => result.violations.map((v) => v.code);

/** 某个文件上的编号 */
export const codesIn = (result, file) => result.violations.filter((v) => v.file === file).map((v) => v.code);

export { doc, FILLER };
