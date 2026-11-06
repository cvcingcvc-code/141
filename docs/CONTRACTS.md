# CONTRACTS.md — 统一接口契约（v1.0.0 / rc4）

> **这是本项目唯一的跨模块协议。变更必须走 `docs/rfc/`，由主 Agent 裁决并升版本号。**
> 本文件与代码冲突时，**以本文件为准**，代码视为缺陷。

契约版本：`1.0.0`（rc4，2026-11-06；rc2 修订 P0-1/P0-2/P1-1..P1-5；rc3 将 `published` 默认改为 `false` 并补审批证据字段；rc4 为 Wave 1 集成修正：补齐 `npm test` / `typecheck` 命令与 `src/content.config.ts` 归属，无字段/路由/产物变更）
契约 ID 前缀约定：`C-*` 为契约条款，`V-*` 为校验错误，`W-*` 为校验警告。QA 缺陷单必须引用这些编号。

---

## C-1 内容目录与文件命名

| 类型 | 目录 | 文件名规则 | 示例 |
| --- | --- | --- | --- |
| profile | `content/profile/` | 固定 `profile.md`（唯一） | `content/profile/profile.md` |
| knowledge | `content/knowledge/` | `<id 小写>-<slug>.md` | `content/knowledge/kb-eng-001-git-rebase.md` |
| projects | `content/projects/` | `<id 小写>-<slug>.md` | `content/projects/pj-141-personal-knowledge-os.md` |
| journal | `content/journal/<YYYY>/` | `<YYYY-MM-DD>.md` | `content/journal/2026/2026-11-06.md` |
| errors | `content/errors/` | `<id 小写>-<slug>.md` | `content/errors/er-20261106-01-win-sqlite-wal.md` |

规则：
- 允许字母/数字/`-`，全小写，无空格、无中文文件名。
- 除 journal 外，文件名必须以 `id` 的小写形式为前缀（`V-006`）。
- **journal 是唯一的命名例外**：它没有 id 前缀，文件名即日期 `YYYY-MM-DD.md`，id 由日期派生为 `DJ-<date>`；四者一致性由 `V-017` 校验，不适用 `V-006`。
- 不允许在 `content/` 下新增其他子目录而不改契约。

## C-2 id 规范

| 类型 | 格式 | 正则 | 示例 |
| --- | --- | --- | --- |
| knowledge | `KB-<DOMAIN>-<3位序号>` | `^KB-[A-Z]{2,6}-\d{3}$` | `KB-ENG-001` |
| project | `PJ-<2..8位大写字母数字>` | `^PJ-[A-Z0-9]{2,8}$` | `PJ-141` |
| journal | `DJ-YYYY-MM-DD` | `^DJ-\d{4}-\d{2}-\d{2}$` | `DJ-2026-11-06` |
| error | `ER-YYYYMMDD-NN` | `^ER-\d{8}-\d{2}$` | `ER-20261106-01` |
| profile | 固定 | `^profile$` | `profile` |

- id 全局唯一（前缀已天然分域），一经使用不得复用或改号（改号=断链）。
- `DOMAIN` 取 `C-4` 的 domain 枚举的大写缩写（`engineering→ENG`、`product→PRD`、`design→DSN`、`data→DAT`、`finance→FIN`、`language→LNG`、`health→HLT`、`life→LIF`、`meta→MET`）。
- **journal 的 id 与文件名关系（消歧义）**：`id = "DJ-" + 文件名去扩展名`。即 `2026-11-06.md` ↔ `DJ-2026-11-06`。这是 `V-006` 唯一的合法例外，原因是 journal 以日期为唯一自然键，让人直接按日期读写比加前缀更可靠。

## C-3 公共 frontmatter（五类内容都必须有）

```yaml
id: KB-ENG-001              # string, 必填，见 C-2
type: knowledge             # enum: profile|knowledge|project|journal|error，必填，必须与所在目录一致
title: Git rebase 与 merge 的取舍   # string, 必填, 4..80 字符
summary: 一句话说清这条内容解决什么问题  # string, 必填, 20..200 字符
created: 2026-11-06         # date(YYYY-MM-DD), 必填
updated: 2026-11-06         # date(YYYY-MM-DD), 必填, 不得早于 created
published: false            # boolean, **默认 false**。新增内容必须明确置 true 才能发布
published_at: 2026-11-06    # date, published=true 时必填（V-021）
published_by: user          # published=true 时必填，必须是人工标识（V-019/V-021）
tags: [git, workflow]       # string[], 0..12 项, 小写 kebab-case
sample: false               # boolean, 默认 false；true 表示示例内容，站点必须显示「示例」徽章
vault_ref: null             # 可选, 形如 "vault:journal/2026/2026-11-06-raw.md"，见 C-18
```

