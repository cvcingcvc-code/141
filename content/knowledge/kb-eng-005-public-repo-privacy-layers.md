---
id: KB-ENG-005
type: knowledge
title: 公开 Git 仓库的三层隐私防线与低熵值哈希穷举风险
summary: 公开仓库中 published:false 只是上站开关而非保密措施；需结合 L1/L2/L3 三层扫描、拒绝低熵值 SHA-256 白名单及 squash 移除可达性来守住边界。
created: 2026-11-18
updated: 2026-11-18
published: true
published_at: 2026-11-18
published_by: user
tags: [security, git, ci-cd, testing]
sample: false
vault_ref: null
domain: engineering
status: verified
confidence: high
sources:
  - kind: url
    ref: https://github.com/cvcingcvc-code/personal-knowledge-os/pull/33
    locator: "commit c6fec07 — docs/incidents/INC-002.md §2-§8"
    accessed: 2026-11-18
    note: "审计 QA 报告合成测试值入库事件，论证低熵值 SHA-256 穷举风险与 squash 可达性处置"
  - kind: url
    ref: https://github.com/cvcingcvc-code/personal-knowledge-os/pull/25
    locator: "commit 24eed1a — Wave 3A 独立验收报告与 squash 合入记录"
    accessed: 2026-11-18
    note: "验证仅以 squash 合并后新 main 上 L1/L2/L3 三层隐私扫描真实命中归零且退出码为 0"
  - kind: experience
    ref: "Personal Knowledge OS 隐私门禁（V-010 与 qa/scripts/privacy-scan.mjs）演进实践"
    locator: "AGENTS.md §1 第 7 条与 §9 常见坑"
    accessed: 2026-11-18
    note: "确立公开仓库私密原稿物理外置与三层扫描不放宽规则的工程纪律"
related:
  - KB-ENG-003
  - KB-ENG-004
---

## 核心前提：公开仓库里“未发布”不等于保密

在以公开 Git 仓库承载的静态知识库中，最危险的认知误区是把 frontmatter 中的 `published: false` 或 `review_status: draft` 当成隐私保护开关。事实上，这两个字段只控制条目是否进入 Astro 静态页面、`dist/data/content.json` 与 Pagefind 搜索索引；只要字节被 `git commit` 推上公开远端，任何人都可以通过仓库文件树与提交历史直接读取原文。

因此，内容分级必须在写盘入库前完成物理隔离：凡属不可公开的私密原稿（L3），一律存放在仓库外的本地独立目录中，仓库条目仅允许通过 `vault:` 前缀保留相对路径指针（由 `V-020` 拦截任何绝对路径、路径上跳或外部协议）。

## L1 / L2 / L3 三层隐私扫描的职责切分

仅扫描当前工作树无法防御“先提交敏感值、后一提交删除”的历史残留，也无法防御构建脚本意外拼接外部数据。完整的隐私门禁（`qa/scripts/privacy-scan.mjs`）必须同时覆盖三层：

1. **L1 工作树扫描**：遍历当前检出树的全部受管文本文件（含未发布的草稿与测试文档），阻断敏感字面量进入新提交。
2. **L2 Git 历史扫描**：遍历当前分支可达提交历史中的变更内容，防止“工作树已删但祖先提交仍含明文”的分支合入主干。
3. **L3 构建产物扫描**：扫描 `dist/` 下的 HTML、JSON、XML 与纯文本产物，验证静态编译与数据导出环节零泄漏。

## 为什么低熵值绝对不能用 SHA-256 白名单豁免

在 `INC-002`（PR #33，`c6fec07`）处置过程中，QA 分支曾在验收报告正文里写入了自造的测试号码与测试证件号以说明 `V-010` 拦截步骤，随后在后续提交中改写为掩码。此时 L1 归零，但分支 L2 历史仍报命中。

面对此类历史命中，**严禁将手机号、身份证号等低熵值的 SHA-256 哈希写入公开白名单表**。原因在于：高熵凭据（如随机 API 密钥）的候选空间极大，单向哈希不会暴露原文；但十一位十进制移动号码的有效空间仅约 $10^{10}$ 量级，证件号在已知行政区划与年份范围时候选空间同样极小，攻击者利用公开仓库里的 SHA-256 列表在数秒内即可暴力穷举还原出原始明文。公开低熵值的哈希，本质上等同于公开明文。

## 分支历史污染的正确处置：用 Squash Merge 切断主干可达性

当功能分支历史中误入了形似敏感信息的合成测试值、且主干历史尚未受污染时，合规的处置路径不是放宽扫描正则或添加哈希豁免，而是：

1. 在分支最新提交中彻底移除明文（文档只允许记载“数据类别 + 掩码形式”），确保分支顶端树 L1 与构建产物 L3 零命中；
2. 合并 PR 时**强制仅使用 `squash merge`**（禁用 `merge commit` 与 `rebase merge`），使 `main` 仅新增一个指向干净工作树快照的单提交，原本包含测试字面量的分支中间提交不会成为 `main` 的祖先（如 PR #25 → `24eed1a` 合入后，`main` 上三层扫描真实命中均为 0）；
3. 如实记录残余暴露边界：删除远端分支仅移除引用，并不代表托管平台立即物理擦除悬空 Git 对象，因此工程结论只能表述为“移除 `main` 可达性”，不得虚假宣称“已物理销毁历史”。
