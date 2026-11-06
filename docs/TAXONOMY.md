# TAXONOMY.md — 领域与标签受控词表

> 目的：让分类长期不腐化。标签不是自由词，新增要登记。
> 未登记的标签产生 `W-001` 警告；同一含义的多个写法（`git` / `Git` / `git使用`）是缺陷。

## 1. 领域（domain，单选，来自 CONTRACTS C-4）

| domain | 中文 | 收录什么 | 不收录 |
| --- | --- | --- | --- |
| `engineering` | 工程 | 编程语言、工具链、架构、调试、CI/CD、系统 | 团队管理（→ meta） |
| `product` | 产品 | 需求、范围、优先级、用户研究、取舍 | 具体代码实现（→ engineering） |
| `design` | 设计 | 交互、排版、视觉、可用性 | 前端性能（→ engineering） |
| `data` | 数据 | 数据分析、指标体系、统计、可视化方法 | 业务结论（→ product） |
| `finance` | 财务 | 记账、投资、成本、定价 | 宏观经济泛读（→ meta） |
| `language` | 语言 | 英语学习、表达、写作方法 | — |
| `health` | 健康 | 睡眠、运动、精力管理 | 医疗诊断结论（需标注来源且 `confidence: low` 起） |
| `life` | 生活 | 习惯、家庭、旅行、生活系统 | — |
| `meta` | 元认知 | 学习方法、复盘方法、思维模型、协作 | 具体领域知识 |

判定顺序：先问"这条知识被用在哪个领域的工作里"，再问"它本身讲的是什么"。二者冲突时取**前者**。

## 2. 标签命名规则

- 全小写，kebab-case，2–24 字符，仅 `a-z0-9-`。
- 用名词或名词短语，不用句子：`cache-invalidation` ✅ / `如何避免缓存失效` ❌
- 单复数统一用单数：`test` 而非 `tests`。
- 不建层级标签（`git/rebase` ❌），需要层级用 `related` 关联。
- 一条内容 ≤12 个标签；超过说明这条内容该拆分。

## 3. 初始受控标签表

工程：`git` `testing` `debugging` `ci-cd` `architecture` `typescript` `javascript` `python` `node` `sql` `performance` `security` `refactoring` `tooling` `windows`

产品：`requirement` `scope` `roadmap` `user-research` `tradeoff` `mvp`

设计：`layout` `typography` `accessibility` `responsive` `color`

数据：`metric` `visualization` `statistics` `data-modeling`

财务：`budget` `investing` `pricing`

语言：`english` `writing` `speaking` `vocabulary`

健康：`sleep` `exercise` `energy`

生活：`habit` `routine` `travel`

元认知：`learning` `review` `mental-model` `agent-collaboration` `decision-making` `note-taking`

跨域高频：`workflow` `documentation` `automation` `knowledge-base`

## 4. 标签增删流程

1. 在 PR 中提出：标签名 + 一句话定义 + 为什么现有标签覆盖不了。
2. 主 Agent 批准后，本文件新增一行（保持分组）。
3. 若为改名/合并：必须同 PR 内批量更新所有引用该标签的 `content/**`，否则校验会留下孤儿标签。

## 5. 健康检查（QA 阶段执行）

- 出现"只被 1 条内容使用"的标签 ≥5 个 → 提示合并。
- 同一标签下条目 >30 条 → 提示拆分或加 domain 子视图。
- 任意标签名不在本文件 → `W-001`，累积 3 个以上视为内容质量问题。