### `published` 的语义（**P0-1 修订重点**）

- `published` **默认 `false`**：任何新增内容（尤其是 Agent 添加的）默认不发布。只有把 `false` 显式改为 `true` 才会上站。
- **审批证据字段不等于审批机制**：`published_at` / `published_by` 是声明性证据，Agent 也能填。因此真正的门禁是 —— **内容只有在用户确认合入 `main` 后才会上站**（deploy 只从 main 构建）。把 `published` 从 `false` 改为 `true` 的改动，必须出现在经用户确认的 PR 里；`published_by: user` 只是这次人工确认留下的标记。
- `published: false` **只表示"不发布到站点"**，它**不代表**保密。本仓库是公开仓库，`git log` 永久可查，任何写入仓库的字节都视为已公开。
- 因此：**不得公开的原文一律不进本仓库**（无论 `published` 取值），只能存仓库外的私密库并用 `vault_ref` 指针引用（C-18）。
- `published: false` 的合法用途只有两种：内容已脱敏但暂缓发布；内容仍在整理、结构未定。
- 历史泄漏不能靠"删文件"挽回：一旦提交，按 C-18 的事故流程处理。

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
date: 2026-11-06          # 必填，必须等于文件名、目录年份与 id 中的日期（V-017）
review_status: approved    # draft|approved；只有 approved 才发布
source: self-reported      # self-reported|agent-drafted
approved_at: 2026-11-06    # 仅 approved 时必填（V-011）
approved_by: user          # 仅 approved 时必填，取值见 V-019
energy: 3                  # 1..5，可选
did: ["完成仓库审计"]       # string[]，必填 ≥1
learned: ["空仓库不能靠假设推进"]  # string[]，必填 ≥1
blocked: []                # string[]，可空
tomorrow: []               # string[]，可空
linked_knowledge: []       # knowledge id[]
linked_projects: []        # project id[]
linked_errors: []          # error id[]
raw_source: "vault:journal/2026/2026-11-06-raw.md"  # 可选；原始记录只能指向仓库外私密库
```

### 审批矩阵（**P1-1 修订重点**）

| `source` | `review_status` | 审批字段 | 是否发布 | 说明 |
| --- | --- | --- | --- | --- |
| `self-reported` | `draft` | 不限 | ❌ | 本人写但未定稿 |
| `self-reported` | `approved` | 建议填 `approved_at`/`approved_by`，不强制 | ✅ | 本人确认 |
| `agent-drafted` | `draft` | **允许缺失**（这是合法状态） | ❌ | Agent 起草、待审 |
| `agent-drafted` | `approved` | **`approved_at` + `approved_by` 必填**（`V-011`） | ✅ | 且 `approved_by` 必须是人工标识（`V-019`） |

硬规则：
1. **自动化 Agent 不得把 `review_status` 从 `draft` 改为 `approved`**。该字段只能由用户确认后、由用户或 A1 按用户明确指示修改。
2. `approved_by` 只允许人工标识：`user`（或用户后续指定的固定标识）。出现 `agent`/`bot`/`a1`..`a5`/`system` 等值直接报 `V-019`。
3. `approved` 但缺审批证据 → `V-011`，视为伪造审批。
4. **`draft` 也必须满足公开仓库的隐私要求**（P0-1）：草稿同样在 git 里，含私密原文一律不入库，走 `vault_ref`。

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

## C-9 路由契约（**P1-5 修订：13 条收敛为 12 条**）

v0.1 只做"读一条内容"必需的页面，聚合类页面延后。所有路由以 `/` 结尾（404 除外），一律通过 `import.meta.env.BASE_URL` 拼前缀，禁止硬编码根路径。

| # | 路由 | 页面 | 数据来源 |
| --- | --- | --- | --- |
| 1 | `/` | 首页 | profile + 最近 3 条 journal + 最近 3 条 knowledge |
| 2 | `/about/` | 个人介绍 | profile |
| 3 | `/knowledge/` | 知识列表（单页，v0.1 不做分页） | knowledge |
| 4 | `/knowledge/[id]/` | 知识详情 | 单条（id 小写） |
| 5 | `/projects/` | 项目列表 | projects |
| 6 | `/projects/[id]/` | 项目详情 + 关联条目**纯文本链接列表** | project + `linked_*` |
| 7 | `/journal/` | 复盘列表（日期倒序，v0.1 不做年份分组） | journal(approved) |
| 8 | `/journal/[date]/` | 复盘详情（`YYYY-MM-DD`） | 单条 |
| 9 | `/errors/` | 错误经验列表 | errors |
| 10 | `/errors/[id]/` | 错误详情 | 单条 |
| 11 | `/search/` | 全文搜索 | Pagefind |
| 12 | `/404.html` | 未找到（GitHub Pages 固定文件名） | — |

**v0.1 明确不做（延后至 v0.2，本轮不得实现）**：
`/knowledge/tag/[tag]/`、`/knowledge/domain/[domain]/`、标签聚合、领域聚合、知识图谱渲染、`graph.json`、RSS、分页、第三方数据同步。

不存在的 id 必须落到 404 页面，不得渲染空白页。

## C-10 构建产物数据契约（**P1-5 修订：v0.1 只产出 content.json**）

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
      "updated": "2026-11-06",
      "sample": false
    }
  ]
}
```

