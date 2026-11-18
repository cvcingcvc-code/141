# IMPORT.md — 笔记导入与双库在线捕获手册（T4.3 / T6.4）

> 面向日常高频记录与整理入库的两种互补工作流：
> - **本地命令行通道（§1–§6，v0.1 `T4.3`）**：在本机使用 `scripts/import/new-journal.mjs` 将仓库外 `F:\141-vault\` 笔记转换为合规复盘草稿；
> - **在线思考捕获与双库受控同步通道（§7，v0.2 `RFC-002` / `T6.4`）**：在电脑或手机浏览器通过 `/capture/` 在线工作台写入 GitHub 私有仓库 `personal-knowledge-vault`，再将脱敏草稿受控同步至公开仓库 PR。
>
> 两条通道均只做机械转换与格式预检，不替你判断内容真假，也不替你批准公开上站。

> ⚠️ **`--authorize` 是「允许写公开仓库」的技术开关，不等于你已经确认内容可以公开。**
> 入库正文**只从 `did` / `learned` 等结构化字段生成，不再复制 `--from` 原文**；原稿留在仓库外，
> 需要保留时只写 `raw_source: vault:<相对路径>` 指针。
> 写盘前会自动跑 V-010 预检（邮箱 / 手机号 / 身份证 / 常见云与 AI 平台 API 密钥及访问令牌 / 私钥块），
> **但自动检查拦不住人名、公司名、内部项目代号、隐喻式隐私、未暴露为固定格式的家庭/健康细节**。
> 因此 `--authorize` 只能在你**逐条确认事实、完成脱敏、并明确授权本次入库**之后使用；
> **预检通过 ≠ 内容已脱敏**，最终人审仍不可省。

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

**写盘顺序（P1 修复后）**：`--authorize` 会先构建完整候选 Markdown → 做 V-010 + Schema **预检**（复用
`scripts/validate-content.mjs` 的 `loadContent`，不复制第二套规则）→ 通过才写盘。预检不通过 → **拒绝写入、
退出码 1、不产生任何 `content/` 文件，也不修改已有文件**。`--dry-run` 同样执行预检，不落盘。
未授权草稿（仓库外）保留 `--from` 原文供你自己看；`--authorize` 的正文只由 `did`/`learned` 等结构化字段生成。
`--from` 文件里若自带 YAML frontmatter 会被剥掉，只解析正文里的结构化区块。

## 2. 人工路径（必须完整走完）

```
你写原始笔记（仓库外，例如 F:\141-vault\intake\）
  → 运行 new-journal.mjs（默认生成仓库外 draft，未授权不写仓库）
  → 逐条核对：事实是否真实、有无他人隐私 / 内部系统名 / 凭据，先自行脱敏
  → 补齐 summary / did / learned（脚本已拒绝空壳，无需再填占位符）
  → 用户明确授权后，加 --authorize：写盘前自动预检（V-010 + Schema），失败即拒绝且不留文件
  → npm run validate            # 必须 0 errors
  → 提交 PR                      # CI：scope:check / validate / test / typecheck / build
  → 你本人审核 PR 并合并          # 这一步才是"批准"，不是字段
  → 想上站？再由你本人改 published: true + published_at + published_by: user
