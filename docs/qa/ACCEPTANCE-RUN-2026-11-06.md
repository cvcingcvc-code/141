# 验收报告 — Wave 2 最终独立验收·补正（2026-11-06）

> 角色：A5 独立 QA（只读业务代码，未修改任何 `src/`/`scripts/`/`content/`/`.github/` 业务代码）。
> 基线：`main@7ffa908`（T3.2 12 路由 + T4.2 content.json/pagefind + T2.2 采集流程 PR #16 均已合并）。
> 分支：`qa/a5-wave2`（HEAD `d8008e0`，已 merge `origin/main`，工作树干净，未 force push）。
> 判定四类：**PASS**（已真实验证）/ **BLOCKED**（缺前置）/ **FAIL**（可复现缺陷）/ **NOT TESTED**（未执行）。
>
> 独立声明：本报告全部证据来自 A5 自行执行的命令、脚本与浏览器实测，未引用主 Agent 的测试报告。

> **基线补充（A1 集成注，2026-11-06）**：本报告验收后 main 又前进 1 个提交
> `fa6c383`（PR #21，仅 `README.md` 的「当前状态」段，+8/−3，无代码/内容/产物变更）。
> 该增量对 §2–§10 的结论无影响，故未重跑 E2E；如需对齐，以 `git diff 7ffa908..fa6c383` 自证。
> 另：本文档上一版（`f702c31`）曾转引 2 个 Pagefind 贡献者公开邮箱，本版已删除；
> 该内容仅存在于分支历史，squash 合并后不进 main 历史（见 §10）。

## 1. 环境与基线（补正）

| 项 | 值 |
| --- | --- |
| 仓库 / 分支 | `github.com/cvcingcvc-code/141` / `qa/a5-wave2`（HEAD `d8008e0`，含 `origin/main@7ffa908`） |
| 契约版本 | `CONTRACTS.md` v1.0.0-**rc4**（Wave 1 集成修正，无字段/路由/产物变更） |
| 运行时 | Node v22.22.2 / Astro 5.18.2 / Pagefind 1.6.0 |
| 主验收环境 | worktree `F:\141-wt\a5`（全 `published:false` 样本，验证空状态 + 隔离） |
| 隔离测试环境 | `F:\141-e2e`（仓库外副本，**已同步到 7ffa908**，注入 `published:true` 探针） |

## 2. 验收结果总表（补正后）

| # | 验收项 | 判定 | 证据 |
| --- | --- | --- | --- |
| 1 | validate / test / typecheck / build | **PASS** | §3 |
| 2 | 8 个固定页面 + 空数据状态 | **PASS** | §4 |
| 3 | 四类动态详情页（隔离环境） | **PASS** | §5 |
| 4 | 5 个关键词搜索 + 跳转 | **PASS** | §6 |
| 5 | 不存在的 ID 返回 404 | **PASS** | §7 |
| 6 | published:false / draft 不进 HTML/content.json/Pagefind | **PASS** | §8 |
| 7 | 360/768/1280 布局 + 长代码块 | **PASS** | §9 |
| 8 | 隐私三层 + 第三方 JS 审查 | **PASS** | §10 |
| 9 | 真实用户内容上站 | **BLOCKED-D1** | §11 |

> 合计：**8 项 PASS + 1 项 BLOCKED-D1**；0 项 FAIL；0 项 NOT TESTED。
> 唯一 BLOCKED：T2.2 采集流程（模板 + 来源核对清单）已随 PR #16 合并，但真实内容依赖
> 用户提供素材（D1），故「真实内容上站」仍是 BLOCKED-D1，非「未测试」。

## 3. 构建链路（#1，7ffa908 复跑）

```
npm run validate  → 0 errors, 1 warning（W-002 样本占比 6/6；PR #16 已消除 W-005 正文断链 ×3）
npm test          → 33 tests / 32 pass / 1 skipped / 0 fail（PR #16 新增 intake.test.mjs）
npm run typecheck → exit 0（清 .astro 缓存后干净，无 Duplicate id 警告）
npm run build     → exit 0；Pagefind 索引 8 页（主仓库，无 published 内容）
```

## 4. 固定页面 + 空数据状态（#2）

`node qa/scripts/link-check.mjs`（主仓库，7ffa908）：

```
固定路由 8/8 全部 200；站内链接 73 条，断链 0
```

空状态文案（curl 实测）：`/knowledge/`「还没有已发布的知识条目」、`/projects/`「还没有已发布的项目记录」、
`/journal/`「还没有已批准的复盘」、`/errors/`「还没有已发布的错误经验」、`/about/`「个人介绍尚未发布」。
首页「最近复盘 / 最近知识」两区块均为空状态。

## 5. 四类动态详情页（#3，隔离环境，7ffa908 同步后）

`F:\141-e2e` 同步 7ffa908 后重新 build（13 页），四类详情页全部 200：