- `path` 不含 base 前缀（便于迁移）；消费方自行拼 `base`。
- 只包含 `published: true` + `published_by: user` 且（journal）`review_status: approved` 的条目。`published` 默认 `false`，缺字段 = 不发布。
- 字段名、类型、必填性 = 契约；新增字段需 RFC。
- **`graph.json` 推迟到 v0.2**：它服务的是图谱与复杂聚合，不属于"输入 → 校验 → 展示 → 搜索 → 部署"这条必需链路。v0.1 不生成、不消费、不预留字段。

## C-11 命令契约

| 命令 | 语义 | 负责人 |
| --- | --- | --- |
| `npm ci` | 干净安装，CI 唯一安装方式 | A1 |
| `npm run validate` | 内容校验；成功 exit 0，失败 exit 1 | A2 |
| `npm run scope:check` | 分支改动范围校验（C-17），CI 与本地均可跑 | A4 |
| `npm test` | A2 的内容契约回归测试（`src/content/__tests__/*.test.mjs`）；**缺失即红，不得跳过** | A2 |
| `npm run typecheck` | `astro sync && tsc --noEmit`（先 sync 才有 `astro:content` 类型） | A1 |
| `npm run build` | 构建站点 + 生成 content.json + Pagefind 索引 | A4（脚本）/ A3（页面） |
| `npm run dev` | 本地开发服务器 | A3 |
| `npm run preview` | 预览构建产物（**验收搜索必须用它**） | A3 |
| `node qa/scripts/*.mjs` | QA 专用脚本，不经 package.json | A5 |

- `validate` 的输出格式：每行 `<code> <相对路径>:<字段> <消息>`，最后一行 `N errors, M warnings`。
- 任何 Agent 除 A1 外不得修改 `package.json` / `package-lock.json`；需要新依赖 → 提 RFC，由 A1 安装。

## C-12 校验规则清单

错误（exit 1，阻断合并）：

| 编号 | 规则 |
| --- | --- |
| V-001 | frontmatter 缺失或 YAML 无法解析 |
| V-002 | 公共必填字段缺失（C-3） |
| V-003 | 字段类型或枚举值非法 |
| V-004 | id 不符合类型前缀正则（C-2） |
| V-005 | id 重复 |
| V-006 | 文件名前缀 ≠ id 小写（**journal 例外，见 C-1/C-2，由 V-017 接管**） |
| V-007 | 日期非 `YYYY-MM-DD`，或 `updated < created` |
| V-008 | `related` / `linked_*` / `project` 引用的 id 不存在 |
| V-009 | `status: verified` 但 `sources` 为空；或 `confidence: high` 且仅有 agent 来源 |
| V-010 | 命中敏感信息（邮箱、手机号、身份证、`sk-`/`ghp_`/`AKIA` 类密钥、私钥块）。**对所有文件生效，包括 `published: false` 与 `draft`** |
| V-011 | `source: agent-drafted` 且 `review_status: approved`，但缺 `approved_at` 或 `approved_by` |
| V-012 | `type` 与所在目录不一致 |
| V-013 | `summary` 不在 20..200 字符 |
| V-014 | `tags` 超 12 项或格式非法（非小写 kebab） |
| V-015 | `published: true` 的条目引用了 `published: false` 的条目（站点会断链） |
| V-016 | errors 五要素缺失或过短（C-8） |
| V-017 | journal 的 `date` / 文件名 / 目录年份 / id 四者不一致 |
| V-018 | `content/profile/profile.md` 缺失或 id ≠ `profile` |
| V-019 | 人工标识字段（`approved_by`、`published_by`）不是人工标识（出现 `agent`/`bot`/`a1`..`a5`/`system` 等） |
| V-020 | `vault_ref` 格式非法（必须 `vault:<相对路径>`，不得是其他协议，不得指向仓库内路径） |
| V-021 | `published: true` 但缺 `published_at` 或 `published_by` |

