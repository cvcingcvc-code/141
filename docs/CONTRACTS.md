# CONTRACTS.md — 统一接口契约（冻结候选 v1.0.0）

> **这是本项目唯一的跨模块协议。契约未冻结前，任何 Agent 不得开始编码。**
> 变更必须走 `docs/rfc/`，由主 Agent 裁决并升版本号。
> 本文件与代码冲突时，**以本文件为准**，代码视为缺陷。

契约版本：`1.0.0`
契约 ID 前缀约定：`C-*` 为契约条款，`V-*` 为校验错误，`W-*` 为校验警告。QA 缺陷单必须引用这些编号。

---

## C-1 内容目录与文件命名

| 类型 | 目录 | 文件名规则 | 示例 |
| --- | --- | --- | --- |
| profile | `content/profile/` | 固定 `profile.md`（唯一） | `content/profile/profile.md` |
| knowledge | `content/knowledge/` | `<id 小写>-< slug >.md` | `content/knowledge/kb-eng-001-git-rebase.md` |
| projects | `content/projects/` | `<id 小写>-< slug >.md` | `content/projects/pj-141-personal-knowledge-os.md` |
| journal | `content/journal/<YYYY>/` | `<YYYY-MM-DD>.md` | `content/journal/2026/2026-11-06.md` |
| errors | `content/errors/` | `<id 小写>-< slug >.md` | `content/errors/er-20261106-01-win-sqlite-wal.md` |

规则：
- 允许字母/数字/`-`，全小写，无空格、无中文文件名。
- 文件名必须以 `id` 的小写形式为前缀（`V-006`）。
- 不允许在 `content/` 下新增其他子目录而不改契约。

## C-2 id 规范

| 类型 | 格式 | 正则 | 示例 |
| --- | --- | --- | --- |
| knowledge | `KB-<DOMAIN>-<3位序号>` | `^KB-[A-Z]{2,6}-\d{3}$` | `KB-ENG-001` |
| project | `PJ-<3位序号或短码>` | `^PJ-[A-Z0-9]{2,8}$` | `PJ-141` |
| journal | `DJ-YYYY-MM-DD` | `^DJ-\d{4}-\d{2}-\d{2}$` | `DJ-2026-11-06` |
| error | `ER-YYYYMMDD-NN` | `^ER-\d{8}-\d{2}$` | `ER-20261106-01` |
| profile | 固定 | `^profile$` | `profile` |

- id 全局唯一（前缀已天然分域），一经使用不得复用或改号（改号=断链）。
- `DOMAIN` 取 `C-4` 的 domain 枚举的大写缩写（`engineering→ENG`、`product→PRD`、`design→DSN`、`data→DAT`、`finance→FIN`、`language→LNG`、`health→HLT`、`life→LIF`、`meta→MET`）。

## C-3 公共 frontmatter（五类内容都必须有）

```yaml
id: KB-ENG-001              # string, 必填，见 C-2
type: knowledge             # enum: profile|knowledge|project|journal|error，必填，必须与所在目录一致
title: Git rebase 与 merge 的取舍   # string, 必填, 4..80 字符
summary: 一句话说清这条内容解决什么问题  # string, 必填, 20..200 字符
created: 2026-11-06         # date(YYYY-MM-DD), 必填
updated: 2026-11-06         # date(YYYY-MM-DD), 必填, 不得早于 created
visibility: public          # enum: public|private, 默认 public
tags: [git, workflow]       # string[], 0..12 项, 小写 kebab-case
sample: false               # boolean, 默认 false；true 表示示例内容，站点必须显示「示例」徽章
```

`visibility: private` 的条目：不进站点、不进搜索索引、不进 `content.json`，但仍在 git 中（可追溯）。

## C-4 枚举与受控词表

