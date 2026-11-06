---
id: PJ-141
type: project
title: 141 个人知识 OS（示例条目）
summary: 一个把五类 Markdown 内容编译成静态知识站的仓库，本条为示例数据，用于验证 projects 契约。
created: 2026-11-06
updated: 2026-11-06
tags: [architecture, mvp, workflow]
sample: true
vault_ref: null
status: active
role: 示例角色（待用户补充真实分工）
period:
  start: 2026-11
  end: null
stack: [astro, zod, markdown, github-actions]
links:
  - label: Repository
    url: https://github.com/cvcingcvc-code/141
outcomes:
  - 五类内容共用一份 zod 契约，非法条目在 PR 阶段被 V-* 规则拦下
  - 内容 → 校验 → 静态站 → 全文搜索 → 部署，全链路无运行时依赖
linked_knowledge:
  - KB-ENG-001
linked_errors: []
---

> **这是示例数据（`sample: true`）**：本条**故意不写 `published` 字段**，用于验证
> P-04 —— 缺省即 `published: false`（P0-1），校验通过但不会进站点 / 索引 / `content.json`。

## 目标

把"读过的东西"变成"能复用的判断"，且整条链路可被人直接读写：内容即数据源，
站点是从内容编译出来的产物，工具链全废时 Markdown 本身仍然可读。

## 当前阶段（v0.1）

只做必需链路：输入 → 校验 → 展示 → 搜索 → 审核 → 部署。刻意不做标签页、图谱、分页、RSS ——
它们不让这条链路更完整，只会让首个可运行版本更晚出现。

## 关联

- 判断规则见 [KB-ENG-001](/141/knowledge/kb-eng-001/)：本地整理提交用 rebase，已共享的分支只 merge。
- 校验边界见 [KB-ENG-002](/141/knowledge/kb-eng-002/)：结构合规 ≠ 内容为真。
