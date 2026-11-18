# Personal Knowledge OS

把个人介绍、知识、项目、每日复盘、错误经验沉淀成**可追溯、可全文搜索**的静态知识站。

- 公开站点（已上线）：https://cvcingcvc-code.github.io/personal-knowledge-os/
- 内容源：`content/` 下的 Markdown + 受控 frontmatter
- 技术栈：Astro 5 · zod · Pagefind · 原生 CSS · GitHub Actions
- 使用与版权必读：[`docs/USAGE.md`](docs/USAGE.md)

## 当前状态

**v0.1 已公开部署上线（2026-11-18）**：五类真实内容、12 条路由模型、内容契约校验、三层隐私门禁、离线全文搜索与 GitHub Pages 手动门控发布链路已全部打通。

- 可运行能力：`npm run build` → 15 个静态 HTML（8 个固定路由页 + 7 个已发布动态详情页）+ `dist/data/content.json` + `dist/pagefind/` 中文全文搜索索引；`scripts/import/new-journal.mjs` 复盘导入（默认仓库外草稿 + 写盘前 PII/schema 预检）已落地
- 内容现状：`content/` 共 13 条——**8 条真实内容经所有者逐条审批已公开上站**（覆盖 `profile` 1 / `knowledge` 4 / `projects` 1 / `journal` 1 / `errors` 1，`validate` 0 errors, 0 warnings），另有 5 条 `sample: true` 契约回归样本严格保持未发布且零泄漏
- 公开部署：已上线至 https://cvcingcvc-code.github.io/personal-knowledge-os/ ；`deploy` 工作流继续保持手动 `workflow_dispatch` + 输入 `DEPLOY` 确认门控
- 契约版本：`docs/CONTRACTS.md` v1.0.1（`RFC-001`）；波次与验收记录见 `docs/TASKS.md` 与 `docs/qa/`

想看具体做了什么、验收到了什么程度，以 `docs/TASKS.md` 与 `docs/qa/` 下的验收记录为准。

## 这是一个公开仓库

本仓库 public，`git log` 永久可查。因此：

- **不得提交**私密复盘原文、他人隐私、健康/家庭细节、凭据、未脱敏截图。
- `published` **默认 `false`**：新内容默认不上站，必须经用户确认置 `true` 才发布；`published: false` 只表示不发布，**不代表保密**。
- 这类内容放仓库外 `F:\141-vault\`，仓库内只留 `vault_ref` 指针。详见 `docs/CONTRACTS.md §C-18`。

## 仓库使用与版权声明（重要）

本仓库实行**代码开源、个人原创内容保留版权**的双轨机制（完整条款与 Fork 清理指南见 [`docs/USAGE.md`](docs/USAGE.md)）：

1. **工程代码与工具链（MIT License）**：`src/`、`scripts/`、`templates/`、`qa/scripts/`、`.github/` 等框架与自动化代码按根目录 [`LICENSE`](LICENSE)（MIT）授权，欢迎自由复用或 Fork 搭建你自己的个人知识系统（Fork 后请先按 `docs/USAGE.md §5` 清空 `content/` 下的原作者个人条目并修改 `astro.config.mjs` 的 `site`/`base`）。
2. **原创知识与个人内容（All Rights Reserved）**：`content/` 目录下所有 `sample: false` 的真实文章、项目记录、每日复盘与错误经验版权归 `cvcingcvc-code` 独家所有，**不适用 MIT 或 CC 开放许可**。欢迎阅读、分享链接或注明出处的简短引用；未经作者明确授权，禁止整篇转载、洗稿、商业使用或作为他人经历数据集分发。
3. **测试样本与免责提示**：带 `sample: true` 的文件仅为自动化契约回归夹具，不进入公开站点产物；全部工程笔记仅代表记录时点的个人实践判断，按“原样”提供，不构成生产环境或商业决策担保。
4. **贡献边界**：欢迎通过 Issue 反馈工程缺陷；不接受直接新增或修改 `content/**` 个人内容的外部 PR。

## 先读什么

| 你是 | 读 |
| --- | --- |
| 第一次接触项目 | 本文件 → `docs/PRODUCT.md` |
| 开发 Agent | `AGENTS.md` → `docs/CONTRACTS.md` → `docs/TASKS.md` |
| 审核 / 验收 | `docs/ACCEPTANCE.md` → `docs/BRANCHES.md` |
| 想了解为什么这么设计 | `docs/AUDIT.md` → `docs/ARCHITECTURE.md` |

## 文档索引

- `AGENTS.md` — 协作规范（Agent 第一入口）
- `docs/USAGE.md` — 仓库使用声明、双轨版权边界与 Fork 自建指南
- `docs/AUDIT.md` — 仓库审计报告（含实测证据）
- `docs/PRODUCT.md` — 产品定义、MVP 范围、里程碑
- `docs/ARCHITECTURE.md` — 技术选型、目录、数据流、写权限
- `docs/CONTRACTS.md` — 统一接口契约 v1.0.1（字段/路由/产物/校验编号）
- `docs/TASKS.md` — 多 Agent 任务拆分与波次
- `docs/ACCEPTANCE.md` — 验收标准、红灯用例、证据规则
- `docs/TAXONOMY.md` — 领域与标签受控词表
- `docs/BRANCHES.md` — 分支与 worktree 方案
- `docs/rfc/` — 契约变更申请流程

## 快速开始

```bash
git clone https://github.com/cvcingcvc-code/personal-knowledge-os.git
cd personal-knowledge-os
npm ci
npm run validate   # 内容校验
npm run dev        # 本地开发
npm run build && npm run preview   # 验收搜索必须用这条
```

## 目录（规划）

```
content/   五类 Markdown 内容（唯一事实来源）
src/       站点代码（pages/layouts/components/lib/content）
scripts/   校验、数据产物、导入
templates/ 复盘/错误 录入模板
qa/        QA 清单、脚本、证据
docs/      产品、架构、契约、任务、验收
```

## 原则

1. 内容即数据源，站点是编译产物。
2. 无服务器、无数据库、无密钥。
3. 契约优先，校验器是契约的可执行形式。
4. 知识必须可追溯：无来源就标 `seed`，不装懂。
5. 不编造个人经历。
