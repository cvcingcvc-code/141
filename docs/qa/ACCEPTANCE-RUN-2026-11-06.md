# 验收报告 — Wave 2 / T5.2 准备（2026-11-06）

> 角色：A5 独立 QA（只读业务代码）。
> 基线：`main@4bf302e`（Wave 1 结束态：T2.1 契约代码化 + T3.1 站点外壳 + T4.1 CI/门禁 + T5.1 基线均已合并）。
> 结论口径：**未实现项一律标 BLOCKED，不写 PASS**；「因未实现而 404 / 无泄漏」不视作通过。

## 1. 环境与基线

| 项 | 值 |
| --- | --- |
| 仓库 / 分支 | `github.com/cvcingcvc-code/141` / `qa/a5-wave2`（worktree `F:\141-wt\a5`） |
| 基线 commit | `4bf302e` |
| 契约版本 | `CONTRACTS.md` v1.0.0-rc3 |
| 运行时 | Node v22.22.2 / Astro 5.18.2 |
| 日期 | 2026-11-06 |

## 2. 已执行检查（附真实输出）

### 2.1 内容校验 `npm run validate`
```
0 errors, 4 warnings
```
- `W-002` sample 6/6 超 50%（真实内容补齐后消失）——预期，非缺陷。
- `W-005` ×3 样本正文链接指向尚未实现的路由（T3.2 未落地）——预期，非缺陷。

### 2.2 单元测试 `npm test`
```
# tests 25 / # pass 24 / # fail 0 / # skipped 1
```

### 2.3 类型检查 / 范围门禁 / 构建
```
npm run typecheck  → exit 0
npm run scope:check → 分支 qa/a5-wave2（qa/a5-），改动 0 个文件，0 越界
npm run build       → 2 page(s) built；dist = index.html + 404.html
```

### 2.4 路由探测 `qa/scripts/link-check.mjs`
```
固定路由 2/8（首页、404.html 可达；about/knowledge/projects/journal/errors/search 均 404）
动态有效 ID 0/4（全部 404，T3.2 未实现）
动态无效 ID 4/4「落到 404 页」——但这是「因未实现而全 404」的假阳性，不判通过
站内链接 12 条，其中 6 条断链（Header 6 个导航 + 4 卡片指向未实现路由）
```

### 2.5 多视口布局 `qa/scripts/layout-check.mjs`
```
首页：360/768/1280 三档 scrollWidth == clientWidth，无横向滚动 ✅
404 页：三档无横向滚动 ✅
（动态详情页布局 BLOCKED —— T3.2 未实现）
```

### 2.6 隐私三层 `qa/scripts/privacy-scan.mjs`
```
L1 工作树：53 文件，0 真实命中
L2 git 历史：9 提交，0 真实命中
L3 构建产物：2 文件，0 命中
```
- 白名单已演进为**值级 SHA-256**（INC-001 预防措施），不再有文件/目录级整体跳过。

### 2.7 数据隔离 `qa/scripts/data-isolation.mjs`
```
真实发布内容：0 条
隔离测试内容（sample:true）：6 条
未授权数据（published:false / draft）：0 条（6 条样本均 sample:true，被归入隔离测试类）
产物泄漏：0 —— 但「因内容路由/产物未实现而成立」→ BLOCKED，不判 PASS
```

### 2.8 产物一致性 / 关键词命中
```
content-consistency → BLOCKED（dist/data/content.json 与 dist/pagefind/ 均不存在，T4.2 未落地）
search-probe        → BLOCKED（搜索索引未生成；真实内容 0 条）
```

## 3. 五类对象结论（对照 `qa/acceptance-plan-wave2.md`）

| 类别 | 结论 | 依据 |
| --- | --- | --- |
| 固定路由 | 2/8 可达，6 条 **BLOCKED** | 2.4 |
| 动态路由 | 有效 id 0/4、无效 id 假阳性，**BLOCKED** | 2.4 |
| 隔离测试内容 | 6 条均 sample:true ✅；「示例」徽章渲染 **BLOCKED** | 2.7 |
| 未授权数据 | 产物 0 泄漏（因未实现）→ **BLOCKED** | 2.7 / 2.8 |
| 真实发布内容 | 0 条 → 关键词命中 **BLOCKED** | 2.7 / 2.8 |

## 4. 缺陷与处置

- **DF-001（T5.1 发现）**：所有者公开身份邮箱命中 `V-010` → 已由用户授权处置为
  **INC-001**（接受为已知风险、HEAD 脱敏、值级 SHA-256 白名单、不重写历史）。
  **已闭环**。
- **Wave 2 新缺陷**：无。P0/P1 为 0。
- 发现的非缺陷事项（记录不修改）：`W-002`（样本占比）、`W-005`（正文链接指向未实现路由）
  均为 T3.2/T2.2 未落地导致的预期 warning。

## 5. BLOCKED 清单（解锁条件）

| BLOCKED 项 | 解锁任务 |
| --- | --- |
| 固定路由 6 条、动态详情页、无效 ID 正确 404、示例徽章渲染 | T3.2 12 路由接数据 |
| content.json / Pagefind / 产物一致性 / 关键词命中 | T4.2 数据产物 + 搜索索引 |
| 真实发布内容、真实关键词 | T2.2 内容填充 |
| 详情页 360/768/1280 布局 | T3.2 后回归 |

## 6. 交付物（本次 PR）

| 路径 | 说明 |
| --- | --- |
| `qa/acceptance-plan-wave2.md` | Wave 2 验收计划（五类对象区分 + BLOCKED 标注） |
| `qa/scripts/link-check.mjs` | 增强：固定/动态/无效 ID 分类 + IPv6 fallback |
| `qa/scripts/layout-check.mjs` | 新增：多视口实测（CDP，scrollWidth 判定） |
| `qa/scripts/data-isolation.mjs` | 新增：已发布/未发布/草稿隔离核查 |
| `qa/scripts/content-consistency.mjs` | 新增：content.json↔Pagefind↔HTML 一致性 |
| `qa/scripts/search-probe.mjs` | 新增：关键词命中（前置探测） |
| `docs/qa/ACCEPTANCE-RUN-2026-11-06.md` | 本报告 |
| `qa/evidence/wave2/*.png` | 首页/404 三档视口截图（供人工复查） |
| `qa/README.md` | 更新脚本清单 |

## 7. 下一轮唯一目标

待 **T2.2 + T3.2 + T4.2** 合入 main 后，在 preview + 部署 URL 上执行 **T5.2 真实操作
验收**：US-1/2/3/5/6/7/8 逐条走通、移动端 360px、5 个真实关键词命中与跳转，产出
`docs/qa/ACCEPTANCE-RUN-<日期>.md` 完整版并逐条闭环缺陷。
