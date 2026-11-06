---
id: KB-ENG-002
type: knowledge
title: Schema 校验只能证明形状合规
summary: 区分"结构合规"与"内容为真"两种不同的质量断言，避免把校验器绿灯当成事实核验。
created: 2026-11-06
updated: 2026-11-06
published: true
published_at: 2026-11-06
published_by: user
tags: [testing, architecture]
sample: true
vault_ref: null
domain: engineering
status: seed
confidence: low
sources: []
related:
  - KB-ENG-001
---

> **这是示例数据（`sample: true`）**：本条刻意使用 `status: seed` + `sources: []` 的形态，
> 用于验证 P-03（不报错）与站点必须显示「未标注来源」徽章（C-5 / C-13）。

## 两类不同的断言

- **结构合规**：字段在、类型对、枚举取值合法、id 与文件名一致 —— zod 能管，机器可判。
- **内容为真**：这条知识确实成立、来源确实支持它 —— zod 管不了，只能靠 `sources` 可追溯 + 人工复核。

把两者混为一谈的典型后果：校验器全绿，但库里的结论是错的，而且没人知道它从哪来。

## 对本仓库的含义

`V-009` 只做了一件很窄的事：`status: verified` 时不许 `sources` 为空。
它是必要条件，不是充分条件 —— 有来源也可能读错，没来源也可能对。所以：

1. 不确定的条目写 `status: seed` + `confidence: low`，别为了让徽章好看改成 `verified`。
2. `confidence: high` 要求至少一个非 `agent` 来源，这条规则挡的是"自己说服自己"。
3. 校验器给出的是"可以进入 review"，不是"已核实"。
