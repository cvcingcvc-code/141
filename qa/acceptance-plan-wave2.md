# Wave 2 验收计划（T5.2 准备）— A5 独立 QA

> 基线：`main@4bf302e`（Wave 1 结束态）。本计划把 Wave 2 的验收对象分成
> **固定路由 / 动态路由 / 隔离测试内容 / 未授权数据 / 真实发布内容** 五类，
> 每类明确「检查项、判定口径、当前状态」。未实现项一律标 **BLOCKED**，不写 PASS。
>
> 原则（ACCEPTANCE §9）：编译成功/测试通过 ≠ 验收；"因未实现而 404/无泄漏"
> 不算"正确处理已通过"，必须如实标注，不得把未实现伪装成通过。

## 0. 五类对象定义

| 类别 | 定义 | 当前数量 | 判定口径 |
| --- | --- | --- | --- |
| **固定路由** | C-9 里不依赖具体 id 的路由（8 条） | 8 条 | 每条须 200 且非空白 |
| **动态路由** | C-9 里依赖具体 id 的路由（4 类） | 4 类 | 有效 id→200 详情页；无效 id→404 且落到 404 页 |
| **隔离测试内容** | `sample: true` 的示例条目 | 6 条 | 站点须标「示例」徽章；不冒充真实内容 |
| **未授权数据** | `published: false` 或 `review_status: draft` | 6 条（与 sample 重叠） | 三处产物（站点/索引/content.json）均不得出现 |
| **真实发布内容** | `published: true` + `published_by: user`（journal 另需 `approved`） | 0 条 | 出现即须在站点可见、可搜索、可跳转 |

> 说明：当前 6 条样本同时满足 `sample: true` 与 `published: false`，故「隔离测试
> 内容」与「未授权数据」在数量上重叠，但语义不同——前者是"标注了示例的测试用条目"，
> 后者是"任何不满足发布条件的内容都不得上站"。

## 1. 固定路由（8 条）

| 路由 | 检查项 | 当前状态 |
| --- | --- | --- |
| `/` | 首屏含「我是谁/在做什么」+ 内容入口 | ✅ 外壳可访问（数据接入 BLOCKED） |
| `/about/` | 展示 profile | ❌ BLOCKED（T3.2 未实现，404） |
| `/knowledge/` | 知识列表 | ❌ BLOCKED |
| `/projects/` | 项目列表 | ❌ BLOCKED |
| `/journal/` | 复盘列表（仅 approved） | ❌ BLOCKED |
| `/errors/` | 错误经验列表 | ❌ BLOCKED |
| `/search/` | 全文搜索（Pagefind） | ❌ BLOCKED（T4.2 未实现） |
| `/404.html` | 未找到页 | ✅ 可访问 |

- 脚本：`qa/scripts/link-check.mjs`（固定路由矩阵）。实测 2/8 可达，其余 6 条 404。
- **注**：`/` 现在只是 T3.1 外壳，未接 profile/journal/knowledge 数据，故「首页数据」
  子项仍 BLOCKED，仅「外壳可达」PASS。

## 2. 动态路由（4 类）

| 路由 | 有效 id 期望 | 无效 id 期望 | 当前状态 |
| --- | --- | --- | --- |
| `/knowledge/[id]/` | 200 详情页 | 404 落到 404 页 | ❌ BLOCKED（有效 id 也 404） |
| `/projects/[id]/` | 200 详情页 + 关联纯文本链接 | 404 | ❌ BLOCKED |
| `/journal/[date]/` | 200 详情页 | 404 | ❌ BLOCKED |
| `/errors/[id]/` | 200 详情页 | 404 | ❌ BLOCKED |

- 脚本：`qa/scripts/link-check.mjs`（动态有效 id / 无效 id 两矩阵）。
- **关键判定**：实测「有效 id 4/4 全是 404」而「无效 id 4/4 都落到 404 页」——
  但后者是**因动态路由未实现导致的全 404 假阳性**，不能算「无效 ID 处理已通过」。
  有效 id 与无效 id 必须能区分（有效→详情、无效→404），才算该项 PASS。→ **BLOCKED**。

## 3. 隔离测试内容（sample: true，6 条）

| 检查项 | 判定 | 当前状态 |
| --- | --- | --- |
| 条目均标 `sample: true` | 是 | ✅（6/6） |
| 站点渲染时显示「示例」徽章（C-13） | 详情/列表组件实现 | ❌ BLOCKED（T3.2 未接入，无页面渲染） |
| 不冒充真实内容 | 未混入真实发布集 | ✅（真实发布 0 条，无冒充） |

- 脚本：`qa/scripts/data-isolation.mjs`（分类统计）。

## 4. 未授权数据（published:false / draft）

| 检查项 | 判定 | 当前状态 |
| --- | --- | --- |
| 站点不出现 | dist 无对应 HTML | ✅ 无泄漏（因未实现）→ **BLOCKED** |
| 搜索索引不出现 | pagefind 无条目 | ❌ BLOCKED（索引未生成） |
| content.json 不出现 | 无该条目 | ❌ BLOCKED（content.json 未生成） |

- 脚本：`qa/scripts/data-isolation.mjs` + `qa/scripts/content-consistency.mjs`。
- **口径**：产物侧 0 泄漏是「因内容路由/产物未实现而成立」，隔离逻辑（collections.ts
  过滤）本身由 `src/content/__tests__` 单测覆盖，页面接入后的回归待 T3.2。→ 不判 PASS。

## 5. 真实发布内容（当前 0 条）

| 检查项 | 判定 | 当前状态 |
| --- | --- | --- |
| 存在 ≥1 条 published 真实内容 | 否 | ❌ BLOCKED（T2.2 未做，无真实素材） |
| 5 个真实关键词各命中 ≥1 且跳转正确 | — | ❌ BLOCKED（无内容 + 无搜索） |

- 脚本：`qa/scripts/search-probe.mjs`（关键词命中，当前 BLOCKED）。

## 6. 横切检查

| 检查项 | 脚本 | 当前状态 |
| --- | --- | --- |
| 多视口 360/768/1280 无横向滚动 | `layout-check.mjs` | ✅ 首页/404 三档通过（详情页 BLOCKED） |
| 产物一致性（content.json↔Pagefind↔HTML） | `content-consistency.mjs` | ❌ BLOCKED（T4.2 未落地） |
| 隐私三层扫描 | `privacy-scan.mjs` | ✅ 除 DF-001（所有者公开邮箱）外无真实命中 |
| PR 自动测试 / 构建 | `npm test` / `npm run build` | ✅ 24 pass / build 通过（见报告） |
| 范围门禁 | `npm run scope:check` | ✅ qa/a5-wave2 0 越界 |

## 7. 验收顺序与解锁条件

1. **T2.2 内容填充** 合入 → 出现真实发布内容 → §5 解锁。
2. **T3.2 12 路由接数据** 合入 → §1/§2/§3 解锁（固定路由 8/8、动态有效 id 200、无效 id 正确 404、示例徽章渲染）。
3. **T4.2 数据产物 + 搜索** 合入 → §4/§6 解锁（content.json、Pagefind、产物一致性、关键词命中）。

三项全部合入 main 后，A5 在 preview + 部署 URL 上执行 T5.2 真实操作验收
（US-1/2/3/5/6/7/8），产出 `docs/qa/ACCEPTANCE-RUN-<日期>.md`。
