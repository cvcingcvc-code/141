# 验收报告 — Wave 3A 导入与阅读最终独立验收（2026-11-14）

> 角色：A5 独立 QA（只读，未修改任何 A3/A4 业务代码）。
> 最终验收基线：`main@c6fec077`（T4.3 导入 #26、T3.3 可读性 #27、#29 长链接修复、#31 文档警告、#32 P1 隐私修复、#33 `docs/incidents/INC-002.md` 裁决均已合入）。
> 分支：`qa/a5-wave3a`（已普通 merge `origin/main@c6fec077`，工作树干净，未 force push）。
> 契约版本：`CONTRACTS.md` v1.0.0-rc4。
> 判定四类：PASS / FAIL / BLOCKED / NOT TESTED。**纯合成测试数据验收，不编造用户实际经历。**
>
> **最终状态（对齐 `main@c6fec077` / `INC-002`）**：§5 的唯一 FAIL（P1）已由 PR #32 修复并合入 `main`（`529fe47`），合并态回归通过（§10.2），P1 状态 **CLOSED**；Wave 3A 功能验收 **9 项通过（8 PASS + 1 CLOSED）**。
> **隐私门禁（对齐 `docs/incidents/INC-002.md` 已生效裁决）**：在包含历史提交 `f65cd8b`、`332568a` 的 `qa/a5-wave3a` 分支上，`privacy-scan.mjs` 实测为 **L1=0 / L2=3（3 项历史合成测试值）/ L3=0，退出码 `exit 1`**。依 `INC-002` 裁决：**不批准值级白名单、不修改扫描规则、PR #25 仅允许 squash 合并**；`main` 的最终隐私门禁须在 PR #25 按 squash 合并入 `main`（移除 `main` 可达性，不宣称 GitHub 历史对象已消失）后，在新 `main` 上重跑 `privacy-scan` 取得 `exit 0` 方可关闭。

## 1. 验收结果总表

| # | 验收项 | 判定 | 证据 |
| --- | --- | --- | --- |
| 1 | 基线命令 + 隐私扫描（真实退出码） | **基线命令 PASS（exit 0）；本分支 privacy-scan exit 1（L1=0/L2=3/L3=0，按 INC-002 squash 合入 main 后复测关闭）** | §3 / §10.2 |
| 2 | 合法输入生成可校验草稿 | **PASS** | §4 |
| 3 | 缺失 did/learned 不自动编造 | **PASS** | §4 |
| 4 | 非法日期/重复日期/覆盖保护/路径穿越/非法 vault-ref 阻止 | **PASS** | §4 |
| 5 | --authorize 不把未脱敏原稿带入公开仓库 | **FAIL → 已修复（PR #32）→ CLOSED** | §5 / §10 |
| 6 | 导入稿 published:false、review_status:draft、无审批实值 | **PASS** | §4 |
| 7 | 360/768/1280 长文/超长链接/宽表格/代码块/移动导航可读 | **PASS** | §6 |
| 8 | 未发布内容不进 HTML/content.json/Pagefind | **PASS** | §7 |
| 9 | FAIL 最小复现 + 明确归属 | 已给出 | §5 |

> 合计（修复前）：**8 PASS + 1 FAIL**；0 BLOCKED；0 NOT TESTED。
> 最终（对齐 `main@c6fec077` / `INC-002`）：**Wave 3A 功能验收 9 项通过（8 PASS + 1 CLOSED）**；0 FAIL；0 BLOCKED；0 NOT TESTED。`main` 的最终隐私门禁须在 PR #25 按 squash 合入 `main` 后重跑 `privacy-scan` `exit 0` 方可关闭。

## 2. 上轮 BLOCKED 项已解锁

上轮（PR #25 旧报告）的 7 项 BLOCKED 全部解除，因为 A3/A4 已合入：
- T4.3（`scripts/import/new-journal.mjs` 313 行 + `templates/` + `docs/IMPORT.md`）已由 #26 合入。
- T3.3（`global.css` 排版尺度 + 表格/代码块/移动导航样式）已由 #27 合入。
- #29 追加 `.prose { overflow-wrap: anywhere }` 修复长链接撑破 360px。

## 3. 基线命令（#1，真实退出码）

```
npm run scope:check → 0 越界                                  exit 0
npm run validate    → 0 errors, 1 warning（W-002 样本 6/7）   exit 0
npm test            → 37 tests / 36 pass / 1 skipped          exit 0
npm run typecheck   → exit 0
npm run build       → Pagefind 索引 8 页                       exit 0
privacy-scan.mjs    → L1 0 / L2 3（历史合成测试值）/ L3 0     exit 1
```

