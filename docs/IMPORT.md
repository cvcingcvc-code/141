# IMPORT.md — 真实笔记导入流程（T4.3）

> 面向"明天就要用"的场景：你写了一段原始笔记，想让它以**合法但未发布**的形态进入仓库。
> 本流程只做机械转换与校验，不替你判断内容真假，也不替你批准发布。

## 1. 一条命令

默认把草稿写到**仓库外**（`F:\141-vault\drafts\`），只有加 `--authorize` 才写进公开仓库 `content/`。
必填信息（`title` / `summary` / `did` / `learned`）缺失会**直接报错退出**，不会生成空壳草稿。

```bash
# 从结构化笔记生成草稿（默认仓库外）
node scripts/import/new-journal.mjs --date 2026-11-08 \
  --from F:/141-vault/intake/2026-11-08.md

# 纯命令行给必填字段（默认仓库外）
node scripts/import/new-journal.mjs --date 2026-11-08 \
  --title "选了 Astro 而不是 Next" --summary "静态知识库用 Astro 内容集合最省事" \
  --did "完成前端框架选型" --did "搭好内容集合骨架" --learned "契约先于实现能少返工"

# 先看会写出什么，不落盘
node scripts/import/new-journal.mjs --date 2026-11-08 --from note.md --dry-run

# 用户明确授权入库后，才写进公开仓库 content/
node scripts/import/new-journal.mjs --date 2026-11-08 --from note.md --authorize
```

`--from` 指向的**结构化笔记**格式（人工整理，脚本只做机械解析，不"理解"自由文本）：

```markdown
# 标题（4..80 字）
摘要段落（20..200 字，一句话说清）

## did
- 做了 A
- 做了 B

## learned
- 学到 X

## blocked（可选）
- 卡住 Y

## tomorrow（可选）
- 计划 Z
```

产出路径：

| 是否 `--authorize` | 产出位置 |
| --- | --- |
| 否（默认） | 仓库外 `F:\141-vault\drafts\<日期>.md`（草稿） |
| 是 | 仓库内 `content/journal/<年>/<日期>.md`（待审核稿） |

生成条目的关键字段：

| 字段 | 值 | 说明 |
| --- | --- | --- |
| `review_status` | `draft` | 未定稿，不会上站 |
| `source` | `agent-drafted`（默认；可 `--source self-reported`） | 改 `approved` 必须留 `approved_at`/`approved_by`（V-011/V-019） |
| `approved_at` / `approved_by` | `null` | 明确留空，脚本永不生成审批实值 |
| `published` | `false` | 显式写 false（P0-1 缺省即不发布） |
| `published_by` | 不写 | 脚本永不生成人工标识 |
| `did` / `learned` | 来自 `--from` 或 `--did`/`--learned` | 缺失会**报错退出**，不用占位符冒充内容 |

写完会自动跑一次 `validate-content.mjs`（`--dry-run` 除外）；不通过会退出码 1（文件仍保留，改完再提交）。
`--from` 文件里若自带 YAML frontmatter 会被剥掉，只解析正文里的结构化区块。

## 2. 人工路径（必须完整走完）

```
你写原始笔记（仓库外，例如 F:\141-vault\intake\）
  → 运行 new-journal.mjs（默认生成仓库外 draft，未授权不写仓库）
  → 补齐 summary / did / learned（脚本已拒绝空壳，无需再填占位符）
  → npm run validate            # 必须 0 errors
  → 用户明确授权后，加 --authorize 生成 content/ 下的待审核稿
  → 提交 PR                      # CI：scope:check / validate / test / typecheck / build
  → 你本人审核 PR 并合并          # 这一步才是"批准"，不是字段
  → 想上站？再由你本人改 published: true + published_at + published_by: user
```

要点：**脚本不 commit、不 PR、不 merge、不 deploy**。仓库历史就是你点过头的证据。

## 3. 明确没接通的东西（别期待它自己会）

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 读取 `F:\141-vault\` | ❌ 不读 | 只接受你显式传 `--from` 的单个文件路径 |
| Obsidian/Notion/Flomo/微信/飞书同步 | ❌ 未接 | 无 API、无 token、无后台任务 |
| PDF / Word / 图片解析 | ❌ 未接 | 第一版由人工先提取并确认文字，再走本流程 |
| 自动拆分 `did` / `learned` | ❌ 不做 | 判断哪些算"学到"必须你本人来 |
| 自动 approve / 自动合并 / 自动部署 | ❌ 禁止 | 见 `AGENTS.md` 与 `CONTRACTS.md` C-12 |
| 错误经验（errors）导入脚本 | ❌ 本版没有 | 只有模板 `templates/error-template.md`，手工复制填写 |

## 4. 错误经验怎么进

复制 `templates/error-template.md` 到 `content/errors/er-YYYYMMDD-NN-<slug>.md`，按提示填五要素
（`symptom` / `context` / `root_cause` / `fix` / `prevention`，缺一项 V-016 会拦）。
命名规则与字段约束见 `docs/CONTRACTS.md` C-8。

## 5. 常见拒绝与处理

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `必填信息缺失：did（至少 1 条…）` | 源笔记没写 `## did`，或没传 `--did` | 补齐真实事项，不要虚构 |
| `拒绝：... 已存在` | 同一天已导入过 | 加 `--force` 覆盖，或直接编辑原文件 |
| `拒绝：... 已存在且 published: true` | 目标已发布 | **不会覆盖**，换日期或手动处理 |
| `--date 必须是真实日期` | 写成 2026-02-30 之类 | 改对日期 |
| `未授权(--authorize)时草稿必须落在仓库外` | `--out` 指向了仓库内 | 去掉 `--out` 或加 `--authorize` |
| `--vault-ref 必须是 "vault:<相对路径>"` | 用了绝对路径 / 盘符 / `../` / 其它协议 | 改成 `vault:journal/2026/2026-11-08-raw.md` 形态 |
| 校验退出码 1 | tags 不在词表、正文过短（W-004）等 | 按提示改完重跑 |

## 6. 与契约的关系

本流程不新增字段、不改路由、不改发布过滤：产出的是 C-3 已有的 journal 形态，
校验仍由 `scripts/validate-content.mjs` + `src/content/schema.ts` 单点判定。
