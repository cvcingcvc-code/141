# Personal Knowledge OS

把个人介绍、知识、项目、每日复盘、错误经验沉淀成**可追溯、可全文搜索**的静态知识站。

- 站点（规划中）：https://cvcingcvc-code.github.io/141/
- 内容源：`content/` 下的 Markdown + 受控 frontmatter
- 技术栈：Astro 5 · zod · Pagefind · 原生 CSS · GitHub Actions

## 当前状态

**Phase 0（契约冻结候选 rc2）**：仓库审计、MVP 定义、架构、契约、任务拆分、验收标准已完成；已按审查意见修订六项 P0/P1 问题，等待确认后合并。

已实现的运行能力：**无**。本仓库目前只有文档与最小 bootstrap 提交，没有可运行站点。请不要假设任何功能存在 —— 这是本项目的明确起点（依据：`docs/AUDIT.md`）。

## 这是一个公开仓库

本仓库 public，`git log` 永久可查。因此：

- **不得提交**私密复盘原文、他人隐私、健康/家庭细节、凭据、未脱敏截图。
- `published: false` 只表示不发布到站点，**不代表保密**。
- 这类内容放仓库外 `F:\141-vault\`，仓库内只留 `vault_ref` 指针。详见 `docs/CONTRACTS.md §C-18`。

## 许可

代码按 MIT 规划（`LICENSE` 随工具链在 T1.2 落地）；原创知识内容保留版权，不自动套用开放内容许可。

## 先读什么

| 你是 | 读 |
| --- | --- |
| 第一次接触项目 | 本文件 → `docs/PRODUCT.md` |
| 开发 Agent | `AGENTS.md` → `docs/CONTRACTS.md` → `docs/TASKS.md` |
| 审核 / 验收 | `docs/ACCEPTANCE.md` → `docs/BRANCHES.md` |
| 想了解为什么这么设计 | `docs/AUDIT.md` → `docs/ARCHITECTURE.md` |

## 文档索引

- `AGENTS.md` — 协作规范（Agent 第一入口）
- `docs/AUDIT.md` — 仓库审计报告（含实测证据）
- `docs/PRODUCT.md` — 产品定义、MVP 范围、里程碑
- `docs/ARCHITECTURE.md` — 技术选型、目录、数据流、写权限
- `docs/CONTRACTS.md` — 统一接口契约 v1.0.0（字段/路由/产物/校验编号）
- `docs/TASKS.md` — 多 Agent 任务拆分与波次
- `docs/ACCEPTANCE.md` — 验收标准、红灯用例、证据规则
- `docs/TAXONOMY.md` — 领域与标签受控词表
- `docs/BRANCHES.md` — 分支与 worktree 方案
- `docs/rfc/` — 契约变更申请流程

## 快速开始（Phase 1 落地后可用）

```bash
git clone https://github.com/cvcingcvc-code/141.git
cd 141
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
