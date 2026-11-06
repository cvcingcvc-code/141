# Wave 3A 测试清单 — 导入与阅读独立 QA

> 归属：A5。验收对象：T4.3（复盘导入流程）+ T3.3（可读性）。
> 基线：`main@715ef29`。**当前 A3（T3.3）/ A4（T4.3）尚未合入 main**，本清单先把
> 可复现步骤与判定标准定死，落地后逐项执行；未落地项标 BLOCKED，不写 PASS。
>
> 判定四类：PASS / FAIL / BLOCKED / NOT TESTED。纯测试数据验收，不编造用户实际经历。

## 0. 验收标准（来源）

- **T4.3 导入流程**（TASKS §5）：产出 `templates/journal-template.md`、`templates/error-template.md`、
  `scripts/import/new-journal.mjs`、`docs/IMPORT.md`。
  DoD：① 生成条目默认 `review_status: draft` + `approved_at: null`；② `agent-drafted + approved` 被 V-011/V-019 拦截；
  ③ `docs/IMPORT.md` 写清「人工整理 → 校验 → PR → 用户审核 → 合并」并标注未接通数据源。
  不许做：不自动抓取 / 不自动生成内容 / 不自动 approve / 不自动 merge。
- **T3.3 可读性**（TASKS §4）：产出排版尺度、移动端导航、长文可读性。
  DoD：360/768/1280 三档截图；正文对比度 ≥4.5:1（AA）。
- ACCEPTANCE.md 相关门禁：M4「导入脚本产物默认 draft 且不可发布」；US-6「按 IMPORT.md 录入 → draft → 校验通过但不上站 → approve 后上站」。

## 1. 复盘模板符合现有 Schema

- 步骤：`templates/journal-template.md` 的 frontmatter 逐字段对照 `src/content/schema.ts`（C-7 journal 字段）。
- 判定：模板字段名/类型/枚举与 schema 完全一致；无 schema 不存在的字段；`review_status`/`source` 枚举正确。
- 当前：**BLOCKED**（`templates/` 不存在，T4.3 未合入）。

## 2. 合法输入生成可校验草稿

- 步骤：用纯测试数据（虚构、标注 sample）填写模板 → `node scripts/import/new-journal.mjs <输入>` → 检查产物。
- 判定：产物 frontmatter 合法；`npm run validate` 对产物 exit 0；产物 `review_status: draft`、`approved_at: null`。
- 当前：**BLOCKED**（`scripts/import/` 不存在）。

## 3. 缺失必填字段不能自动编造

- 步骤：给导入脚本一个缺 `did`/`learned`（或 `date`/`title`）的输入 → 观察脚本行为。
- 判定：脚本报错并**不**产出条目；绝不自动填充 `did`/`learned` 等经历类字段（禁止编造）。
- 当前：**BLOCKED**（脚本未落地）。

## 4. 重复日期 / 非法文件名 / 路径穿越 / 覆盖已有文件被阻止

- 步骤：
  - 重复日期：对已存在的 `<YYYY-MM-DD>.md` 再导一次 → 应拒绝或提示冲突，不静默覆盖。
  - 非法文件名：输入含 `../`、绝对路径、中文文件名、空格 → 应拒绝。
  - 路径穿越：输入 `../../secret.md` 或 `journal/2026/../../x` → 必须被归一化/拒绝，不能写到 content 外。
- 判定：以上均被阻止，脚本 exit 非 0 且无文件被写出或覆盖。
- 当前：**BLOCKED**（脚本未落地）。

## 5. 未授权私人原稿不会被写进公开仓库

- 步骤：检查导入流程是否只产出结构化 frontmatter + 正文，不写 `vault_ref` 指向的原文；跑 `privacy-scan`。
- 判定：L3 原文只以 `vault_ref` 指针存在；工作树/历史/产物三层隐私扫描 0 真实命中；`F:\141-vault\` 不在 git 内。
- 当前：**部分 BLOCKED**（隐私扫描已可测，见 §8；导入脚本是否引入原文依赖 T4.3）。

## 6. draft / published:false 不进 HTML / content.json / Pagefind

- 步骤（现可测）：构建后断言 `content.json` 的 `items` 不含 `published:false` / `draft` 条目；
  `dist` 无对应详情页 HTML；Pagefind 片段 grep 不到其标题/正文关键词。
- 判定：三处产物均 0 命中。
- 当前：**PASS**（KB-ENG-003 已实测，见报告 §6）。

## 7. 360/768/1280 真实浏览器检查（长文 / 表格 / 代码块可读）

- 步骤：`node qa/scripts/layout-check.mjs --base ... --urls ...`（CDP 读 scrollWidth）+
  截图三档；对含长文/表格/代码块的内容页逐一检查。
- 判定：三档无横向滚动；代码块自身横向滚动而非撑破；表格在窄屏可读（不溢出或可横向滚动）；正文对比度 ≥4.5:1。
- 当前：**BLOCKED**（T3.3 未落地——`global.css` 无 table 样式、仅 480px 断点、对比度未实测；
  且 KB-ENG-003 为 `published:false`，无法在站点渲染其长文/表格）。

## 8. validate / test / typecheck / build / privacy-scan 真实退出码

- 步骤：逐个命令记录真实退出码与末行输出（禁止只看「看起来对」）。
- 当前：**PASS**（见报告 §8，均已记录 exit code）。

## 9. 每个 FAIL 给出最小复现 + 明确归属

- 规则：任何 FAIL 必须含「复现步骤 / 期望 / 实际 / 根因定位（文件+行为）/ 归属（A3 或 A4）」；
  只记录缺陷，不代 A3/A4 改代码。
- 当前：本轮 0 个 FAIL（仅 BLOCKED，无落地对象可测出缺陷）。
