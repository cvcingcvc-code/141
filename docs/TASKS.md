# TASKS.md — 任务拆分与并行计划

> 契约：`docs/CONTRACTS.md` v1.0.0（未冻结不得开始编码）
> 纪律：每个任务 = 一个分支 = 一个 worktree = 一个 PR。任务未列出的文件，不得修改。

## 0. 角色

| 角色 | 代号 | 分支前缀 | 写权限 |
| --- | --- | --- | --- |
| 主 Agent（架构/协调/集成） | A1 | `docs/` `chore/` `fix/` | 根配置、`package.json`、`AGENTS.md`、`docs/**`（除 `docs/qa`） |
| 内容与 Schema | A2 | `feat/a2-` | `content/**`、`src/content/**`、`scripts/validate-content.mjs`、`src/lib/collections.ts` |
| 网站与前端 | A3 | `feat/a3-` | `src/pages/**`、`src/layouts/**`、`src/components/**`、`src/styles/**`、`src/lib/format.ts`、`src/lib/search.ts`、`public/**`（除 `public/data`） |
| 自动化与部署 | A4 | `feat/a4-` | `.github/**`、`scripts/build-data.mjs`、`scripts/import/**`、`templates/**`、`public/data/**` |
| 独立 QA | A5 | `qa/a5-` | `qa/**`、`docs/qa/**`。**业务代码只读** |

冲突处理：任何人需要改非自己区域的文件 → 停手，提 RFC 或请求 A1 代改。

## 1. 阶段与波次

```
Wave 0（本轮，A1）  ── 文档与契约，交付 PR #1
        │  用户批准 D1–D5
        ▼
Wave 1（并行 2 条）  ── T2.1 契约代码化（门禁）  ┐
                        T3.1 站点外壳（无内容依赖） ├ 均基于 main 新分支
                        T4.1 CI 骨架              ┘
        │  T2.1 合并（M1 达成）
        ▼
Wave 2（并行 3 条）  ── T2.2 真实/样本内容
                        T3.2 全页面接数据
                        T4.2 数据产物 + 部署
        ▼
Wave 3              ── T5.1 基线回归、T5.2 真实操作验收、T5.3 缺陷单
```

## 2. 主 Agent 任务

### T1.1 契约冻结与仓库治理 ✅（本轮）
- 产出：`AGENTS.md`、`docs/{AUDIT,PRODUCT,ARCHITECTURE,CONTRACTS,TASKS,ACCEPTANCE,TAXONOMY,BRANCHES}.md`、`docs/rfc/**`、`.gitattributes`
- DoD：8 份文档存在且互相引用一致；分支 `docs/phase0-contracts` 推送；PR 已开且 CI 未配置时以文字说明替代。

### T1.2 依赖与脚手架落地（Wave 1 前置，唯一有权改 package.json 的人）
- 内容：`package.json`、`astro.config.mjs`（`site` + `base='/141/'`）、`tsconfig.json`、`npm ci` 验证、`.nvmrc`
- DoD：`npm ci && npm run build` 在空内容下能跑通（允许先只有占位页）；锁文件入库；Node 版本写明 22。
- 依赖：无。这是 T2.1/T3.1 的共同前置。

### T1.3 分支保护与 Pages 开启
- 内容：`main` 保护规则（要求 PR、要求 `ci` 检查绿、禁 force push、禁直推）、Pages source 设为 GitHub Actions
- DoD：用 `gh api` 查询结果截图/贴出，证明保护生效。

### T1.4 集成与合并
- 内容：审 PR、按 Wave 顺序合并、解决跨模块冲突、维护契约版本
- DoD：每次合并后 `main` 上 `npm run validate && npm run build` 通过。

## 3. Agent 2 — 内容 / Schema / 数据检查

### T2.1 契约代码化（**硬门禁**）
- 分支：`feat/a2-schema`
- 产出：`src/content/schema.ts`（zod，逐字对应 C-3..C-8）、`src/content.config.ts`（五集合 glob loader）、`scripts/validate-content.mjs`（实现 V-001..V-018 / W-001..W-005）、`src/lib/collections.ts`（`getAllKnowledge/getPublishedJournal/...` + visibility/approved 过滤）、最少 1 条 `content/profile/profile.md` 与每类 1 条 `sample: true` 样本
- DoD：
  1. `npm run validate` 对合规样本 exit 0；
  2. **红灯用例全绿（必须报错）**：`verified` 无来源、悬空 `related`、文件名与 id 不符、`agent-drafted` 无 `approved_at`、含邮箱、`tags` 超 12 项；
  3. 输出格式符合 C-11；
  4. 样本条目全部带 `sample: true` 与「示例」标识字段，绝不含虚构的个人经历细节。
- 不许做：不写页面、不改 `package.json`、不实现导入。

### T2.2 内容填充与分类校验
- 分支：`feat/a2-content`
- 产出：真实条目（由用户提供素材后结构化）、`docs/TAXONOMY.md` 的标签表落地校验、`content/**` 补全
- DoD：五类各 ≥1 真实条目；`W-002`（样本占比）在真实内容足够后消失；`docs/TAXONOMY.md` 与实际 tags 一致。
- 依赖：T2.1 合并 + 用户提供 D1 素材。
- 不许做：不得编写用户没说过的经历、成绩、时间点；缺失处留空并在 PR 说明。

### T2.3 数据一致性守护
- 分支：`feat/a2-guard`
- 产出：`validate` 增加"跨类型引用完整性"报告（project↔knowledge↔error↔journal 双向可达性统计）
- DoD：输出孤立条目清单（无任何关联的条目），供用户决定补链或归档。