| 枚举 | 取值 | 用于 |
| --- | --- | --- |
| `domain` | `engineering` `product` `design` `data` `finance` `language` `health` `life` `meta` | knowledge |
| `knowledge.status` | `seed`（萌芽，未验证）`verified`（已核实）`stale`（过时待复核）`archived`（归档） | knowledge |
| `confidence` | `low` `medium` `high` | knowledge |
| `source.kind` | `url` `book` `paper` `course` `person` `experience` `agent` | knowledge.sources |
| `project.status` | `idea` `active` `paused` `shipped` `archived` | projects |
| `error.severity` | `low` `medium` `high` | errors |
| `evidence.kind` | `commit` `pr` `log` `url` `none` | errors.evidence |
| `journal.review_status` | `draft` `approved` | journal |
| `journal.source` | `self-reported` `agent-drafted` | journal |

`tags` 使用 `docs/TAXONOMY.md` 的受控标签表；未登记标签产生警告 `W-001`（不阻断，但需在 PR 中说明或登记）。

## C-5 knowledge 专属字段

```yaml
domain: engineering
status: verified
confidence: high
sources:                     # 必填（可为空数组，但 status=verified 时必须 ≥1 项，见 V-009）
  - kind: book
    ref: "Pro Git, 2nd Edition"
    locator: "Ch.3 Rewriting History"
    accessed: 2026-11-04     # 可选
    note: "rebase 的交互模式说明"  # 可选
related: [KB-ENG-002]        # string[]，必须是已存在的 knowledge id（V-008）
```

- `sources: []` 且 `status: seed` → 允许，但站点必须显示「未标注来源」徽章。
- `sources: []` 且 `status: verified` → **错误**（`V-009`）。这是"知识真实可追溯"的硬约束。
- `confidence: high` 必须至少有 1 个 `kind != agent` 的来源。

## C-6 projects 专属字段

```yaml
status: active
role: 主架构 / 唯一开发者
period:
  start: 2026-11          # YYYY-MM
  end: null               # YYYY-MM 或 null（进行中）
stack: [astro, markdown, github-actions]
links:                    # 可选
  - label: Repository
    url: https://github.com/cvcingcvc-code/141
outcomes:                 # string[]，必填 ≥1，必须是可验证结果（禁止"提升了很多"这类空话）
  - "实现五类内容受控 schema，CI 拦截非法条目"
linked_knowledge: []      # knowledge id[]
linked_errors: []         # error id[]
```

## C-7 journal 专属字段

```yaml
date: 2026-11-06          # 必填，必须等于文件名与 id 中的日期（V-017）
review_status: approved    # draft|approved；只有 approved 才发布
source: self-reported      # self-reported|agent-drafted
approved_at: 2026-11-06    # agent-drafted 必填（人工审核日期，V-011），self-reported 可省
approved_by: user          # agent-drafted 必填
energy: 3                  # 1..5，可选
did: ["完成仓库审计"]       # string[]，必填 ≥1
learned: ["空仓库不能靠假设推进"]  # string[]，必填 ≥1
blocked: ["素材缺失"]       # string[]，可空
tomorrow: ["冻结契约"]      # string[]，可空
linked_knowledge: []       # knowledge id[]
linked_projects: []        # project id[]
linked_errors: []          # error id[]
raw_source: "文件：docs/inbox/2026-11-06.txt"  # 可选；数据源未接通时必须写「未接通」
```

**硬规则**：`source: agent-drafted` 的内容，在任何情况下都不得由 Agent 自行设为 `approved`；`approved_at`/`approved_by` 只能由用户确认后填写。

## C-8 errors 专属字段

```yaml
occurred: 2026-11-06
severity: medium
symptom: 构建时 frontmatter 解析失败
context: Windows + CRLF 文件被写入后重新检出
root_cause: .gitattributes 缺失导致 CRLF 混入
fix: 增加 .gitattributes 强制 LF
prevention: 提交前校验 + CI 检查行尾
evidence:
  - kind: commit
    ref: 9fdd3c7
project: PJ-141           # 可选，project id
```

`symptom` / `context` / `root_cause` / `fix` / `prevention` 五项必填且各 ≥8 字符 —— 缺任何一项即视为"只抱怨没沉淀"，校验失败（`V-016`）。

## C-9 路由契约