```

> `--authorize` 的前提是：**你已逐条确认事实为真、完成脱敏、并明确授权本次写入公开仓库**。
> 自动预检只是最后一道格式护栏，不能替你判断"这段内容该不该公开"。

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
| `预检失败：候选内容含敏感信息或不合规` | 候选的 summary/did/learned 里含邮箱/手机号/身份证/密钥等（V-010） | 删掉或脱敏后重跑；**预检失败不会写入任何文件**，也不要改校验器绕过 |
| 校验退出码 1 | tags 不在词表、正文过短（W-004）等 | 按提示改完重跑 |

## 6. 与契约的关系

本流程不新增字段、不改路由、不改发布过滤：产出的是 C-3 已有的 journal 形态，
校验仍由 `scripts/validate-content.mjs` + `src/content/schema.ts` 单点判定。
（注：上方 §3「明确没接通的东西」针对本机 `scripts/import/new-journal.mjs` 脚本；跨设备网页端录入与云端私有库受控同步请见下方 §7。）

---

## 7. 在线思考捕获与双库受控同步（v0.2 `RFC-002`）

不在本机开发环境（`F:\141`）旁时，可通过纯静态在线工作台随时在手机或桌面浏览器记录思考，并借助**私有思考仓库 + 公开知识仓库**的双库物理隔离架构完成受控沉淀（契约依据：`docs/CONTRACTS.md` v1.1.0 `C-9` / `C-18` 与 `docs/rfc/RFC-002-dual-repo-thought-capture.md`）。

### 7.1 在线工作台与双仓库物理隔离分工

- **在线思考捕获工作台**：`https://cvcingcvc-code.github.io/personal-knowledge-os/capture/`
  - 纯静态工具页（标注 `noindex`，不纳入 Pagefind 全文搜索索引，网页源码与构建产物不含任何凭据）；
  - 未配置本地令牌的第三方访客仅能看到空白工具外壳，无法读取或写入任何仓库数据；连接时前端还会强制核验目标仓库满足 `private: true` 防呆保护。
- **私有思考仓库（Private）**：`https://github.com/cvcingcvc-code/personal-knowledge-vault`
  - 承接在线输入的全部原始思考与待同步草稿（允许存放 `C-18` 定义的 L1 / L2 / L3 全量私密数据，严禁改为 Public）。
- **公开知识仓库（Public）**：`https://github.com/cvcingcvc-code/personal-knowledge-os`
  - 仅接收已脱敏的结构化五类内容（仅限 L1 / L2，严禁任何 L3 原始私密数据入库）。

私有仓库 `personal-knowledge-vault` 内部目录职责严格分离：

| 私有库路径 | 用途与输入来源 | 数据分级与同步边界 |
| --- | --- | --- |
| `inbox/YYYY/` | `/capture/`「快速思考模式」或私有库 Issue 表单一键直存的日常闪念、未脱敏复盘与原始长文草稿 | **L3 私密原稿，永久留存在私有库，永不同步至公开库** |
| `staged/`（含 `knowledge/`、`projects/`、`journal/YYYY/`、`errors/`） | 在 `/capture/`「结构化沉淀模式」或人工整理后勾选已脱敏、通过前端 `V-010` 实时隐私预检的待同步草稿 | **L2 已脱敏结构化草稿**，可经 `promote-to-public.yml` 向公开库发起草稿 PR |
| `synced/YYYY-MM-DD/` | 已成功向公开库发起同步 PR 的历史 `staged/` 草稿归档 | 留在私有库备查，避免重复提单 |

### 7.2 两枚最小权限 Fine-Grained Token 配置方法

双库架构遵循最小权限隔离原则，分别使用两枚**单仓库作用域**的 GitHub Fine-Grained Personal Access Token（生成入口：GitHub `Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token`）：

1. **① 浏览器本地令牌（用于 `/capture/` 在线工作台写私有库）**
   - **Repository access（仓库范围）**：选择 `Only select repositories` → **仅勾选私有库 `cvcingcvc-code/personal-knowledge-vault`**（切勿勾选公开库 `personal-knowledge-os`）。
   - **Repository permissions（仓库权限）**：
     - `Contents`：**Read and write**（必选，用于向私有库 `inbox/` 或 `staged/` 写入 Markdown 文件）；
     - `Actions`：**Read and write**（可选，用于在 `/capture/` 网页端一键点击触发私有库 `promote-to-public.yml` 同步工作流）。
   - **保存与通信方式**：在本人手机或电脑浏览器打开 `/capture/`，将令牌填入「连接设置」。该令牌**仅保存在当前设备浏览器的 `localStorage` 中**（支持随时一键清除），所有请求均由浏览器通过 HTTPS 直连 `https://api.github.com`，不经过任何第三方中转服务。