## 4. Agent 3 — 站点 / UI / 响应式

### T3.1 站点外壳（不依赖内容）
- 分支：`feat/a3-shell`
- 产出：`src/layouts/Base.astro`、全局样式与 CSS 变量、Header/Footer、导航、404、`src/pages/index.astro` 静态首屏、`SearchBox` 组件（Pagefind UI 接入，base 处理）
- DoD：`npm run dev` 可访问；360px 无横向滚动；链接全部走 `BASE_URL`；无硬编码 `/`。
- 依赖：T1.2。

### T3.2 全部页面接真实数据
- 分支：`feat/a3-pages`
- 产出：C-9 路由表的全部页面 + C-13 组件
- DoD：每个路由在 `npm run build && npm run preview` 下可访问且数据正确；详情页固定展示来源/状态/可信度；空来源显示「未标注来源」；`sample` 显示「示例」徽章；不存在的 id 落到 404。
- 依赖：T2.1 合并。
- 不许做：不在组件内做 visibility/approved 过滤（统一在 `collections.ts`）。

### T3.3 可读性与响应式打磨
- 分支：`feat/a3-polish`
- 产出：排版尺度、深浅对比、移动端导航、长文可读性
- DoD：360 / 768 / 1280 三档截图对比；正文对比度符合 WCAG AA（≥4.5:1）。

## 5. Agent 4 — 复盘导入 / Actions / 部署

### T4.1 CI 骨架
- 分支：`feat/a4-ci`
- 产出：`.github/workflows/ci.yml`（PR：`npm ci` → `npm run validate` → `npm run build` → 产物敏感信息扫描）、`.github/workflows/deploy.yml`（push main → Pages）
- DoD：故意提交一个非法 frontmatter 的 PR，CI 必须红灯（留截图/运行链接）；正常 PR 绿灯。
- 依赖：T1.2。可与 T2.1 并行（`validate` 脚本未就绪时先只跑 build）。

### T4.2 数据产物与索引
- 分支：`feat/a4-data`
- 产出：`scripts/build-data.mjs`（`content.json` / `graph.json` 严格按 C-10）、`postbuild` 接 Pagefind
- DoD：产物字段与 C-10 逐字一致；不含 private/draft；边无悬空；`npm run preview` 下 `/search/` 能搜到真实条目。

### T4.3 复盘导入流程
- 分支：`feat/a4-import`
- 产出：`templates/journal-template.md`、`templates/error-template.md`、`scripts/import/new-journal.mjs`（生成 `review_status: draft` 的骨架文件）、`docs/IMPORT.md`（说明"人工整理 → 校验 → PR → 审核 → 合并"）
- DoD：跑脚本生成的条目**默认 draft 且不可发布**；`agent-drafted` 字段填好 `approved_at: null` 并被校验器拦截；`docs/IMPORT.md` 明确标注未接通的数据源。
- 不许做：不自动抓取、不自动生成内容、不自动 merge。

### T4.4 部署验收
- 分支：`feat/a4-deploy`
- 产出：Pages 首次成功部署、公开 URL、部署日志
- DoD：`https://cvcingcvc-code.github.io/141/` 200 且样式/链接正常（不是裸 HTML）。

## 6. Agent 5 — 独立 QA（只读业务代码）

### T5.1 基线回归
- 产出：`qa/checklist.md`（可执行清单，逐项打勾）、`qa/scripts/link-check.mjs`、`qa/scripts/privacy-scan.mjs`（扫 `dist/` 是否含邮箱/手机号/密钥）、`qa/baseline/`
- DoD：清单覆盖 C-9 全路由 + V-001..V-018 红灯用例复现；隐私扫描对当前产物给出明确结论。

### T5.2 真实操作验收
- 产出：`docs/qa/ACCEPTANCE-RUN-<日期>.md`，含每项的操作步骤、实际结果、证据（截图路径/命令输出/URL）
- DoD：US-1..US-8 逐条走通；移动端真机或 360px 模拟；搜索用 5 个真实关键词验证；每条结论有证据，禁止"应该没问题"。

### T5.3 缺陷单
- 产出：`docs/qa/defects/DF-<NNN>.md`，格式：现象 / 复现步骤 / 期望 / 实际 / 根因 / 修复 Commit / 回归证据 / 引用契约编号
- DoD：每个缺陷闭环（修复 commit + 回归结果），P0 缺陷未闭环不得宣布里程碑完成。

## 7. 交接点（handoff）

| ID | 从 → 到 | 内容 | 形式 |
| --- | --- | --- | --- |
| H1 | A2 → A3 | `schema.ts` + 样本内容 + `collections.ts` | 合并到 main 后 A3 rebase |
| H2 | A4 → A3 | `content.json`/`graph.json` 真实产物 | 先给示例 JSON，A3 按 C-10 消费 |
| H3 | A3+A4 → A5 | 可访问的 preview/deployed URL | PR 描述里贴 URL + 构建 commit |
| H4 | A5 → A1 | 缺陷单 | `docs/qa/defects/` + CI 运行链接 |

## 8. 本轮（Phase 0）的边界

**已做**：仓库审计、MVP 定义、技术方案、架构与数据流、统一契约、任务拆分、验收标准、分支方案、RFC 流程。

**未做且不得现在做**：任何 `src/**` `scripts/**` `.github/**` `package.json` 代码；任何 Agent 的实际开发；任何真实内容的编写。

原因：契约未获批准前编码，返工成本高于等待；且本轮交付物必须可独立审阅。
