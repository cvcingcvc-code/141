# DF-<NNN> <一句话现象>

<!--
  缺陷报告模板（ACCEPTANCE §8）。复制本文件为 docs/qa/defects/DF-<NNN>.md 后填写。
  编号从 001 递增；一个缺陷一张单；不写「原因不明」，根因必须定位到文件与行为。
-->

- 严重级：`P0` / `P1` / `P2`
- 关联契约：`C-10` / `V-009`（引用 CONTRACTS 编号）
- 关联任务：`T3.2`（引用 TASKS 任务 ID）
- 发现环境：URL + commit（`git rev-parse --short HEAD`）+ 浏览器/视口
- 发现人 / 日期：A5 / YYYY-MM-DD

## 复现步骤

1. …
2. …
3. …

## 期望 / 实际

- 期望：…
- 实际：…

```text
（贴原文输出或命令结果；截图放在 qa/evidence/<里程碑>/DF-<NNN>.png）
```

## 根因

（必须定位到文件与行为，例如「`src/lib/collections.ts` 的过滤条件未排除 draft」。）

## 修复

- Commit：`<sha>`
- 变更文件：…
- 修复范围说明：为何这是最小修复（不夹带无关重构）

## 回归证据

- 命令/操作：…
- 结果：…
