# QA 测试清单 — T5.1 基线

> 归属：A5（只读业务代码）。本清单是 QA 全量验收的执行底稿，覆盖
> `docs/ACCEPTANCE.md` 的 M0..M5 门禁、C-9 路由、R/P 用例、隐私三层。
> 状态列随里程碑推进由 A5 更新；**未落地项一律标「待测试」，不假装通过**。

## 1. 执行前提（每次回归前确认）

- [ ] 读取 `AGENTS.md` → `docs/CONTRACTS.md`（当前版本号）→ `docs/TASKS.md` 任务边界
- [ ] 确认基线 commit（`git rev-parse HEAD`）与契约版本一致
- [ ] `npm ci` 干净安装（每个 worktree 独立 node_modules）
- [ ] `npm run build` 通过；`npm run preview` 启动，验收搜索必须用 preview（不能 dev）
- [ ] 记录日期 / 环境 / 视口，证据落到 `qa/evidence/<里程碑>/`

## 2. 路由契约（C-9，12 条）

| # | 路由 | 页面 | 基线状态 | 门禁 |
| --- | --- | --- | --- | --- |
| 1 | `/` | 首页 | ✅ 可访问（占位页，无 profile/journal/knowledge 数据） | M2 |
| 2 | `/about/` | 个人介绍 | ❌ 未实现 / 待测试 | M2 |
| 3 | `/knowledge/` | 知识列表 | ❌ 未实现 / 待测试 | M2 |
| 4 | `/knowledge/[id]/` | 知识详情 | ❌ 未实现 / 待测试 | M2 |
| 5 | `/projects/` | 项目列表 | ❌ 未实现 / 待测试 | M2 |
| 6 | `/projects/[id]/` | 项目详情 + 关联纯文本链接 | ❌ 未实现 / 待测试 | M2 |
| 7 | `/journal/` | 复盘列表（仅 approved） | ❌ 未实现 / 待测试 | M2 |
| 8 | `/journal/[date]/` | 复盘详情 | ❌ 未实现 / 待测试 | M2 |
| 9 | `/errors/` | 错误经验列表 | ❌ 未实现 / 待测试 | M2 |
| 10 | `/errors/[id]/` | 错误详情 | ❌ 未实现 / 待测试 | M2 |
| 11 | `/search/` | 全文搜索（Pagefind） | ❌ 未实现 / 待测试 | M3 |
| 12 | `/404.html` | 未找到页 | ✅ 可访问 | M2 |

- [ ] 详情页固定展示来源列表 / `status` / `confidence`；空来源显示「未标注来源」
- [ ] `sample: true` 条目显示「示例」徽章
- [ ] 不存在的 id 落到 404 页（非空白页）
- [ ] 页面无标签页/领域页入口（延后项不得被顺手实现）
- [ ] 所有链接走 `BASE_URL`，无硬编码 `/`（子路径 `/141/`）

## 3. 反向用例（必须失败，失败才算通过，ACCEPTANCE §4）

| ID | 构造 | 期望 | 基线状态 |
| --- | --- | --- | --- |
| R-01 | knowledge `status: verified` + `sources: []` | `V-009`，exit 1 | ⏳ 待测试（validate 未落地） |
| R-02 | `related: [KB-NOT-EXIST]` | `V-008` | ⏳ 待测试 |
| R-03 | 文件名 `kb-eng-777-x.md` 但 id `KB-ENG-001` | `V-006` | ⏳ 待测试 |
| R-04 | `agent-drafted` + `approved` 缺 `approved_at` | `V-011` | ⏳ 待测试 |
| R-05 | 正文含 `someone@example.com` | `V-010` | ⏳ 待测试 |
| R-06 | `tags` 13 项 | `V-014` | ⏳ 待测试 |
| R-07 | journal `review_status: draft` | 产物中不存在该条目（静默不发布） | ⏳ 待测试 |
| R-08 | `published: false` | 站点 / 索引 / content.json 三处均不存在 | ⏳ 待测试 |
| R-09 | journal 文件名/`date`/目录年份不一致 | `V-017`（不得报 `V-006`） | ⏳ 待测试 |
| R-10 | `feat/a3-*` 分支改 `content/**` | `scope:check` exit 1，打印「属于 A2」 | ⏳ 待测试（T4.1 未落地） |
| R-11 | `approved_by: agent` / `published_by: bot` | `V-019` | ⏳ 待测试 |
| R-12 | `published: true` 缺 `published_at`/`published_by` | `V-021` | ⏳ 待测试 |

