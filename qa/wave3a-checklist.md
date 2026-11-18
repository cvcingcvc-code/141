# Wave 3A 测试清单 — 导入与阅读独立 QA

> 归属：A5。验收对象：T4.3（复盘导入流程）+ T3.3（可读性）。
> 最终验收基线：`main@c6fec077`（T4.3 #26、T3.3 #27、#29 长链接、#31 文档警告、#32 P1 隐私修复、#33 `INC-002` 裁决均已合入）。
> 判定四类：PASS / FAIL / BLOCKED / NOT TESTED。纯合成测试数据验收，不编造用户实际经历。
>
> 最终结果：Wave 3A 功能验收 **9 项通过（8 PASS + 1 CLOSED）**；在 `qa/a5-wave3a` 分支上 `scope:check / validate / test / typecheck / build` 均为 `exit 0`，`privacy-scan.mjs` 因含历史提交 `f65cd8b`、`332568a` 实测为 **`exit 1`（L1=0, L2=3, L3=0）**，依 `docs/incidents/INC-002.md` 裁决在 PR #25 仅按 squash 合入 `main`（移除 `main` 可达性，不宣称 GitHub 历史对象已消失）后复测 `exit 0` 关闭；详见 `docs/qa/ACCEPTANCE-RUN-WAVE3A-2026-11-07.md`。

## 0. 验收标准（来源）

- **T4.3 导入流程**（TASKS §5）：产出 `templates/journal-template.md`、`templates/error-template.md`、
  `scripts/import/new-journal.mjs`、`docs/IMPORT.md`。
  DoD：① 生成条目默认 `review_status: draft` + `approved_at: null`；② `agent-drafted + approved` 被 V-011/V-019 拦截；
  ③ `docs/IMPORT.md` 写清「人工整理 → 校验 → PR → 用户审核 → 合并」并标注未接通数据源。
- **T3.3 可读性**（TASKS §4）：排版尺度、移动端导航、长文可读性。DoD：360/768/1280 三档；对比度 ≥4.5:1（AA）。
- ACCEPTANCE.md：M4「导入脚本产物默认 draft 且不可发布」；US-6「按 IMPORT.md 录入 → draft → 校验通过但不上站 → approve 后上站」。

## 1. 复盘模板符合现有 Schema

- 判定：模板字段名/类型/枚举与 schema 一致；`review_status`/`source` 枚举正确。
- **PASS**：`templates/journal-template.md` / `error-template.md` 已由 #26 合入，字段与 C-7 一致。

## 2. 合法输入生成可校验草稿

- 判定：产物 frontmatter 合法；`npm run validate` exit 0；产物 `review_status: draft`、`approved_at: null`。
- **PASS**：`--from good-note.md` 生成仓库外草稿，title/summary/did/learned/blocked/tomorrow 正确解析。

## 3. 缺失必填字段不能自动编造

- 判定：脚本报错且**不**产出条目；绝不自动填充 did/learned。
- **PASS**：只传 title/summary（无 did/learned）→ `必填信息缺失... did / learned`，exit 1。

## 4. 重复日期 / 非法文件名 / 路径穿越 / 覆盖已有文件被阻止

- **PASS**（全部实测拒绝）：
  - 非法日期 `2026-02-30` → 「不是真实日期」exit 1；
  - 路径穿越 `vault:../secret.md` → 拒绝；
  - 非法 vault-ref（盘符 `C:/`、协议 `http://`、绝对 `vault:/`、`vault:../../`）→ 全部拒绝；
  - 重复日期二次写入 → 「已存在...加 --force」拒绝；
  - `--out` 指向仓库内（无 --authorize）→ 「草稿必须落在仓库外」拒绝。

## 5. 未授权私人原稿不会被写进公开仓库

- 判定：L3 原文只以 `vault_ref` 指针存在；隐私三层扫描；`F:\141-vault\` 不在 git 内。
- **PASS（PR #32 修复后 CLOSED）**：写盘前预检（复用 loadContent 做 V-010+Schema）+ `--authorize`
  正文只从结构化字段生成、不复制 `--from` 原文。
  > 注：在包含历史提交 `f65cd8b`、`332568a` 的 `qa/a5-wave3a` 分支上，`privacy-scan.mjs` 实测为 **L1=0 / L2=3（3 项历史合成测试值）/ L3=0，`exit 1`**。依 `docs/incidents/INC-002.md` 裁决：不批准值级白名单、不修改扫描规则、PR #25 仅允许 squash 合并；待 squash 合入 `main`（移除 `main` 可达性，不宣称 GitHub 历史对象已消失）后在新 `main` 上重跑 `privacy-scan` `exit 0` 关闭最终隐私门禁。

## 6. draft / published:false 不进 HTML / content.json / Pagefind

- 判定：三处产物均 0 命中。
- **PASS**：KB-ENG-003（published:false）不进 content.json（items=0）、无详情页、Pagefind 0 命中。

## 7. 360/768/1280 真实浏览器检查（长文 / 表格 / 代码块可读）

- 判定：三档无横向滚动；代码块自身横向滚动；表格可读；正文对比度 ≥4.5:1。
- **PASS**：KB-ENG-903 探针（超长链接 191 字符 + 宽表格 + 长代码块）三档 `scrollWidth==clientWidth`；
  代码块 overflow-x:auto；长链接 overflow-wrap:anywhere 断行；移动导航 grid 三列 44px。
  - 观察（非阻断）：`.prose table { display:block }` 窄屏退化为纵向堆叠（列对齐丢失），交 A3 决策。

## 8. validate / test / typecheck / build / privacy-scan 真实退出码

- **基线校验与构建 PASS（均为 `exit 0`）**：在 `qa/a5-wave3a`（已 merge `main@c6fec077`）上，`scope:check` `exit 0`、`validate` `exit 0`（0 errors / 1 warning）、`test` `exit 0`（37 tests / 36 pass / 1 skipped）、`typecheck` `exit 0`、`build` `exit 0`。
- **本分支 `privacy-scan` 实测 `exit 1`（对齐 `INC-002`）**：`node qa/scripts/privacy-scan.mjs` 实测为 **L1=0, L2=3（`f65cd8b`、`332568a` 历史合成测试值）, L3=0，退出码 `exit 1`**；依 `docs/incidents/INC-002.md` 不豁免、不改规则，在 PR #25 仅按 squash 合入 `main` 后复测 `exit 0` 方可关闭最终隐私门禁。

## 9. 每个 FAIL 给出最小复现 + 明确归属

- **已给出**：唯一 FAIL（P1，--authorize 未脱敏原稿入库）已给出复现步骤/根因/归属（A4），
  并由 PR #32 修复，合并态回归通过，状态 CLOSED。
