# 验收报告 — Wave 2 最终独立验收（2026-11-06）

> 角色：A5 独立 QA（只读业务代码，未修改任何 `src/`/`scripts/`/`content/`/`.github/` 业务代码）。
> 基线：`main@151d247`（Wave 2 已合并：T3.2 12 路由 + T4.2 content.json/pagefind）。
> 分支：`qa/a5-wave2`（已 merge `origin/main` 到 `a6def75`，工作树干净）。
> 判定四类：**PASS**（已真实验证）/ **BLOCKED**（缺前置）/ **FAIL**（可复现缺陷）/ **NOT TESTED**（未执行）。
>
> 独立声明：本报告全部证据来自 A5 自行执行的命令、脚本与浏览器实测，未引用主 Agent 的测试报告。

## 1. 环境与基线

| 项 | 值 |
| --- | --- |
| 仓库 / 分支 | `github.com/cvcingcvc-code/141` / `qa/a5-wave2`（HEAD `a6def75`，含 `origin/main@151d247`） |
| 契约版本 | `CONTRACTS.md` v1.0.0-rc3 |
| 运行时 | Node v22.22.2 / Astro 5.18.2 / Pagefind 1.6.0 |
| 主验收环境 | worktree `F:\141-wt\a5`（preview :4321，全 `published:false` 样本） |
| 隔离测试环境 | `F:\141-e2e`（仓库外副本，注入 `published:true` 探针内容） |

## 2. 验收结果总表

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
| 9 | 真实用户内容上站（T2.2） | **NOT TESTED** | §11 |

> 唯一 NOT TESTED 项：主仓库无真实用户内容（T2.2 `feat/a2-content` 未合并），
> 「真实素材上站」无法验证，用隔离探针替代了路由/搜索/发布机制验证，但非真实内容。

## 3. 构建链路（#1）

```
npm run validate  → 0 errors, 4 warnings（W-002 样本占比 / W-005×3 正文链接指向未实现路由，均预期）
npm test          → 24 pass / 1 skipped / 0 fail
npm run typecheck → exit 0
npm run build     → exit 0；Pagefind 索引 8 页（主仓库，无 published 内容）
```

## 4. 固定页面 + 空数据状态（#2）

`node qa/scripts/link-check.mjs`（主仓库）：

```
固定路由 8/8 全部 200；站内链接 73 条，断链 0
```

空状态文案实测（curl 抓取）：
- `/knowledge/` →「还没有已发布的知识条目」
- `/projects/` →「还没有已发布的项目记录」
- `/journal/` →「还没有已批准的复盘」（区分「已批准」语义）
- `/errors/` →「还没有已发布的错误经验」
- `/about/` →「个人介绍尚未发布」

首页「最近复盘 / 最近知识」两区块均为空状态，`/search/` 挂载 Pagefind（`data-search-root`）。

## 5. 四类动态详情页（#3，隔离环境）

`F:\141-e2e` 注入 4 条 `published:true` 探针（`KB-ENG-901` / `PJ-E2E` / `DJ-2026-11-05` / `ER-20261105-99`），重新 build 后：

```
四类详情页全部 200：
  /knowledge/kb-eng-901/     /projects/pj-e2e/
  /journal/2026-11-05/       /errors/er-20261105-99/
```

渲染逐项实测（curl）：
- knowledge 详情：`verified→已核实`、`confidence→可信度高`、来源 `example.com/e2e`、`示例` 徽章
- project 详情：关联条目纯文本链接 `href="/141/knowledge/kb-eng-901/"`（`linked_knowledge` 生效）
- journal 详情：`做了什么`/`学到了什么` 渲染 did/learned
- error 详情：症状/根因/修复/预防 四要素渲染
- content.json：`counts` 各 1、`profile:0`，`items` 4 条字段与 C-10 一致

## 6. 关键词搜索 + 跳转（#4，隔离环境）

`node qa/scripts/search-probe.mjs`（CDP 驱动真实 Pagefind 搜索）：

```
[PASS] 「鲸落九百零一」 1 条 → /knowledge/kb-eng-901/（可达）
[PASS] 「鲸落九百零二」 1 条 → /projects/pj-e2e/（可达）
[PASS] 「鲸落九百零三」 1 条 → /journal/2026-11-05/（可达）
[PASS] 「鲸落九百零四」 1 条 → /errors/er-20261105-99/（可达）
[PASS] 「探针」 9 条 → 多结果
结论：5/5 命中并跳转正确
```

