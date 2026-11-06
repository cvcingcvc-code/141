# TASKS.md — 任务拆分与并行计划

> 契约：`docs/CONTRACTS.md` v1.0.0-rc2（未冻结不得开始编码）
> 纪律：每个任务 = 一个分支 = 一个 worktree = 一个 PR。任务未列出的文件，不得修改。
> **写权限只在 `AGENTS.md §3` 定义一处**，本文件不复述（rc1 的 P1-3 就来自两份表打架）。

## 0. 角色

| 角色 | 代号 | 分支前缀 | 一句话职责 |
| --- | --- | --- | --- |
| 主 Agent（架构/协调/集成/脚手架） | A1 | `docs/` `chore/` `fix/` | 契约、根配置、集成、唯一能改 `package.json` 的人 |
| 内容与 Schema | A2 | `feat/a2-` | 字段定义、校验器、内容、标签词表 |
| 网站与前端 | A3 | `feat/a3-` | 12 条路由、组件、样式、响应式 |
| 自动化与部署 | A4 | `feat/a4-` | CI、范围门禁、数据产物、导入模板、Pages |
| 独立 QA | A5 | `qa/a5-` | 只读业务代码，出验收报告与缺陷单 |

## 1. 阶段与波次

```
Wave 0（本轮，A1）  ── 文档与契约修订，交付 PR #1（rc2）
        │  用户确认修订结果 → 合并 PR #1
        ▼
T1.2（仅 A1，独立 PR）── Astro 初始化、`/141/` base、最小页面、npm ci + build 通过
        ▼
Wave 1（并行 3 条）  ── T2.1 契约代码化（门禁）
                        T4.1 CI + 范围门禁
                        T3.1 站点外壳
        │  T2.1 合并（M1 达成）
        ▼
Wave 2（并行 3 条）  ── T2.2 示例/真实内容
                        T3.2 12 条路由接数据
                        T4.2 数据产物 + 搜索索引
        ▼
Wave 3              ── T4.3 导入流程、T4.4 部署、T5.1/T5.2 验收
```

## 2. 主 Agent 任务

### T1.1 契约冻结与仓库治理 ✅（本轮，rc2 修订）
- 产出：8 份文档 + `AGENTS.md` + `docs/rfc/**` + `.gitattributes`
- DoD：六项 P0/P1 处理完毕；四份文档互相引用一致；仍为文档 PR，无业务代码。