> 注：在本报告首次提交前的工作树上 L2 曾为 0；自包含明文合成测试值的两个历史提交（`f65cd8b`、`332568a`）进入 `qa/a5-wave3a` 分支后，本分支上 `privacy-scan.mjs` 实测如实为 **L1=0 / L2=3 / L3=0，`exit 1`**（详见 §10.2 与 `docs/incidents/INC-002.md`）。

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

1. 构造结构化笔记 `sensitive-note.md`，摘要段含合成敏感信息（身份证号 `110101********1234`、
   手机号 `138****8000`、邮箱 `private.me@example.com`）。
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

## 9. 收尾事项

- P1（--authorize 泄漏）已由 PR #32 修复并 CLOSED。
- 表格 display:block 窄屏堆叠是否调整，由 A3 决策，不阻断本轮。
- **隐私扫描 3 项历史合成测试值（已按 `docs/incidents/INC-002.md` 裁决）**：不批准值级白名单、不修改扫描规则、PR #25 仅允许 squash 合并；在本分支 `qa/a5-wave3a` 上 `privacy-scan.mjs` 保持 **L1=0 / L2=3 / L3=0，`exit 1`**，待 PR #25 按 squash 合入 `main`（移除 `main` 可达性，不宣称 GitHub 历史对象已消失）后，在新 `main` 上重跑 `privacy-scan` `exit 0` 方可关闭最终隐私门禁。

## 10. P1 修复独立复测（PR #32 HEAD `5792094`）

> 目标 PR：`https://github.com/cvcingcvc-code/141/pull/32`（`feat/a4-import-privacy`，HEAD `5792094`，
> 未合并 main）。复测在 detached HEAD `5792094` 上独立执行，未修改 A4 业务代码。
> 修复内容：`scripts/import/new-journal.mjs` 写盘前预检（复用 A2 `loadContent` 做 V-010 + Schema）
> + `--authorize` 正文只从 did/learned 等结构化字段生成、不复制 `--from` 原文；`docs/IMPORT.md`
> 补充「自动检查拦不住人名/公司名/内部系统名等非格式化隐私」的说明。

### 复测结果（8 项全 PASS）

| # | 复测项 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | 合成邮箱/手机号/身份证 + --authorize → V-010 阻断，content/ 不产生文件 | **PASS** | 三条 V-010（邮箱/手机号/身份证），exit 1，`content/journal/2026/` 无 `2026-11-14.md` |
| 2 | 敏感信息分放 summary/did/learned → 均阻断 | **PASS** | did 手机号 `139****5678`→V-010；learned `sk-`→V-010；summary 三类→V-010，均 exit 1 |
| 3 | 非结构化段落唯一标记不进入 --authorize 正文 | **PASS** | 标记 `QA_UNIQUE_MARKER_20261114_7f3a` 0 命中；正文只含 `## 完成`/`## 学到` |
| 4 | --force 覆盖预检失败后哈希不变 | **PASS** | before/after SHA-256 均为 `eb7ac573…ef31` |
| 5 | --dry-run 不写文件 + 临时目录清理 | **PASS** | 无 `ki-import-precheck-*` 残留 |
| 6 | 合法输入 --authorize 成功导入，draft/不发布 | **PASS** | `published:false`、`review_status:draft`、`approved_at/by:null`，exit 0 |
| 7 | validate/test/typecheck/build/privacy-scan 无回归 | **PASS** | 0 errors/1 warning；37 tests/36 pass；typecheck/build exit 0；当时在不含 QA 分支历史的 PR #32 detached HEAD `5792094` 上测得隐私三层 0 命中（exit 0；而在含 `f65cd8b`/`332568a` 的 `qa/a5-wave3a` 分支上实测为 L1=0/L2=3/L3=0，exit 1） |
| 8 | 自动检查无法识别人名/系统名等非格式化隐私已说明 | **PASS** | `docs/IMPORT.md` 明确「拦不住人名/公司名/内部项目代号/隐喻式隐私」 |

### 修复前后对照

| 行为 | 修复前（main@1382ec1，PR #25 FAIL） | 修复后（PR #32 HEAD 5792094） |
| --- | --- | --- |
| 敏感原稿入库 | `--authorize` 把 `--from` 原文整段拼进 `## 原始记录`，先写盘后校验 | 写盘前预检（V-010+Schema），失败拒绝且不留文件 |
| 正文内容 | 复制 `--from` 原文（含非结构化段落） | 只从 did/learned/blocked/tomorrow 生成，不复制原文 |
| 覆盖保护 | 先写后验，已写文件可能被污染 | `--force` 同样先预检，失败不触碰已有文件 |

### 结论（§10.1 时点，PR #32 合并前）

- **P1（PR #25 唯一 FAIL）已在 PR #32 HEAD `5792094` 独立复测通过，8 项全 PASS。**
- 当时 PR #32 尚未合入 main，故 §10.1 不宣布最终 PASS；该结论已被 §10.2（合并态回归）取代。

