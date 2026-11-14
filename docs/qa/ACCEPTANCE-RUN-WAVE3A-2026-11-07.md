# 验收报告 — Wave 3A 导入与阅读最终独立验收（2026-11-14）

> 角色：A5 独立 QA（只读，未修改任何 A3/A4 业务代码）。
> 基线：`main@1382ec1`（T4.3 导入 #26、T3.3 可读性 #27、#29 长链接修复均已合并）。
> 分支：`qa/a5-wave3a`（HEAD `90d59f2`，merge `origin/main`，工作树干净，未 force push）。
> 契约版本：`CONTRACTS.md` v1.0.0-rc4。
> 判定四类：PASS / FAIL / BLOCKED / NOT TESTED。**纯合成测试数据验收，不编造用户实际经历。**

## 1. 验收结果总表

| # | 验收项 | 判定 | 证据 |
| --- | --- | --- | --- |
| 1 | 基线命令 + 隐私扫描（真实退出码） | **PASS** | §3 |
| 2 | 合法输入生成可校验草稿 | **PASS** | §4 |
| 3 | 缺失 did/learned 不自动编造 | **PASS** | §4 |
| 4 | 非法日期/重复日期/覆盖保护/路径穿越/非法 vault-ref 阻止 | **PASS** | §4 |
| 5 | --authorize 不把未脱敏原稿带入公开仓库 | **FAIL** | §5 |
| 6 | 导入稿 published:false、review_status:draft、无审批实值 | **PASS** | §4 |
| 7 | 360/768/1280 长文/超长链接/宽表格/代码块/移动导航可读 | **PASS** | §6 |
| 8 | 未发布内容不进 HTML/content.json/Pagefind | **PASS** | §7 |
| 9 | FAIL 最小复现 + 明确归属 | 已给出 | §5 |

> 合计：**8 PASS + 1 FAIL**；0 BLOCKED；0 NOT TESTED。

## 2. 上轮 BLOCKED 项已解锁

上轮（PR #25 旧报告）的 7 项 BLOCKED 全部解除，因为 A3/A4 已合入：
- T4.3（`scripts/import/new-journal.mjs` 313 行 + `templates/` + `docs/IMPORT.md`）已由 #26 合入。
- T3.3（`global.css` 排版尺度 + 表格/代码块/移动导航样式）已由 #27 合入。
- #29 追加 `.prose { overflow-wrap: anywhere }` 修复长链接撑破 360px。

## 3. 基线命令（#1，真实退出码）

```
npm run validate  → 0 errors, 1 warning（W-002 样本 6/7）   exit 0
npm test          → 37 tests / 36 pass / 1 skipped           exit 0
npm run typecheck → exit 0
npm run build     → Pagefind 索引 8 页                        exit 0
privacy-scan.mjs  → L1 0 / L2 0 / L3 0 真实命中               exit 0
```

## 4. 导入流程（#2 #3 #4 #6，实测输出）

合成笔记（`/tmp/qa-wave3a/good-note.md`，纯虚构）实测：

- **#2 合法输入**：`--from good-note.md --dry-run` → 输出到仓库外 `F:\141-vault\drafts\`，
  title/summary/did/learned/blocked/tomorrow 正确解析。
- **#3 缺失必填**：只传 title/summary（无 did/learned）→ `错误: 必填信息缺失... did / learned`，exit 1，**不编造**。
- **#4a 非法日期**：`--date 2026-02-30` → `不是真实日期`，exit 1。
- **#4b 路径穿越**：`--vault-ref vault:../secret.md` → 拒绝，exit 1。
- **#4c 非法 vault-ref**：`C:/secret.md`、`http://evil.com`、`vault:/absolute`、`vault:../../etc` 四种全部拒绝。
- **#4d 重复日期**：首次写盘成功（`/tmp/.../2026-11-14.md`），同日期二次写入 → `已存在...确认覆盖加 --force`，拒绝。
- **#4e 仓库内 --out**：`--out F:/141-wt/a5/content`（无 --authorize）→ `草稿必须落在仓库外`，拒绝。
- **#6 字段实值**：dry-run 输出确认 `published: false`、`review_status: draft`、`source: agent-drafted`、
  `approved_at: null`、`approved_by: null` —— **无任何人工审批实值**。

