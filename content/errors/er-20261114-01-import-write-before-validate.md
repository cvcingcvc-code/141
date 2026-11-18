---
id: ER-20261114-01
type: error
title: 复盘导入脚本先写盘后校验且整段拼接原稿导致隐私落地风险
summary: Wave 3A 复盘导入脚本在 --authorize 模式下先写入公开仓库目录再执行校验，且把源笔记原文拼入正文，经内存预检与结构化裁剪修复。
created: 2026-11-14
updated: 2026-11-18
published: true
published_at: 2026-11-18
published_by: user
tags: [security, node, tooling, testing]
sample: false
vault_ref: null
occurred: 2026-11-14
severity: high
symptom: "在 Wave 3A 独立验收测试中，对含敏感测试输入的源笔记运行 new-journal.mjs --authorize 时，脚本虽报错并以非零退出码终止，但未脱敏的目标 Markdown 文件已被写入 content/journal/ 目录，且正文中原样拼入了源笔记全文。"
context: "执行 scripts/import/new-journal.mjs 并显式传入 --authorize 与 --from 参数，将仓库外原始复盘笔记导入为公开仓库 content/journal/<YYYY>/<YYYY-MM-DD>.md 草稿条目时触发。"
root_cause: "导入流水线时序颠倒且正文组装越界：一是先调用 writeFileSync 将文件落盘至 content/journal/ 后才调用内容校验器，导致校验拦截失败后脏文件仍滞留工作区；二是 --authorize 模式直接将 --from 原稿全文复制进公开仓库 Markdown 正文，违背了原稿可能包含未脱敏私人细节的安全边界。"
fix: "在 PR #32（commit 529fe47）中改为写盘前预检与结构化正文生成：先在内存中拼出完整候选文本并在系统临时目录复用 loadContent 完成 Schema、V-017 与 V-010 敏感信息校验（临时目录即用即删），预检不通过直接返回退出码 1 且绝不触碰 content/；同时 --authorize 正文仅从 did/learned/blocked/tomorrow 结构化字段生成，原稿关联只允许通过 --vault-ref 写入指针。"
prevention: "任何向公开仓库受管目录落盘的导入或生成脚本，必须遵守“内存构建候选产物 → 复用权威校验器预检通过 → 最终写盘”的原子顺序，且 --dry-run 必须执行同一套预检逻辑；独立 QA 验收必须包含“注入违规输入后断言目标路径零残留文件”的反向测试。"
evidence:
  - kind: pr
    ref: "https://github.com/cvcingcvc-code/personal-knowledge-os/pull/32"
  - kind: commit
    ref: "529fe47"
project: PJ-PKOS
---

## 事故复盘：为什么“返回非零退出码”仍不够安全

在常规命令行工具中，“先生成文件、再跑一次 lint 校验，失败就返回退出码 1”似乎无伤大雅。但在公开 Git 仓库的内容导入场景下，这种写盘顺序存在严重的双重置险：

1. **工作区残留未脱敏文件**：一旦 `content/journal/` 下已经生成了包含敏感信息的草稿文件，尽管当次命令报错退出，该文件仍留在本地仓库工作树中，极易在后续操作中被误暂存提交；若叠加 `--force` 参数，甚至会先行破坏已有的合法草稿。
2. **结构化提取形同虚设**：用户在仓库外撰写的自由复盘原稿，往往既有可公开的工作总结（提炼进 `did` 与 `learned`），也夹杂不便公开的上下文细节。如果 `--authorize` 在提取结构化字段后仍把整篇原稿全文追加到正文末尾，脱敏分层就会彻底失效。

## 修复后的安全不变量

经 A5 在 Wave 3A 独立验收中复现拦截后，A4 在 PR #32（`529fe47`）中确立了两条不可绕过的导入不变量：

- **写盘前零副作用预检**：候选 Markdown 必须与最终落盘字节逐字一致，先送入隔离临时目录调用 `scripts/validate-content.mjs` 导出的 `loadContent` 执行完整单文件规则检查，并在 `finally` 块中清理临时目录。任何一条 `V-*` 规则（尤其是 `V-010` 敏感信息规则）触发时，目标路径保持零写入、已有文件保持零改动。
- **公开入库与原始全文物理脱钩**：仓库外草稿（未传 `--authorize`，输出至仓库外 `drafts` 目录）可保留原稿段落供本人对照审阅；一旦传入 `--authorize` 写入公开仓库，正文只允许由结构化列表拼装生成，原始笔记仅能以 `vault:` 指针形式登记在 `raw_source` 字段中。