所有路由以 `/` 结尾，一律通过 `import.meta.env.BASE_URL` 拼前缀，禁止硬编码根路径。

| 路由 | 页面 | 数据来源 |
| --- | --- | --- |
| `/` | 首页 | profile + 最近 3 条 journal + 最近 3 条 knowledge + projects |
| `/about/` | 个人介绍 | profile |
| `/knowledge/` | 知识列表（分页 ≥20/页） | knowledge(public) |
| `/knowledge/[id]/` | 知识详情 | 单条（id 小写） |
| `/knowledge/tag/[tag]/` | 标签聚合 | 按 tag 过滤 |
| `/knowledge/domain/[domain]/` | 领域聚合 | 按 domain 过滤 |
| `/projects/` | 项目列表 | projects |
| `/projects/[id]/` | 项目详情（聚合关联知识/错误/复盘） | project + 关联 |
| `/journal/` | 复盘时间线 | journal(approved) |
| `/journal/[date]/` | 复盘详情（`YYYY-MM-DD`） | 单条 |
| `/errors/` | 错误经验列表 | errors |
| `/errors/[id]/` | 错误详情 | 单条 |
| `/search/` | 全文搜索 | Pagefind |
| `/404` | 未找到 | — |

不存在的 id 必须返回 404 页面，不得渲染空白页。

## C-10 构建产物数据契约

`dist/data/content.json`

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-11-06T05:40:00.000Z",
  "base": "/141/",
  "counts": { "knowledge": 3, "projects": 1, "journal": 2, "errors": 1, "profile": 1 },
  "items": [
    {
      "id": "KB-ENG-001",
      "type": "knowledge",
      "title": "Git rebase 与 merge 的取舍",
      "summary": "一句话说清这条内容解决什么问题",
      "path": "/knowledge/kb-eng-001/",
      "tags": ["git"],
      "domain": "engineering",
      "status": "verified",
      "updated": "2026-11-06"
    }
  ]
}
```

- `path` 不含 base 前缀（便于迁移）；消费方自行拼 `base`。
- 只包含已发布条目（public + approved）。
- 字段名、类型、必填性 = 契约；新增字段需 RFC。

`dist/data/graph.json`

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-11-06T05:40:00.000Z",
  "nodes": [{ "id": "PJ-141", "type": "project", "title": "Personal Knowledge OS", "path": "/projects/pj-141/" }],
  "edges": [{ "from": "PJ-141", "to": "KB-ENG-001", "kind": "project-ref" }]
}
```

`kind` 取值：`related` | `project-ref` | `journal-ref` | `error-project`。悬空边一律丢弃并在构建日志 warn。

`dist/pagefind/**`：由 Pagefind 生成，不得手工编辑。

## C-11 命令契约

| 命令 | 语义 | 谁维护 |
| --- | --- | --- |
| `npm ci` | 干净安装，CI 唯一安装方式 | 主 Agent |
| `npm run validate` | 内容校验；成功 exit 0，失败 exit 1 | Agent 2 |
| `npm run build` | 构建站点 + 生成 data + pagefind 索引 | Agent 4（脚本）/ Agent 3（页面） |
| `npm run dev` | 本地开发服务器 | Agent 3 |
| `npm run preview` | 预览构建产物（**验收搜索必须用它**） | Agent 3 |
| `node qa/scripts/*.mjs` | QA 专用脚本，不经 package.json | Agent 5 |

- `validate` 的输出格式：每行 `<code> <相对路径>:<字段> <消息>`，最后一行 `N errors, M warnings`。
- 任何 Agent 除主 Agent 外不得修改 `package.json` / `package-lock.json`；需要新依赖 → 提 RFC，由主 Agent 安装。

## C-12 校验规则清单

错误（exit 1，阻断合并）：