### 10.2 合并态回归与 INC-002 对齐验证（main@529fe47 → main@c6fec077）

PR #32 已于 2026-11-14 21:15 合入 `main`（`529fe47`），PR #33（`docs/incidents/INC-002.md` 权威裁决）已合入 `main@c6fec077`。本轮在 `qa/a5-wave3a` 普通 merge `origin/main@c6fec077` 后的工作树上重跑全部关键项，记录真实退出码（不复制上次 PASS）：

| 复测项 | 实测 | 退出码 |
| --- | --- | --- |
| 合成敏感 + --authorize → V-010 阻断 | 三条 V-010（邮箱/手机号/身份证），content/ 无新文件 | 1（拒绝） |
| 入库正文只含结构化字段 | 正文仅 `## 完成`/`## 学到`，唯一标记 `QA_UNIQUE_MARKER_20261114_7f3a` 0 命中 | 0 |
| --force 覆盖失败哈希不变 | `eb7ac573…ef31` == `eb7ac573…ef31` | 1（拒绝覆盖） |
| dry-run 不写文件 + 临时目录清理 | 无 `ki-import-precheck-*` 残留 | 0 |
| 合法导入 draft/不发布 | `published:false`、`review_status:draft`、`approved_at/by:null` | 0 |
| scope:check | 0 越界 | 0 |
| validate | 0 errors, 1 warning | 0 |
| test | 37 tests / 36 pass / 1 skipped | 0 |
| typecheck | Generated 1.16s | 0 |
| build | Pagefind 索引 8 页 | 0 |
| privacy-scan | L1=0 / L2=3（3 项历史合成测试值）/ L3=0（见下方 `INC-002` 附注） | 1（本分支含 `f65cd8b`/`332568a` 历史） |
| KB-ENG-003 隔离 | content.json items=0、无详情页、Pagefind 0 命中 | — |

> **隐私扫描 L2=3 命中说明（已按 `docs/incidents/INC-002.md` 权威裁决处置）**：
> 在包含 `f65cd8b`、`332568a` 两个历史提交的 `qa/a5-wave3a` 分支上，`privacy-scan.mjs` 实测为 **L1=0 / L2=3 / L3=0，退出码 `exit 1`**。
> 3 处 L2 命中均来自本 QA 分支早期报告提交里误写明文的**合成测试值**（非真实 PII、非业务代码、从未进入 `main`）：
>
> | # | 掩码 | 来源 | 对应提交 | 性质 |
> | --- | --- | --- | --- | --- |
> | 1 | 身份证号 `110101********1234` | §5 FAIL 复现步骤（合成测试值） | `f65cd8b` | 自造测试证件号，非真实 PII |
> | 2 | 手机号 `138****8000` | §5 FAIL 复现步骤（合成测试值） | `f65cd8b` | 自造测试号码，非真实 PII |
> | 3 | 手机号 `139****5678` | §10.1 复测表 did 用例（合成测试值） | `332568a` | 自造测试号码，非真实 PII |
>
> **权威裁决（见 `docs/incidents/INC-002.md`，`main@c6fec077` 已生效）**：
> 1. **不批准值级白名单**：三项合成值不加入 `KNOWN_VALUE_SHA256`，永久保留命中状态（本文件亦不记录其完整值或 SHA-256）；
> 2. **不修改扫描规则**：不加例外、不放宽正则、不调阈值、不关闭门禁；
> 3. **PR #25 仅允许 squash 合并**：严禁 merge commit / rebase merge，以移除 `f65cd8b`、`332568a` 对 `main` 的可达性（合并后删除远端分支，**但不宣称 GitHub 上的历史对象已消失**）。

### 最终结论（以本轮实测与 INC-002 裁决为准）

- **P1（--authorize 未脱敏原稿入库）已由 PR #32 修复、合入 `main@529fe47`，并在合并态回归通过，状态 CLOSED。**
- **Wave 3A 功能验收：9 项通过（8 PASS + 1 CLOSED），0 FAIL，0 BLOCKED，0 NOT TESTED。**
- **本分支隐私扫描实测**：在包含历史提交 `f65cd8b`、`332568a` 的 `qa/a5-wave3a` 分支上，`privacy-scan.mjs` 实测为 **L1=0 / L2=3（3 项历史合成测试值）/ L3=0，退出码 `exit 1`**。
- **最终隐私门禁关闭条件（对齐 `INC-002`）**：不批准值级白名单、不修改扫描规则、PR #25 仅允许 squash 合并；`main` 的最终隐私门禁须在 PR #25 按 squash 合并入 `main`（移除 `main` 可达性，不宣称 GitHub 历史对象已消失）后，在新 `main` 上重跑 `privacy-scan` `exit 0` 方可关闭。