警告（不阻断，但需在 PR 说明）：

| 编号 | 规则 |
| --- | --- |
| W-001 | tag 不在 TAXONOMY 受控表 |
| W-002 | `sample: true` 条目超过全部条目 50% |
| W-003 | knowledge 条目 `updated` 超过 180 天 |
| W-004 | 正文 < 80 字符（疑似空壳） |
| W-005 | 正文内部链接指向不存在的路由 |

> 校验器只能证明"结构合规"，不能证明"内容为真"，也不能证明"已脱敏"。后两者靠 C-18 与人工审核，不要混淆。

## C-13 组件接口契约（v0.1 最小集）

| 组件 | Props | 说明 |
| --- | --- | --- |
| `ContentCard` | `item`（id/title/summary/path/tags/updated/sample）, `kind` | 列表卡片；`sample` 为 true 时必须显示「示例」徽章 |
| `StatusBadge` | `status`, `confidence?` | knowledge 状态与可信度 |
| `SourceList` | `sources`, `emptyHint` | 空来源必须渲染「未标注来源」 |
| `TagList` | `tags` | v0.1 渲染为纯文本标签，**不做链接**（标签页已延后） |
| `SearchBox` | `bundlePath` | Pagefind UI，`bundlePath = BASE_URL + 'pagefind/'` |

延后：`Timeline`（年份分组）、`RelationList`（图谱式反查）、`GraphView`。

## C-14 分支 / 提交 / PR 契约

- 分支：`feat/a2-*`（A2）、`feat/a3-*`（A3）、`feat/a4-*`（A4）、`qa/a5-*`（A5）、`docs/*`、`fix/*`、`chore/*`。
- 提交：Conventional Commits，`type(scope): subject`，scope ∈ `content|site|ci|docs|qa|contract`。
- PR：必须包含 目标 / 变更文件与原因 / 关联任务 ID / 运行过的命令与输出 / 验收证据 / 未解决问题 / 是否触碰契约。
- 合并：squash merge；`main` 禁止 force push；**不要求外部审批人**（单人项目，见 BRANCHES §4），合并动作由用户确认（Agent 不自行合并未经确认的 PR）。

## C-15 契约变更流程

1. 在 `docs/rfc/RFC-<序号>-<slug>.md` 写明：动机、影响面、迁移方案、回滚方案。
2. 在 PR 中标注 `contract-change` 标签。
3. A1 裁决；通过后同步修改本文件（升版本）、`schema.ts`、`validate-content.mjs`、受影响页面。
4. 三者（文档、schema、校验器）必须在**同一个 PR** 内一致，否则视为契约撕裂。

## C-16 冻结记录

| 版本 | 日期 | 状态 | 备注 |
| --- | --- | --- | --- |
| 1.0.0-rc1 | 2026-11-06 | 作废 | 首版；存在 P0-1/P0-2/P1-1..P1-5 六项问题 |
| 1.0.0-rc2 | 2026-11-06 | 作废 | 修订六项问题 |
| 1.0.0-rc3 | 2026-11-06 | 已合并 | 安全修正：`published` 默认 `false`；`published_by` 必填且须人工标识；明确"字段是证据，门禁是用户确认合入 main" |
| 1.0.0-rc4 | 2026-11-06 | 已合并 | C-11 增补 `npm test` / `npm run typecheck` / `npm run sync`；C-17 的 `feat/a2-` 行补 `src/content.config.ts`（A4 上报的归属差异）；无字段/路由/产物变更，向后兼容 |

