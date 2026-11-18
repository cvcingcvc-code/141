---
id: KB-ENG-004
type: knowledge
title: 多 Agent 并行协作中以分支写权限门禁替代口头约定
summary: 在多角色并行开发同一仓库时，仅靠文档约定与 Git Worktree 无法阻止越界修改；通过分支前缀绑定允许路径表并在 CI 强制拦截，才能实现确定性隔离。
created: 2026-11-18
updated: 2026-11-18
published: false
tags: [agent-collaboration, ci-cd, workflow, architecture]
sample: false
vault_ref: null
domain: engineering
status: verified
confidence: high
sources:
  - kind: url
    ref: https://github.com/cvcingcvc-code/personal-knowledge-os/pull/3
    locator: "commit fbb0695 — scripts/check-scope.mjs 与 .github/workflows/ci.yml"
    accessed: 2026-11-18
    note: "落地 C-17 分支前缀路径门禁，越界修改在本地与 CI 均直接返回退出码 1"
  - kind: url
    ref: https://github.com/cvcingcvc-code/personal-knowledge-os/pull/34
    locator: "commit 90e20c6 — docs/rfc/RFC-001-repo-rename-base.md §4 迁移方案"
    accessed: 2026-11-18
    note: "仓库改名迁移受 check-scope 约束，按写权限拆分为 PR #34/#35/#36/#37 独立合入"
  - kind: experience
    ref: "Personal Knowledge OS 五角色（A1-A5）独立 Worktree 并行研发实践"
    locator: "AGENTS.md §3 写权限表与 scripts/check-scope.mjs SCOPE_RULES 同构表"
    accessed: 2026-11-18
    note: "验证单一权威路径归属表在多波次并行交付中的拦截与解耦效果"
related:
  - KB-ENG-003
---

## 问题背景：为什么提示词约定与 Worktree 仍不够

在由多个 AI Agent 分饰架构（A1）、内容契约（A2）、前端站点（A3）、构建自动化（A4）与独立 QA（A5）并行推进同一代码库时，最常见的失控方式是“顺手跨区修改”——例如前端任务为了修类型报错直接改动共享 Schema，或自动化脚本任务顺手改掉架构文档。

`git worktree` 只能隔离各角色本地的检出目录与分支状态，避免工作区文件互相覆盖；但它并不会阻止任何分支向任意目录提交改动。一旦跨区改动进入 PR，不仅容易引发合并冲突，更会绕过对应模块负责人的契约审查。

## 可执行的工程机制：分支前缀 × 允许路径表 × CI 阻断

要让职责边界具备确定性，必须把文档里的写权限表编译为 PR 阶段的机器门禁。本仓库在 `scripts/check-scope.mjs`（PR #3，`fbb0695`）中落地了三层约束：

1. **单一权威映射**：以 `AGENTS.md §3` 写权限表为唯一数据源，在 `check-scope.mjs` 中维护同构常量 `SCOPE_RULES`，将分支前缀（如 `feat/a2-`、`feat/a3-`、`feat/a4-`、`qa/a5-`、`chore/`）映射到各自允许改动的 glob 路径集合，并对交界目录（如 `public/**` 排除归属 A4 的 `public/data/**`）做显式切分。
2. **基于合并基线的精确差分**：门禁执行 `git diff --name-status origin/main...HEAD`，逐文件比对当前分支相对于主干的全部新增、修改、重命名与删除记录；一旦发现路径不在当前分支前缀允许集内，立即打印文件归属方并以退出码 `1` 阻断 CI。
3. **跨角色共享区的只增约束**：针对所有角色均可发起提案的 `docs/rfc/**`，脚本只放行状态为 `A`（新增）的变更，任何修改或删除既有 RFC 结论的操作均按越界拦截。

## 跨区变更的真实协同模式

当遇到确实横跨多个角色区域的全局变更时，门禁会倒逼团队采用清晰的“先契约主配置、后分域跟进”拆分策略，而不是用大包大揽的混合 PR 硬改。

在仓库从 `141` 更名为 `personal-knowledge-os`（RFC-001）的迁移中，改动涉及根配置、站点组件、内容校验器与 QA 脚本四个归属区。团队严格按写权限将其拆分为四步有序合入：先由 A1 在 `chore/rename-paths`（PR #34，`90e20c6`）更新 `astro.config.mjs` 与权威文档，随后 A3（PR #35）、A2（PR #36）与 A5（PR #37）各自基于新主干切出合规前缀分支提交最小改动，全程 0 越界、可独立回滚。

## 适用边界

范围门禁解决的是“谁有权改哪些文件”，不能替代代码逻辑正确性与契约一致性校验（后者仍需依赖类型检查、内容校验器与回归测试）。对于确需紧急跨区修复的缺陷，保留 `fix/` 分支前缀作为受控通道，但必须关联缺陷编号并由主控角色人工审查兜底。
