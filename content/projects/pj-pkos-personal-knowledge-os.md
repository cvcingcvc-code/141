---
id: PJ-PKOS
type: project
title: Personal Knowledge OS（个人知识操作系统）
summary: 以五类受控 Markdown 为单一事实源，结合 Zod 契约校验、分支范围门禁、三层隐私扫描与 Pagefind 静态全文搜索构建的个人知识库系统。
created: 2026-11-06
updated: 2026-11-18
published: false
tags: [knowledge-base, architecture, ci-cd, security, workflow]
sample: false
vault_ref: null
status: active
role: 仓库所有者 / 产品定义与最终审批
period:
  start: "2026-11"
  end: null
stack: [astro, zod, pagefind, markdown, github-actions]
links:
  - label: Repository
    url: https://github.com/cvcingcvc-code/personal-knowledge-os
outcomes:
  - "落地 profile / knowledge / projects / journal / errors 五类共享 Zod 契约与 V-001..V-021、W-001..W-005 内容校验门禁（PR #6）"
  - "建立 37 项自动化单测与红灯回归用例，覆盖未发布与草稿零泄漏、来源可追溯及人工审批证据校验"
  - "实现 scripts/check-scope.mjs 分支前缀写权限隔离与 GitHub Actions CI 强制门禁，支撑五角色独立 Worktree 并行交付（PR #3）"
  - "打通 Astro 5 十二条静态路由、dist/data/content.json 构建产物与 Pagefind 离线中文全文搜索闭环（PR #12、PR #13、PR #14）"
  - "建立 L1 工作树、L2 Git 历史、L3 构建产物三层隐私扫描以及写盘前内存预检的复盘草稿导入工具链（PR #26、PR #32、PR #25）"
linked_knowledge:
  - KB-ENG-003
  - KB-ENG-004
  - KB-ENG-005
  - KB-ENG-006
linked_errors:
  - ER-20261114-01
---

## 项目定位与解决的问题

Personal Knowledge OS 是一个面向长期个人沉淀的结构化知识库工程。它不追求复杂的动态后端或花哨的知识图谱渲染，而是聚焦于打通一条零运行时依赖、工具链全毁时纯文本依然可读的确定性闭环：**受控输入 → 契约校验 → 隐私隔离 → 静态编译 → 离线全文搜索 → 人工审批发布**。

在研发组织上，项目由仓库所有者定义产品边界、安全红线并握有最终合并与发布审批权，下设架构（A1）、内容与契约（A2）、站点交互（A3）、构建自动化（A4）与独立质量验收（A5）五个 AI Agent 角色，在独立 Git Worktree 与分支范围门禁约束下协同演进。

## 关键架构与工程防线

1. **单一契约真相源**：`src/content/schema.ts` 同时服务于 Astro Content Collections 构建期解析、`scripts/validate-content.mjs` PR 校验门禁以及 `isVisibleEntry()` 唯一发布过滤函数，杜绝页面、数据产物与搜索索引各自维护过滤条件。
2. **公开仓库纵深防御**：所有新增条目默认 `published: false`，复盘草稿强制 `review_status: draft`，未获人工明确授权不得进入 `dist/` 产物；配合 `V-010` 规则与三层 `privacy-scan` 阻断敏感信息入库，私密原稿一律隔离在仓库外私密目录。
3. **受控演进路线**：v0.1 阶段专注于静态知识站与全套质量门禁闭环并部署至 GitHub Pages 子路径 `/personal-knowledge-os/`；后续 v0.2 规划在不污染公开主仓隐私边界的前提下扩展双库隔离的在线捕获能力。
