# QA 测试方案 — 正向与反向用例

> 归属：A5。本方案定义 R-01..R-12（反向/红灯）与 P-01..P-04（正向/绿灯）的
> 构造方法、期望行为、复现步骤与证据要求。
> **当前基线状态**：`scripts/validate-content.mjs` 尚未落地（T2.1 未合并），
> 所有 R/P 用例均为「待测试」，本方案不虚构通过结果。待 T2.1 合入 main 后，
> A5 在独立克隆中按本方案复现并记录真实输出。

## 1. 复现环境的独立性约束

A5 只读业务代码，**不得**在共享仓库里写 `content/**` 夹具。复现统一走：

```
git clone https://github.com/cvcingcvc-code/141.git /tmp/141-qa-<日期>
# 或：git worktree add F:/141-wt/a5-qa-fixture <base> 后用 cp 注入夹具再丢弃
cp qa/fixtures/<case>/<文件> <clone>/content/<对应目录>/
cd <clone> && npm ci && npm run validate
```

夹具放在本仓库 `qa/fixtures/`（A5 自己的区域），复制到临时克隆后执行，用完即弃，
不进入 `content/**`、不进 main。

## 2. 反向用例（必须失败）

> 判定标准：`npm run validate` 输出对应 `V-xxx` 且 exit 1；贴完整输出，
> 不截断关键行。R-07/R-08 需额外用产物检索验证「静默不发布」。

### R-01 `status: verified` 且 `sources: []`
- 构造：`content/knowledge/kb-eng-900-r1.md`，`status: verified`，`sources: []`。
- 期望：`V-009`，exit 1。
- 契约：C-5 / V-009。

### R-02 `related` 引用不存在的 id
- 构造：`related: [KB-NOT-EXIST]`。
- 期望：`V-008`。
- 契约：C-5 / V-008。

### R-03 文件名前缀 ≠ id 小写
- 构造：文件名 `kb-eng-777-x.md`，frontmatter `id: KB-ENG-001`。
- 期望：`V-006`。
- 契约：C-1 / V-006。

### R-04 `agent-drafted` + `approved` 缺 `approved_at`
- 构造：journal，`source: agent-drafted`、`review_status: approved`，缺 `approved_at`。
- 期望：`V-011`。
- 契约：C-7 审批矩阵 / V-011。

### R-05 正文含邮箱
- 构造：任意条目正文写入 `someone@example.com`（或真实样式邮箱）。
- 期望：`V-010`。注意：文档示例值会被白名单化，本用例需用**真实样式**邮箱
  （如 `foo@bar.com`）验证校验器确实拦截。
- 契约：V-010。

### R-06 `tags` 超过 12 项
- 构造：`tags` 给 13 个合法 kebab-case 项。
- 期望：`V-014`。
- 契约：C-3 / V-014。

### R-07 journal `review_status: draft`（静默不发布）
- 构造：合法 journal 条目但 `review_status: draft`。
- 期望：validate 不报错；但构建产物（`dist/data/content.json`、Pagefind 索引、页面）
  中**不存在**该条目。
- 验证：`grep -rn "<标题>" dist/` 应 0 命中。
- 契约：C-7 / C-10。

### R-08 `published: false`（静默不发布）
- 构造：合法条目显式 `published: false`。
- 期望：站点 / 搜索索引 / content.json 三处均不存在。
- 验证：三处分别 grep，0 命中。
- 契约：C-3 / C-10。

### R-09 journal 日期四要素不一致
- 构造：文件名 `2026-11-07.md` 但 `date: 2026-11-06`（或目录年份不符）。
- 期望：报 `V-017`，**不得**报 `V-006`。
- 契约：C-1/C-2/C-7 / V-017。

### R-10 越界改动被 `scope:check` 拦截
- 构造：在 `feat/a3-*` 分支改 `content/knowledge/*.md`。
- 期望：`npm run scope:check` exit 1，逐条打印「属于 A2」。
- 契约：C-17。当前状态：T4.1 未落地，本用例「待测试」。

### R-11 人工标识字段出现 agent 值
- 构造：`approved_by: agent`（或 `a1`/`bot`）或 `published_by: bot`。
- 期望：`V-019`。
- 契约：C-3/C-7 / V-019。

### R-12 `published: true` 缺 `published_at`/`published_by`
- 构造：`published: true`，缺 `published_at` 或 `published_by`。
- 期望：`V-021`。
- 契约：C-3 / V-021。

## 3. 正向用例（必须不报错）

> 判定标准：`npm run validate` exit 0；且确认「修完没误伤合法形态」。

### P-01 `agent-drafted` + `draft`，无审批字段
- 构造：journal，`source: agent-drafted`、`review_status: draft`，不写
  `approved_at`/`approved_by`。
- 期望：**不报错**（P1-1 回归点），且不发布。
- 契约：C-7 审批矩阵。

### P-02 journal 命名例外
- 构造：`content/journal/2026/2026-11-06.md`，id `DJ-2026-11-06`，`date: 2026-11-06`。
- 期望：**不报 `V-006`**，`V-017` 通过（P1-2 回归点）。
- 契约：C-1/C-2 消歧义。

### P-03 `status: seed` + `sources: []`
- 构造：knowledge，`status: seed`，`sources: []`。
- 期望：不报错，站点显示「未标注来源」。
- 契约：C-5 / C-13 `SourceList`。

### P-04 新条目不写 `published` 字段
- 构造：合法条目**完全不写** `published`。
- 期望：validate 不报错（默认 `false`）；三处产物均不存在。
- 契约：C-3 默认值语义。

## 4. 证据规则

1. 命令 + 完整输出（粘进验收文档，不截断关键行）。
2. 截图路径 `qa/evidence/<里程碑>/<编号>.png`（画面含 URL 或时间）。
3. 可被第三人复现的操作步骤序列（即本方案的构造步骤）。

禁止的「证据」：只写「已验证」、只贴 `✓ built`、只给单元测试绿灯、口头确认。