| 编号 | 规则 |
| --- | --- |
| V-001 | frontmatter 缺失或 YAML 无法解析 |
| V-002 | 公共必填字段缺失（C-3） |
| V-003 | 字段类型或枚举值非法 |
| V-004 | id 不符合类型前缀正则（C-2） |
| V-005 | id 重复 |
| V-006 | 文件名前缀 ≠ id 小写 |
| V-007 | 日期非 `YYYY-MM-DD`，或 `updated < created` |
| V-008 | `related` / `linked_*` / `project` 引用的 id 不存在 |
| V-009 | `status: verified` 但 `sources` 为空；或 `confidence: high` 且仅有 agent 来源 |
| V-010 | 命中敏感信息（邮箱、手机号、`sk-`/`ghp_`/`AKIA` 类密钥）且不在允许字段 |
| V-011 | `agent-drafted` 缺 `approved_at` / `approved_by` |
| V-012 | `type` 与所在目录不一致 |
| V-013 | `summary` 不在 20..200 字符 |
| V-014 | `tags` 超 12 项或格式非法（非小写 kebab） |
| V-015 | public 条目引用了 private 条目 |
| V-016 | errors 五要素缺失或过短（C-8） |
| V-017 | journal 文件名/ id / `date` 三者不一致 |
| V-018 | `content/profile/profile.md` 缺失或 id ≠ `profile` |

警告（不阻断，但需在 PR 说明）：

| 编号 | 规则 |
| --- | --- |
| W-001 | tag 不在 TAXONOMY 受控表 |
| W-002 | `sample: true` 条目超过全部条目 50% |
| W-003 | knowledge 条目 `updated` 超过 180 天 |
| W-004 | 正文 < 80 字符（疑似空壳） |
| W-005 | 正文内部链接指向不存在的路由 |

## C-13 组件接口契约

Agent 3 实现，Agent 2/4 消费时不得改动其 props。

| 组件 | Props（必填→可选） | 说明 |
| --- | --- | --- |
| `ContentCard` | `item`（含 id/title/summary/path/tags/updated）, `kind` | 列表卡片，必须展示 `sample` 徽章 |
| `StatusBadge` | `status`, `confidence?` | knowledge 状态与可信度 |
| `SourceList` | `sources`（C-5 结构）, `emptyHint` | 空来源必须渲染「未标注来源」 |
| `TagList` | `tags`, `baseHref` | 链接到 tag 聚合页 |
| `Timeline` | `items`（journal 数组）, `groupBy`（`year`\|`month`） | 复盘时间线 |
| `RelationList` | `ids`, `kind`, `titlesIndex` | 关联条目反查展示 |
| `SearchBox` | `bundlePath` | Pagefind UI，`bundlePath = BASE_URL + 'pagefind/'` |

## C-14 分支 / 提交 / PR 契约

- 分支：`feat/a2-*`（Agent 2）、`feat/a3-*`（Agent 3）、`feat/a4-*`（Agent 4）、`qa/a5-*`（Agent 5）、`docs/*`、`fix/*`、`chore/*`。
- 提交：Conventional Commits，`type(scope): subject`，scope ∈ `content|site|ci|docs|qa|contract`。
- PR：必须包含 本轮目标 / 变更文件与原因 / 关联任务 ID（如 `T2.3`）/ 运行过的命令与输出 / 验收证据 / 未解决问题 / 是否触碰契约。
- 合并：squash merge，`main` 禁止 force push，禁止自审自合（Agent 的 PR 由主 Agent 审）。

## C-15 契约变更流程

1. 在 `docs/rfc/RFC-<序号>-<slug>.md` 写明：动机、影响面（字段/路由/产物/组件）、迁移方案、回滚方案。
2. 在 PR 中标注 `contract-change` 标签。
3. 主 Agent 裁决；通过后同步修改本文件（升 `1.0.x`/`1.1.0`）、`schema.ts`、`validate-content.mjs`、受影响的页面。
4. 三者（文档、schema、校验器）必须在**同一个 PR** 内一致，否则视为契约撕裂。

## C-16 冻结记录

| 版本 | 日期 | 状态 | 备注 |
| --- | --- | --- | --- |
| 1.0.0 | 2026-11-06 | **候选，待用户批准 D1–D5 后冻结** | 首版，随 `docs/phase0-contracts` 提交 |