### T1.2 工具链初始化（**用户确认 PR #1 后，独立 PR**）
- 内容：`package.json`、`astro.config.mjs`（`site` + `base='/141/'`）、`tsconfig.json`、`.nvmrc`、`LICENSE`（MIT）、创建仓库外目录 `F:\141-vault\`（不入 git，仅建目录与 README 说明）
- DoD：`npm ci && npm run build` 在最小页面（首页占位 + `/404.html`）上跑通；锁文件入库；`npm run dev` 可访问；Node 22 写明。
- **不做**：不引入内容 schema、不做搜索、不做 CI。

### T1.3 分支保护与 Pages（**分两阶段，P0-2**）
- 阶段 A（CI 尚未存在时）：只开"禁 force push + 禁删除 + 需 PR + 审批数 0"。
- 阶段 B（CI 在 main 上至少成功跑过一次后）：把真实存在的检查名加入 required status checks（名字必须来自 `gh api .../commits/<sha>/check-runs` 的实际输出，不得凭猜）。
- DoD：**自己完整走通一次 PR → CI 绿 → 自己合并成功**，附 run 链接；证明保护规则不会把单人项目锁死。
- 详见 `docs/BRANCHES.md` §4。

### T1.4 集成与合并
- 内容：审 PR、按 Wave 顺序合并、解决跨模块冲突、维护契约版本
- DoD：每次合并后 main 上 `npm run scope:check && npm run validate && npm run build` 通过。

## 3. Agent 2 — 内容 / Schema / 数据检查

### T2.1 契约代码化（**硬门禁**）
- 分支：`feat/a2-schema`
- 产出：`src/content/schema.ts`（zod，逐字对应 C-3..C-8）、`src/content.config.ts`、`scripts/validate-content.mjs`（V-001..V-021 / W-001..W-005）、`src/lib/collections.ts`（含 `published`/`approved` 过滤）、`content/profile/profile.md` + 五类各 1 条 `sample: true` 样本
- DoD：
  1. `npm run validate` 对合规样本 exit 0；
  2. **11 个红灯用例全部被拦截**（`docs/ACCEPTANCE.md` §4 R-01..R-11），逐条贴输出；
  3. `schema.ts` 字段与 CONTRACTS 的逐字对照表贴在 PR 里；
  4. 样本全部 `sample: true`，正文不含任何虚构的个人经历细节；
  5. journal 命名例外（`2026-11-06.md` ↔ `DJ-2026-11-06`）有对应测试，且 V-006 不误报、V-017 能命中。
- 不许做：不写页面、不改 `package.json`、不实现导入。

### T2.2 内容填充
- 分支：`feat/a2-content`
- 产出：真实条目（用户提供素材后结构化）、`docs/TAXONOMY.md` 标签表按实际使用微调
- DoD：五类各 ≥1 真实条目且用户确认；`W-002`（样本占比 >50%）消失；标签与 TAXONOMY 一致。
- 不许做：不写用户没说过的经历、成绩、时间点；缺失处留空并在 PR 说明；L3 私密原文不入库（走 `vault_ref`）。

### ~~T2.3 数据一致性守护~~ → 延后 v0.2
孤立条目统计、跨类型双向可达性报告不属于首个可运行版本链路，P1-5 后移出。

## 4. Agent 3 — 站点 / UI / 响应式

### T3.1 站点外壳（不依赖内容）
- 分支：`feat/a3-shell`
- 产出：`src/layouts/Base.astro`、全局样式与 CSS 变量、Header/Footer、`/404.html`、首页静态首屏
- DoD：`npm run dev` 可访问；360px 无横向滚动；链接全部走 `BASE_URL`；无硬编码 `/`。
- 依赖：T1.2。

### T3.2 12 条路由接真实数据
- 分支：`feat/a3-pages`
- 产出：C-9 的 12 条路由 + C-13 的 5 个组件（`ContentCard`/`StatusBadge`/`SourceList`/`TagList`/`SearchBox`）
- DoD：`build && preview` 下每条路由可访问且数据正确；详情页固定展示来源/状态/可信度；空来源显示「未标注来源」；`sample` 显示「示例」徽章；不存在的 id 落 404；`TagList` 为纯文本（不做标签页）。
- 依赖：T2.1 合并。
- 不许做：不实现标签页/领域页/图谱/分页（已延后）；不在组件里做发布过滤（统一在 `collections.ts`）。

### T3.3 可读性（最小限度）
- 分支：`feat/a3-polish`
- 产出：排版尺度、移动端导航、长文可读性
- DoD：360 / 768 / 1280 三档截图；正文对比度 ≥4.5:1（AA）。
- 说明：只做这三项，不做主题切换/暗色/动画。

## 5. Agent 4 — CI / 部署 / 导入

### T4.1 CI + 分支范围门禁（**P1-4 落地点**）
- 分支：`feat/a4-ci`
- 产出：
  1. `scripts/check-scope.mjs`（C-17，按分支前缀校验改动路径，常量与 `AGENTS.md §3` 同构）；
  2. `.github/workflows/ci.yml`：`npm ci` → `scope:check` → `validate` → `build` → 产物 PII 扫描；
  3. `.github/workflows/deploy.yml`：push main → build → upload-pages-artifact → deploy-pages。
- DoD：
  1. **越界红线**：在 `feat/a3-*` 分支故意改 `content/**` 的 PR → `scope:check` 失败并打印归属（R-10）；
  2. 非法 frontmatter 的 PR → `validate` 失败（R-01..R-06）；
  3. 正常 PR → 绿灯；
  4. 检查名 `ci` 与实际 check-run 名称一致，供 T1.3 阶段 B 引用；
  5. 若 GitHub 侧权限不足以读取 PR 标签（用于"审批状态改动需人工确认"的辅助检查），降级为 A1 人工核对，并在交付说明标注「未接通」。
- 依赖：T1.2。可与 T2.1 并行（`validate` 未就绪时先跑 scope:check + build）。

### T4.2 数据产物 + 搜索索引
- 分支：`feat/a4-data`
- 产出：`scripts/build-data.mjs` → `dist/data/content.json`（严格按 C-10）；postbuild 接 `pagefind --site dist`
- DoD：字段与 C-10 逐字一致；不含 `published: false` / `draft` 条目；`preview` 下 `/search/` 能搜到真实条目。
- 不许做：不生成 `graph.json`（v0.2）。

### T4.3 复盘导入流程
- 分支：`feat/a4-import`
- 产出：`templates/journal-template.md`、`templates/error-template.md`、`scripts/import/new-journal.mjs`、`docs/IMPORT.md`（A4 拥有的文档）
- DoD：脚本生成条目默认 `review_status: draft` 且 `approved_at: null`；`agent-drafted + approved` 会被 V-011/V-019 拦截；`docs/IMPORT.md` 明确写清"人工整理 → 校验 → PR → 用户审核 → 合并"，并标注未接通的数据源。
- 不许做：不自动抓取、不自动生成内容、不自动 approve、不自动 merge。

### T4.4 部署验收
- 分支：`feat/a4-deploy`
- 产出：Pages 首次成功部署、公开 URL、部署日志
- DoD：`https://cvcingcvc-code.github.io/141/` 返回 200 且样式/链接正常（非裸 HTML）。

## 6. Agent 5 — 独立 QA（只读业务代码）

### T5.1 基线回归
- 产出：`qa/checklist.md`、`qa/scripts/link-check.mjs`、`qa/scripts/privacy-scan.mjs`（工作树 + git 历史 + `dist/` 三层）、`qa/baseline/`
- DoD：覆盖 12 条路由 + R-01..R-11 复现；隐私扫描对当前产物给出明确结论（不是"看起来没问题"）。

### T5.2 真实操作验收
- 产出：`docs/qa/ACCEPTANCE-RUN-<日期>.md`
- DoD：v0.1 用户故事（US-1/2/3/5/6/7/8）逐条走通；移动端 360px；5 个真实关键词；每条结论有证据。

### T5.3 缺陷单
- 产出：`docs/qa/defects/DF-<NNN>.md`（现象/复现/期望/实际/根因/修复 commit/回归证据/契约编号）
- DoD：P0/P1 缺陷全部闭环，未闭环不得宣布里程碑完成。

## 7. 交接点

| ID | 从 → 到 | 内容 | 形式 |
| --- | --- | --- | --- |
| H1 | A2 → A3 | `schema.ts` + 样本内容 + `collections.ts` | 合并到 main 后 A3 rebase |
| H2 | A4 → A3 | `content.json` 真实产物（示例 JSON 先行） | 按 C-10 消费 |
| H3 | A3+A4 → A5 | 可访问的 preview / deployed URL | PR 里贴 URL + 构建 commit |
| H4 | A5 → A1 | 缺陷单 | `docs/qa/defects/` + CI run 链接 |

## 8. v0.1 明确不做（任务层面）

标签页/领域页聚合、`graph.json`、图谱可视化、`Timeline`/`RelationList` 组件、分页、RSS、暗色模式、第三方笔记同步、自动抓取、访问统计、孤立条目报告（原 T2.3）。

## 9. 本轮（Phase 0 rc2）边界

**已做**：六项 P0/P1 修订、四份文档一致性核对、MVP 收敛、保护规则去死锁、范围门禁方案。

**未做且不得现在做**：任何 `src/**` `scripts/**` `.github/**` `package.json` 代码；任何 Agent 的开发分支与 worktree；任何真实内容。
