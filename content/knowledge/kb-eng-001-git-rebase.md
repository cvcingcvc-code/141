---
id: KB-ENG-001
type: knowledge
title: Git rebase 与 merge 的取舍
summary: 用一条可复述的判断规则区分何时该 rebase、何时该 merge，避免把共享历史改坏。
created: 2026-11-06
updated: 2026-11-06
published: false
tags: [git, workflow]
sample: true
vault_ref: null
domain: engineering
status: verified
confidence: high
sources:
  - kind: book
    ref: "Pro Git, 2nd Edition"
    locator: "Ch.3.6 Rebasing"
    accessed: 2026-11-04
    note: "rebase 的交互模式与黄金法则"
related:
  - KB-ENG-002
---

> **这是示例数据（`sample: true`）**：本条用于验证 knowledge 的字段契约（domain/status/confidence/sources/related）
> 与"显式发布"链路，正文为公开技术常识，不含任何个人经历。

## 一条够用的判断规则

- **分支还没有别人在用** → `rebase`，历史线性、便于 review。
- **分支已经推送并被他人拉取** → `merge`，不改写公共历史。

## 为什么

`rebase` 的本质是"把提交重新种到新基点上"，每条提交都会换 SHA。别人基于旧 SHA 的工作会瞬间分叉，
于是需要 force push，而 force push 会覆盖别人已推送的提交。`merge` 只新增一个合并提交，不改历史。

## 落地习惯

1. 本地整理提交用 `git rebase -i`，推之前做。
2. 一旦 `git push` 过、且有人基于它工作，就只 `merge`。
3. 合并前先 `git fetch`，确认远端没有超出预期的提交。

关联条目：`KB-ENG-002`（反向引用已在 frontmatter 的 `related` 里声明；正文不硬编码 `/141/...` 路由，
否则条目未发布时会变成必然 404，即 `W-005`）。