## 5. FAIL：#5 —— --authorize 会把未脱敏原稿完整带入公开仓库

**严重级：P1（泄漏风险）**　**归属：A4**　**关联契约：C-18 / V-010 / P0-1**

### 复现步骤（纯合成数据，无真实 PII）

1. 构造结构化笔记 `sensitive-note.md`，摘要段含合成敏感信息（身份证号 `110101199001011234`、
   手机号 `13800138000`、邮箱 `private.me@example.com`）。
2. 执行：`node scripts/import/new-journal.mjs --date 2026-11-14 --from sensitive-note.md --authorize --dry-run`

### 期望 / 实际

- 期望：未脱敏的私人原稿**不得**被脚本自动带入公开仓库；应拒绝或强制走 `vault_ref`。
- 实际：敏感原文被**完整带入两处**（frontmatter `summary` 字段 + 正文 `## 原始记录` 段）：
  身份证号、医保卡、邮箱、电话原样出现。

### 根因（定位到文件与行为）

`scripts/import/new-journal.mjs`：
1. 第 260 行 `body = raw.trim()` 把 `--from` 源笔记**完整正文**（strip frontmatter 后）存入 body；
2. 第 288 行把 body 原样写入生成文件的 `## 原始记录` 段；
3. `summary` 从摘要段解析，摘要段含敏感信息时也会进 frontmatter；
4. 第 299 行 `writeFileSync` **先写盘**、第 306 行才跑 `validate-content.mjs` ——
   V-010 的敏感拦截是**事后兜底**（文件已落入 `content/`），脚本第 307 行也自述「文件已写出」。

> 说明：`validate` 的 V-010 确实含身份证号/手机号正则（`scripts/validate-content.mjs` PII_PATTERNS），
> 但它只报错不删文件，且执行时机在写盘之后，不能阻止泄漏入 git 历史。

### 处置

交 A4 修复，QA 不改业务代码。建议方向（供 A4 参考）：`--from` 应只解析结构化区块
（title/summary/did/learned/blocked/tomorrow），**不把源笔记全文带入正文**；原始正文应默认
只写 `vault_ref` 指针，或要求显式脱敏确认后才可进入公开仓库。

## 6. 可读性（#7，隔离环境 F:\141-e2e 实测）

注入 `KB-ENG-903`（超长链接 191 字符 + 宽表格 + 长代码块），`layout-check` + 元素级 CDP 实测：

```
360 / 768 / 1280 三档：文档 scrollWidth == clientWidth，无横向滚动 ✅
代码块：scrollWidth 1596 > clientWidth 311 → overflow-x:auto 生效（自身横向滚动）✅
超长链接：overflow-wrap:anywhere 生效，断行不撑破（191 字符链接，文档无溢出）✅
移动导航：≤640px 下 grid 三列、6 个链接、min-height 44px 触控目标 ✅
```

- **观察（非阻断）**：`.prose table { display: block }` 使表格在窄屏退化为**纵向堆叠**
  （4 行表格高 677px，`scrollWidth==clientWidth`，列对齐丢失），与 CSS 注释「块级横向滚动」不符。
  内容完整、不溢出（满足最低可读），但失去表格列对齐；建议 A3 评估是否改用 `table-wrap` 包裹
  保持横向滚动。此项记为观察，不计 FAIL。

## 7. 数据隔离（#8）

KB-ENG-003（`published:false` 真实内容）与全部样本不进入产物：
`content.json` items=0、counts 全 0；`dist/knowledge/` 仅列表页 index.html，无详情页；
Pagefind 片段 grep 标题/正文关键词 0 命中。

## 8. 交付物

| 路径 | 说明 |
| --- | --- |
| `qa/wave3a-checklist.md` | 9 项可复现测试清单（上轮已提交） |
| `docs/qa/ACCEPTANCE-RUN-WAVE3A-2026-11-07.md` | 本报告（覆盖上轮「2 PASS + 7 BLOCKED」） |

## 9. 下一轮唯一目标

A4 修复 §5 的 --authorize 泄漏（P1），复测通过后关闭该缺陷；
表格 display:block 堆叠是否调整由 A3 决策，不阻断本轮。