2. **② 私有库 Actions Secret `PUBLIC_OS_PAT`（用于跨仓向公开库创建草稿 PR）**
   - **Repository access（仓库范围）**：新建第二枚独立令牌，选择 `Only select repositories` → **仅勾选公开库 `cvcingcvc-code/personal-knowledge-os`**。
   - **Repository permissions（仓库权限）**：
     - `Contents`：**Read and write**（用于推送 `feat/a2-sync-<timestamp>` 同步分支）；
     - `Pull requests`：**Read and write**（用于向公开库 `main` 自动创建待审 PR）。
   - **保存位置**：进入私有仓库 `cvcingcvc-code/personal-knowledge-vault` 的 `Settings → Secrets and variables → Actions → New repository secret`，名称填写 `PUBLIC_OS_PAT`，Secret 粘贴该令牌。

### 7.3 手机免配置备用方案（GitHub Issue 表单自动归档至 `inbox/`）

在不方便配置浏览器本地令牌的移动设备上（例如已登录官方 GitHub App 的手机）：
1. 直接进入私有仓库 `https://github.com/cvcingcvc-code/personal-knowledge-vault/issues/new/choose`，选择快速思考表单（对应 `.github/ISSUE_TEMPLATE/thought.yml`）填写并提交；
2. 私有仓库工作流 `.github/workflows/archive-issue-thought.yml` 会自动将该 Issue 内容归档为 `inbox/YYYY/` 下的 Markdown 原稿并自动关闭 Issue，全程数据不出私有仓库，也不会触发向公开库的同步。

### 7.4 受控同步闭环与安全红线

当私有库 `staged/` 下存在待同步的脱敏草稿时，可在 `/capture/` 页面点击触发或在私有库 Actions 手动运行 `.github/workflows/promote-to-public.yml`：

```text
/capture/ 在线工作台（或私有库 Issue 表单）
  ├─ 快速思考 / 未脱敏记录 ──► 私有库 inbox/YYYY/（L3 原稿永久私密保存，永不同步公开库）
  └─ 结构化脱敏草稿（前端 V-010 实时预检通过）──► 私有库 staged/<type>/
        │
        ▼ （触发私有库 promote-to-public.yml）
  1. 运行 scripts/promote-staged.mjs：二次执行 V-010 敏感规则预检（命中即中止同步）
  2. 归一化安全字段：强制置 published: false（复盘强制 review_status: draft），剥离私密字段并转换 vault_ref
  3. 在公开库检出副本运行 npm ci && npm run validate && npm test 预验证
  4. 向公开库 personal-knowledge-os 推送分支 feat/a2-sync-* 并创建待审 PR，原稿移入私有库 synced/
        │
        ▼
  公开库自动运行全量 CI（scope:check / validate / test / typecheck / build / 产物隐私扫描）
        │
        ▼
  仓库所有者本人审阅 PR、核实脱敏与事实后手动合并（如需上站再由本人置 published: true 并授权部署）
```

**不可逾越的安全红线（重申）**：
1. **网页端绝不直写公开库**：`/capture/` 只连接私有库 `personal-knowledge-vault`；`inbox/` 中的原始私密思考永不触碰公开库。
2. **同步 PR 强制默认未发布**：同步生成的公开库 PR 一律强制置为 `published: false`（`journal` 复盘条目同时强制置为 `review_status: draft`，清空 `approved_at` / `approved_by` / `published_by`），绝不自动公开上站。
3. **CI 门禁与人工终审不可绕过**：同步 PR 与普通开发分支同等接受公开库全套 CI 校验与隐私扫描拦截，且必须由仓库所有者本人审阅确认后方可合并入 `main`。