```
200 /knowledge/kb-eng-901/    200 /projects/pj-e2e/
200 /journal/2026-11-05/      200 /errors/er-20261105-99/
```

渲染逐项实测：knowledge 详情（`已核实`/`可信度高`/来源/`示例`徽章）、project 详情（关联纯文本链接
`href="/141/knowledge/kb-eng-901/"`）、journal 详情（did/learned）、error 详情（症状/根因/修复/预防）。
content.json `counts` 各 1、`profile:0`，字段与 C-10 一致。

## 6. 关键词搜索 + 跳转（#4，隔离环境）

`node qa/scripts/search-probe.mjs`（CDP 驱动真实 Pagefind）：

```
[PASS] 「鲸落九百零一」→ /knowledge/kb-eng-901/
[PASS] 「鲸落九百零二」→ /projects/pj-e2e/
[PASS] 「鲸落九百零三」→ /journal/2026-11-05/
[PASS] 「鲸落九百零四」→ /errors/er-20261105-99/
[PASS] 「探针」→ 10 条（多结果）
结论：5/5 命中并跳转正确
```

## 7. 无效 ID 404（#5）

```
/knowledge/qa-not-exist-999/  → 404 +「没有找到这个页面」
/projects/pj-not-exist/       → 404 + 特征文本
/journal/2099-01-01/          → 404 + 特征文本
/errors/er-99999999-99/       → 404 + 特征文本
```

4/4 落到 404 页（含特征文本），非空白页。主仓库有效 id（如 `KB-ENG-001`）因 `published:false` 也返回 404，
属「published-only」正确行为（详情页生成由 §5 隔离环境证明），非缺陷。

## 8. 数据隔离（#6）

- 主仓库：`content.json` `items:[]`、`counts` 全 0、0 个详情页 HTML；Pagefind 片段 grep 样本关键词 0 命中。
- 隔离环境（5 published + 6 未发布）：`data-isolation.mjs` → `泄漏：0`，**PASS**。
- `content-consistency.mjs`：主仓库 `items:0` 与 `0` 详情页一致，**PASS**。

## 9. 响应式 + 长代码块（#7）

`layout-check.mjs`（CDP 读 scrollWidth）：四类详情页 × 360/768/1280 全部无横向滚动；
长代码块探针 360px 下页面 `scrollWidth==clientWidth`、代码块内部 `scrollWidth(1863) > clientWidth(313)`
→ `.prose pre { overflow-x:auto }` 生效，代码块自身横向滚动而非撑破页面。

## 10. 隐私三层 + 第三方 JS 审查（#8）

`node qa/scripts/privacy-scan.mjs`：
```
L1 工作树：84 文件，0 真实命中（本次已修正报告转引的第三方邮箱）
L2 历史：22 提交，2 处命中 —— 见下方说明
L3 产物：31 文本，0 命中；跳过 22 个第三方打包产物（pagefind/_astro）
```

- **L2 的 2 处命中**：来自 QA 分支自身上一轮提交 `f702c31`，是报告转引的 **Pagefind 开源库贡献者
  公开邮箱**（第三方库 license/contributors 元数据），非本站 PII、非凭据、非业务代码泄漏。
  本轮已从工作树修正（L1/L3 回到 0）。该提交未合并 `main`，不影响站点与 CI（CI 仅扫 `dist`）。
- 第三方产物独立审查：密钥（ghp_/sk-/AKIA/PRIVATE KEY）**0 命中**、手机号/身份证 **0 命中**；
  邮箱仅 `pagefind-component-ui.js` 内第三方库自带贡献者邮箱，非本站数据。

## 11. BLOCKED-D1 项（#9）

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 真实用户内容上站 | **BLOCKED-D1** | T2.2 采集模板 + 来源核对清单已随 PR #16 合并（采集流程完成）；但真实素材依赖用户提供（D1），「不新增示例内容」「未编造」，故真实内容上站仍阻塞 |

## 12. 缺陷

- 新增缺陷：**0**。P0/P1 为 0。
- 历史缺陷：DF-001 已闭环（INC-001）。
- 本轮自纠：上一轮报告转引第三方库公开邮箱触发隐私扫描自指命中，已从工作树修正（见 §10）。

## 13. 证据清单

| 证据 | 位置 |
| --- | --- |
| 详情页 / 搜索结果 / 长代码块 / 首页 / 404 截图 | `qa/evidence/wave2/*.png` |
| 脚本机器可读输出 | `qa/baseline/*-latest.json`（运行生成，不入库） |

## 14. 下一轮唯一目标

用户提供真实素材（D1 解除）后，按 `src/content/intake/` 采集模板录入真实内容，复核 §11 的 BLOCKED-D1 项；
`qa/a5-wave2` 的验收脚本（`link-check`/`layout-check`/`search-probe`/`data-isolation`/`content-consistency`）
建议随本 PR 合入 main 供回归复用。
