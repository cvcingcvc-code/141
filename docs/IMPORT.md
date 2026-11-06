# IMPORT.md — 真实笔记导入流程（T4.3）

> 面向"明天就要用"的场景：你写了一段原始笔记，想让它以**合法但未发布**的形态进入仓库。
> 本流程只做机械转换与校验，不替你判断内容真假，也不替你批准发布。

## 1. 一条命令

```bash
# 只有笔记正文（最常见）
node scripts/import/new-journal.mjs --date 2026-11-08 --from F:/141-vault/intake/2026-11-08.md

# 只生成骨架，正文自己填
node scripts/import/new-journal.mjs --date 2026-11-08

# 先看会写出什么，不落盘
node scripts/import/new-journal.mjs --date 2026-11-08 --from note.md --dry-run
```

产出：`content/journal/<年>/<日期>.md`，其中

| 字段 | 值 | 说明 |
| --- | --- | --- |
| `review_status` | `draft` | 未定稿，不会上站 |
| `source` | `agent-drafted` | 结构是脚本生成的；改 `approved` 必须留 `approved_at`/`approved_by`（V-011/V-019） |
| `approved_at` | `null` | 明确留空，等你自己确认 |
| `published` | **不写** | 缺省即不发布（P0-1） |
| `published_by` / `approved_by` | **不写** | 脚本永不生成人工标识 |
| `did` / `learned` | `（待填写）` | 占位符，不是替你编的内容 |

写完会自动跑一次 `validate-content.mjs`；不通过会以退出码 2 结束（文件仍保留，改完再提交）。
`--from` 文件里如果自带 YAML frontmatter，会被剥掉，只搬正文。

## 2. 人工路径（必须完整走完）

```
你写原始笔记（仓库外，例如 F:\141-vault\intake\）
  → 运行 new-journal.mjs（生成 draft）
  → 把（待填写）换成你自己的话：summary / did / learned
  → npm run validate            # 必须 0 errors
  → 提交 PR                      # CI：scope:check / validate / test / typecheck / build
  → 你本人审核 PR 并合并          # 这一步才是"批准"，不是字段
  → 想上站？再由你本人改 published: true + published_at + published_by: user
```

要点：**脚本不 commit、不 PR、不 merge、不 deploy**。仓库历史就是你点过头的证据。

## 3. 明确没接通的东西（别期待它自己会）

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 读取 `F:\141-vault\` | ❌ 不读 | 只接受你显式传 `--from` 的单个文件路径 |
| Obsidian/Notion/Flomo 同步 | ❌ 未接 | 无 API、无 token、无后台任务 |
| 自动拆分 `did` / `learned` | ❌ 不做 | 判断哪些算"学到"必须你本人来 |
| 自动 approve / 自动合并 / 自动部署 | ❌ 禁止 | 见 `AGENTS.md` 与 `CONTRACTS.md` C-12 |
| 错误经验（errors）导入脚本 | ❌ 本版没有 | 只有模板 `templates/error-template.md`，手工复制填写 |

## 4. 错误经验怎么进

复制 `templates/error-template.md` 到 `content/errors/er-YYYYMMDD-NN-<slug>.md`，按提示填五要素
（`symptom` / `context` / `root_cause` / `fix` / `prevention`，缺一项 V-016 会拦）。
命名规则与字段约束见 `docs/CONTRACTS.md` C-6。

## 5. 常见拒绝与处理

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `拒绝：... 已存在` | 同一天已导入过 | 加 `--force` 覆盖，或直接编辑原文件 |
| `拒绝：... 已存在且 published: true` | 目标已发布 | **不会覆盖**，换日期或手动处理 |
| `--date 必须是真实日期` | 写成 2026-02-30 之类 | 改对日期 |
| 校验退出码 2 | 占位符没换、tags 不在词表、正文过短（W-004） | 按提示改完重跑 |

## 6. 与契约的关系

本流程不新增字段、不改路由、不改发布过滤：产出的是 C-3 已有的 journal 形态，
校验仍由 `scripts/validate-content.mjs` + `src/content/schema.ts` 单点判定。
