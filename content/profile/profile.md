---
id: profile
type: profile
title: 示例 Profile（占位，待用户补充）
summary: 本文件是 T2.1 的示例数据，用于验证 profile 集合的契约与发布链路，不含任何真实个人信息。
created: 2026-11-06
updated: 2026-11-06
published: false
tags: [knowledge-base, documentation]
sample: true
vault_ref: null
---

> **这是示例数据（`sample: true`）**，不是真实的个人介绍。
> 站点的 `/about/` 页在 T3.2 会读取本文件；真实内容由用户在 T2.2 提供后替换。

## 这个知识库是什么

一个个人知识 OS：把 `profile / knowledge / projects / journal / errors` 五类 Markdown 内容，
经 zod 契约校验后编译成静态站点，并提供全文搜索。内容是唯一事实来源，站点只是产物。

## 字段说明

- 本条 `published: false`：示例数据不由 Agent 自行发布，必须由用户确认后才能置 `true`。
- `published: true` 的形态（含 `published_at` / `published_by: user`）只在测试夹具里验证，
  不写进真实内容目录——避免把模拟审批标成真实个人确认。
- 正文不含真实姓名、联系方式、家庭或健康细节（P0-1）。