## C-17 分支改动范围门禁（**P1-4**）

AGENTS.md 的文字约束不构成权限门禁。CI 必须执行 `npm run scope:check`（`scripts/check-scope.mjs`，由 A4 在 **T4.1** 落地）：

1. 取 `git diff --name-only origin/main...HEAD`。
2. 按分支前缀匹配允许路径集合；越界即 exit 1，逐条打印 `越界: <path>（属于 <owner>，当前分支 <prefix>）`。
3. 允许路径的唯一来源是 `AGENTS.md §3`（人工维护），脚本内以同构常量 `SCOPE_RULES` 实现；两者不一致视为契约撕裂，由 A1 在 PR 中同步。

| 分支前缀 | 允许路径 |
| --- | --- |
| `feat/a2-` | `content/**`、`src/content/**`、`src/content.config.ts`、`src/lib/collections.ts`、`scripts/validate-content.mjs`、`docs/TAXONOMY.md` |
| `feat/a3-` | `src/pages/**`、`src/layouts/**`、`src/components/**`、`src/styles/**`、`src/lib/format.ts`、`src/lib/search.ts`、`public/**`（不含 `public/data/**`） |
| `feat/a4-` | `.github/**`、`scripts/build-data.mjs`、`scripts/check-scope.mjs`、`scripts/import/**`、`templates/**`、`public/data/**`、`docs/IMPORT.md` |
| `qa/a5-` | `qa/**`、`docs/qa/**` |
| `docs/` `chore/` | `docs/**`（不含 `docs/qa/**`、`docs/TAXONOMY.md`、`docs/IMPORT.md`）、`AGENTS.md`、`README.md`、根配置文件、`package.json` |
| `fix/` | 任意路径，但 PR 必须引用缺陷编号并由 A1 审核（人工兜底） |
| 任意分支 | `docs/rfc/**` 仅允许**新增**文件 |

门禁的已知局限（必须承认，不得假装完备）：
- 只约束"改了哪些文件"，不约束"改得对不对"。
- `fix/` 分支是人工兜底的薄弱点。
- 若 GitHub 侧权限不足（如读取 PR 标签），降级为 A1 人工核对，并在 T4.1 交付说明中标注「未接通」。

## C-18 公开仓库数据边界与私密库（**P0-1**）

本仓库 `cvcingcvc-code/141` 是 **public**。git 历史不可撤回：任何一次提交都视为已公开。

### 数据分级

| 级别 | 内容 | 存放位置 | 允许进 git |
| --- | --- | --- | --- |
| L1 可公开 | 已脱敏的知识、项目、可公开复盘、错误经验 | `content/**` | ✅ |
| L2 暂不发布 | 已脱敏但暂不上站 | `content/**` + `published: false` | ✅ |
| L3 禁止入库 | 私密复盘原文、他人隐私、健康/家庭细节、未脱敏截图、凭据、内部资料 | **仓库外私密库** `F:\141-vault\`（不进 git、不进 worktree、不打包上传） | ❌ |

### 引用方式

- L3 只以指针形式出现：`vault_ref: vault:<相对路径>`，例：`vault:journal/2026/2026-11-06-raw.md`。
- `vault_ref` 只记录位置，**不得**包含内容摘要、真实姓名、联系方式（`V-020` + `V-010`）。
- 私密库可自由写原文；它是本机目录，不受版本控制，备份与加密由用户负责（v0.1 不实现自动备份）。

### 事故流程（发现敏感内容已入库）

1. 立即停止一切推送。
2. 判定范围：`git log -S"<关键词>" --all` 找出所有涉及提交。
3. 因仓库可能已被 fork/缓存，**默认按已泄漏处理**：先轮换所有相关凭据，再处理历史。
4. 历史清理（`git filter-repo` / BFG）由 A1 执行，记录写入 `docs/incidents/INC-<日期>.md`。
5. 记录：发现时间、影响范围、轮换动作、根因、预防。

### 三道检查（CI 与 QA 都要做）

1. 工作树扫描：`git grep -nE "<PII 正则>"` 覆盖全部已跟踪文件（含 draft / published:false）。
2. 历史扫描：配合 `qa/scripts/privacy-scan.mjs` 遍历提交（v0.1 至少抽检最近 50 个提交 + 全部含 `content/` 的提交）。
3. 构建产物扫描：`dist/**` 不得出现 PII 与密钥。