## 7. 无效 ID 404（#5）

```
/knowledge/qa-not-exist-999/  → 404 +「没有找到这个页面」（正确 404）
/projects/pj-not-exist/       → 404 + 特征文本
/journal/2099-01-01/          → 404 + 特征文本
/errors/er-99999999-99/       → 404 + 特征文本
```

4/4 落到 404 页（含特征文本），非空白页。**注意**：主仓库中有效 id（如 `KB-ENG-001`）因
`published:false` 也返回 404，这是「published-only」的正确行为，非缺陷（详情页生成已由 §5 隔离环境证明）。

## 8. 数据隔离（#6）

- 主仓库（全 `published:false`）：`content.json` `items:[]`、`counts` 全 0、0 个详情页 HTML；
  Pagefind 片段 grep 样本关键词（`Git rebase`/`Schema 校验`/`CRLF`/`git`/`schema`）**全部 0 命中**。
- 隔离环境（5 published + 6 未发布）：`node qa/scripts/data-isolation.mjs` →
  `泄漏：0`，**PASS**（published 进入、未发布 0 泄漏）。

## 9. 响应式 + 长代码块（#7）

`node qa/scripts/layout-check.mjs`（CDP 读 scrollWidth）：
- 四类详情页 × 360/768/1280 全部 `scrollWidth == clientWidth`，无横向滚动。
- 长代码块探针（`KB-ENG-902`，正文含 ~190 字符单行命令）：
  360px 下页面 `scrollWidth=345`、代码块 `scrollWidth=1863 > clientWidth=313` →
  代码块自身横向溢出（`.prose pre { overflow-x:auto }` 生效），页面不撑破。

## 10. 隐私三层 + 第三方 JS 审查（#8）

`node qa/scripts/privacy-scan.mjs`：
```
L1 工作树：76 文件，0 真实命中
L2 历史：18 提交，0 真实命中
L3 产物：31 文本，0 命中；另跳过 22 个第三方打包产物（pagefind/_astro）
```

第三方产物独立审查（grep 敏感模式）：
- 密钥（ghp_/sk-/AKIA/PRIVATE KEY）：**0 命中**
- 手机号 / 身份证：**0 命中**
- 邮箱：仅 `pagefind-component-ui.js` 内出现，均为 **Pagefind 开源库贡献者邮箱**
  （`amit@thetechbasket.com`、`apjanco@upenn.edu` 等，第三方库自带 license/contributors 元数据），
  **非本站敏感数据、非站点内容泄漏**。

## 11. NOT TESTED 项

| 项 | 原因 |
| --- | --- |
| 真实用户内容上站 | T2.2（`feat/a2-content`）未合并，主仓库无真实素材；「真实内容 → 站点/搜索」链路以隔离探针替代验证 |

## 12. 缺陷

- 新增缺陷：**0**。P0/P1 为 0。
- 历史缺陷：DF-001 已闭环（INC-001，值级 SHA-256 白名单）。
- 本次脚本自纠：`search-probe` 相对 URL 解析、`data-isolation` 用 id 作探针的假阳性（`profile` 通用词），均已修复并复跑，非站点缺陷。

## 13. 证据清单

| 证据 | 位置 |
| --- | --- |
| 详情页截图 | `qa/evidence/wave2/detail-knowledge.png` |
| 搜索结果截图 | `qa/evidence/wave2/search-result.png` |
| 长代码块 360px 截图 | `qa/evidence/wave2/detail-knowledge-360.png` |
| 首页/404 三档截图 | `qa/evidence/wave2/home-*.png`、`404-360.png` |
| 脚本机器可读输出 | `qa/baseline/*-latest.json`（运行生成，不入库） |

## 14. 下一轮唯一目标

T2.2（真实内容）合入 main 后，用真实素材复核 §11 的 NOT TESTED 项；
并等待 `qa/a5-wave2` 的验收脚本（`layout-check`/`search-probe`/`data-isolation`/`content-consistency`）合入 main 供后续回归使用。