> R-07/R-08 是「静默泄漏」类，必须用产物检索（grep 产物），不能只看页面肉眼。

## 4. 正向用例（必须不报错，ACCEPTANCE §5）

| ID | 构造 | 期望 | 基线状态 |
| --- | --- | --- | --- |
| P-01 | `agent-drafted` + `draft`，无审批字段 | 不报错，且不发布 | ⏳ 待测试 |
| P-02 | journal `2026-11-06.md` ↔ `DJ-2026-11-06` ↔ `date` 一致 | 不报 `V-006`，`V-017` 通过 | ⏳ 待测试 |
| P-03 | knowledge `status: seed` + `sources: []` | 不报错，站点显示「未标注来源」 | ⏳ 待测试 |
| P-04 | 新条目不写 `published` 字段 | 校验不报错，三处产物均不存在 | ⏳ 待测试 |

## 5. 用户故事（T5.2 执行，基线仅列项）

- [ ] US-1 手机首屏能读「我是谁/在做什么」+ 最近复盘/知识入口
- [ ] US-2 知识详情可看来源 + `verified/seed` 徽章 + 更新时间
- [ ] US-3 搜索页命中正文独有词并跳转正确
- [ ] US-5 项目详情关联条目为纯文本标题链接列表，可点不 404
- [ ] US-6 按 IMPORT.md 走一遍录入 → draft → 校验通过但不上站 → approve 后上站
- [ ] US-7 改非自己区域文件被 `scope:check` 拒绝
- [ ] US-8 360px 视口无横向滚动，代码块横向滚动不撑破布局
- ~~US-4 按标签浏览~~ — 已延后 v0.2，不测

## 6. 隐私三层（P0-1 / ACCEPTANCE §7，缺一层不算过）

| 层 | 检查 | 通过标准 | 基线结论 |
| --- | --- | --- | --- |
| L1 工作树 | `qa/scripts/privacy-scan.mjs` 扫全部已跟踪文件 | 0 真实命中（示例值白名单化并说明） | ⚠️ 1 处真实命中，见 DF-001 |
| L2 git 历史 | 最近 50 提交 + 全部 `content/` 提交 | 0 真实命中 | ⚠️ 1 处（同 DF-001） |
| L3 构建产物 | 扫 `dist/**` | 0 命中 | ✅ 0 命中 |

附加确认：
- [ ] 仓库内无 L3（私密原文/他人隐私/健康家庭细节）
- [ ] L3 仅以 `vault_ref` 指针存在；`F:\141-vault\` 不在 git 内
- [ ] 若曾泄漏，`docs/incidents/` 有记录且凭据已轮换

## 7. 数据与搜索（M3）

- [ ] `dist/data/content.json` 字段与 C-10 逐字一致（脚本比对 key 集合）
- [ ] 产物 0 条 `published:false` / `draft` / 非 sample 伪造内容
- [ ] 5 个真实关键词各命中 ≥1 且跳转正确（截图 + URL）
- [ ] 搜索空结果有明确空状态文案

## 8. 自动化与保护（M4）

- [ ] 非法 frontmatter PR → CI 红灯（run 链接）
- [ ] 越界改文件 PR → `scope:check` 红灯（R-10）
- [ ] 正常 PR → 绿灯
- [ ] 分支保护自证：A1 完整走通「PR → CI 绿 → 合并」
- [ ] 直推 main 被拒（贴 `git push` 报错原文）
- [ ] `https://cvcingcvc-code.github.io/141/` 返回 200 且样式正常

## 9. 缺陷单追踪

- [ ] 缺陷单格式符合 ACCEPTANCE §8（`docs/qa/defects/DF-<NNN>.md`）
- [ ] 每个缺陷：复现步骤 / 期望 / 实际 / 根因 / 修复 commit / 回归证据 / 契约编号
- [ ] P0/P1 全部闭环，未闭环不宣布里程碑完成
