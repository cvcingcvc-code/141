# AGENTS.md — 协作规范（所有 Agent 的第一入口）

> 任何 Agent 接到任务，**先读本文件**，再读 `docs/CONTRACTS.md`，然后只读与自己任务相关的代码。
> 不要全仓扫描，不要凭印象假设仓库里有什么。本仓库的真实状态以 `git log` 和文件系统为准。

## 0. 项目身份

个人知识 OS：`profile / knowledge / projects / journal / errors` 五类 Markdown 内容 → 校验 → 静态站点 → GitHub Pages 全文搜索。

- 仓库：`https://github.com/cvcingcvc-code/141`
- 站点：`https://cvcingcvc-code.github.io/141/`
- 本地主仓库：`F:\141`（仅集成）；开发副本：`F:\141-wt\{a2,a3,a4,a5}`
- 技术栈：Astro 5 + zod + Pagefind + 原生 CSS + GitHub Actions（见 `docs/ARCHITECTURE.md`）

## 1. 不可违反的硬规则

1. **不直推 `main`**。所有改动经 PR；`main` 有保护规则（禁 force push、禁删除、需 PR）。
2. **不 force push**，不在脏工作树上做破坏性 git 操作（`reset --hard` / `clean -fd` / `stash` / `checkout --` / `restore .`）。
3. **不改别人区域的文件**。先看 §3 的写权限表（**唯一权威**）；需要跨区 → 停手并说明原因，由 A1 协调或提 RFC。CI 的 `scope:check` 会拦，但它是兜底，不是许可。
4. **不改契约**（`docs/CONTRACTS.md`、`src/content/schema.ts`、路由、数据产物形状）除非有 RFC 且 A1 批准。文档、schema、校验器必须同一 PR 内一致。
5. **不扩大范围**。任务只做 `docs/TASKS.md` 里写的事。发现顺手要改的东西 → 记下来，单独提，不夹带。v0.1 的"不做清单"（C-9）优先于任何"顺手加一下"。
6. **不编造内容**。不写用户没说过的经历、成绩、日期、他人评价。缺失就留空并标注"待补充"。
7. **仓库是公开的（P0-1）**。本仓库 public，git 历史不可撤回。**不得提交任何私密原文、他人隐私、健康/家庭细节、凭据、未脱敏截图**，无论 `published` 是否为 true。这类内容放仓库外 `F:\141-vault\`，仓库里只留 `vault_ref` 指针。`published: false` 是发布开关，不是保密开关。
8. **不擅自公开、不自行批准**。`draft` / `published: false` 不进站点；`agent-drafted` 内容不得自行把 `review_status` 改为 `approved`；`approved_by` 只能写 `user`。
9. **不以测试通过代替验收**。交付必须附真实操作证据（见 `docs/ACCEPTANCE.md`）。
10. **不修改 `package.json` / `package-lock.json`**（仅 A1）。需要依赖 → 提请求。
11. **不删既有稳定代码来"简化"**。最小 diff。
12. **不自行合并**。PR 的合并由用户确认；Agent 不合并自己未经确认的 PR。

## 2. 标准工作流

```
读 AGENTS.md → 读 CONTRACTS 相关条款 → 读 TASKS 中自己的任务
   → 建分支（在自己 worktree）
   → 最小实现
   → npm run scope:check && npm run validate && npm run build（必须自己先跑）
   → 自测（真实打开页面/真实跑脚本，不是"看起来对"）
   → commit（conventional，scope 正确）
   → push → 开 PR（模板必填项齐全）
   → 等 CI 绿 + A1 审 + 用户确认合并
   → 合并后删除分支
```

修复缺陷的顺序是**先复现、再定位根因、再最小修复**。没有复现证据就开始改代码 = 违规。

## 3. 写权限表（唯一权威，其他文档只引用不复述）

| 路径 | 归属 | 说明 |
| --- | --- | --- |
| `content/**` | A2 | 五类内容唯一入口 |
| `src/content/schema.ts`、`src/content.config.ts`、`src/lib/collections.ts`、`scripts/validate-content.mjs`、**`docs/TAXONOMY.md`** | A2 | 契约实现 + 分类词表（标签归属 A2，避免"改标签还得求 A1"） |
| `src/pages/**`、`src/layouts/**`、`src/components/**`、`src/styles/**`、`src/lib/format.ts`、`src/lib/search.ts`、`public/**`（除 `public/data/**`） | A3 | 站点与静态资源 |
| `.github/**`、`scripts/build-data.mjs`、`scripts/check-scope.mjs`、`scripts/import/**`、`templates/**`、`public/data/**`、**`docs/IMPORT.md`** | A4 | 自动化、部署、导入流程文档 |
| `qa/**`、`docs/qa/**` | A5 | 只读业务代码 |
| `package.json`、`package-lock.json`、`astro.config.mjs`、`tsconfig.json`、`.gitattributes`、`.gitignore`、`README.md`、`AGENTS.md`、`docs/AUDIT.md`、`docs/PRODUCT.md`、`docs/ARCHITECTURE.md`、`docs/CONTRACTS.md`、`docs/TASKS.md`、`docs/ACCEPTANCE.md`、`docs/BRANCHES.md`、`docs/incidents/**` | A1 | 单点所有权；共享决策文档只能 A1 改 |
| `docs/rfc/**` | 所有人 | **只能新增**文件，不能改他人 RFC 的结论 |

补充规则：
- 上表是 CI `scripts/check-scope.mjs`（T4.1）的唯一数据来源；改表必须同时改脚本常量，否则视为契约撕裂。
- 新增顶层文件/目录前先向 A1 登记。
- 归属冲突时以本表为准；A2 改 `docs/TAXONOMY.md` 与 A4 写 `docs/IMPORT.md` 是本表明确授权的跨目录写入，不需要 RFC。

## 4. 提交规范

```
type(scope): subject

body（可选，说清为什么）
```

- `type`：`feat` `fix` `docs` `chore` `refactor` `test` `ci` `content`
- `scope`：`content` `site` `ci` `docs` `qa` `contract`
- 示例：`feat(content): add zod schema for five content types`
- 一个 commit 一件事；不提交 `node_modules`、`dist`、`.astro`。

## 5. PR 必填模板

```markdown
## 目标
（对应 TASKS 中的任务 ID）

## 变更文件与原因
- path/to/file — 为什么改

## 契约影响
- [ ] 未触碰契约
- [ ] 触碰契约（附 RFC 链接）

## 运行结果
- `npm run scope:check` →（末行输出，或写"未落地，T4.1"）
- `npm run validate` →（末行输出）
- `npm run build` →（末行输出）

## 隐私自检（P0-1）
- [ ] 本次新增内容均为 L1/L2（已脱敏），无 L3 原文
- [ ] `grep` 过一遍邮箱/手机号/密钥，无命中
- [ ] 涉及审批状态的改动已由用户确认

## 验收证据
（截图路径 / URL / 命令输出，禁止只写"已验证"）

## 未解决问题 / 风险

## 下一轮唯一目标
```

## 6. 跨模块协作

- 依赖别人未合并的产出 → 不要自行复制一份实现，等或协商 mock 的存放位置（mock 必须落在自己区域内并标注 `TODO(h2)`）。
- 发现别人模块的缺陷 → 写缺陷单/提 Issue，不直接改（除非是 P0 且 A1 授权）。
- 合并顺序由 `docs/BRANCHES.md` §2 决定，A1 合并后通知下一顺位 rebase。

## 7. 命令

```bash
npm ci                 # 唯一安装方式
npm run scope:check    # 分支改动范围门禁（C-17），T4.1 后可用
npm run validate       # 内容校验（PR 门禁）
npm run build          # 构建 + content.json + 搜索索引
npm run preview        # 验收搜索必须用它，不能用 dev
node qa/scripts/*.mjs  # QA 脚本，不经 package.json
```

## 8. 提交前自检清单

- [ ] 只改了自己区域的文件（对照 AGENTS §3）
- [ ] `npm run scope:check` 通过（T4.1 后为强制项）
- [ ] `npm run validate` 通过（末行 `0 errors`）
- [ ] `npm run build` 通过
- [ ] 真的打开页面看过（不是只看构建日志）
- [ ] 没有 L3 私密内容入库；没有 `draft` / `published:false` 内容进产物
- [ ] 没有密钥 / 邮箱 / 手机号（含 frontmatter 与正文）
- [ ] 没有自行把 `review_status` 改成 `approved`
- [ ] 没有新增未登记依赖
- [ ] commit 信息符合 §4
- [ ] PR 模板填全

## 9. 常见坑（本机实测，避免重复踩）

| 坑 | 现象 | 做法 |
| --- | --- | --- |
| GitHub Pages 子路径 | 部署后样式/链接全 404 | 一律 `import.meta.env.BASE_URL`，禁硬编码 `/` |
| Windows CRLF | frontmatter 解析失败、diff 全红 | 仓库已加 `.gitattributes`，不要覆盖 |
| 全局 git 身份是占位值 | 提交署名为 `Your Name` | 仓库级已设为 `cvcingcvc-code`，新 worktree 会自动继承 |
| `npm run dev` 测搜索 | 搜不到任何东西 | Pagefind 只索引构建产物，必须 `build` + `preview` |
| 公开仓库 | 任何提交立即公开可查，删了也在历史里 | 私密内容一律不入库，放 `F:\141-vault\`，仓库只留 `vault_ref` |
| 多 worktree 共用 node_modules | 依赖版本错乱 | 每个 worktree 各自 `npm ci` |
| 目录含中文/空格 | Windows 下部分脚本路径出错 | 仓库路径固定 `F:\141`、`F:\141-wt\<角色>`，不要改成中文目录 |

## 10. 文档地图

| 想知道 | 看 |
| --- | --- |
| 仓库为什么是现在这样 | `docs/AUDIT.md` |
| 做什么、不做什么 | `docs/PRODUCT.md` |
| 技术与目录结构 | `docs/ARCHITECTURE.md` |
| 我到底能改哪些文件 | **本文件 §3**（唯一权威） |
| 字段、路由、命令、产物、校验编号 | `docs/CONTRACTS.md` |
| 我该做哪个任务 | `docs/TASKS.md` |
| 怎么算做完 | `docs/ACCEPTANCE.md` |
| 标签怎么起 | `docs/TAXONOMY.md` |
| 分支/worktree/保护规则 | `docs/BRANCHES.md` |
| 改契约怎么走 | `docs/rfc/README.md` |
| 什么内容绝对不能进仓库 | `docs/CONTRACTS.md §C-18` + 本文件 §1 第 7 条 |
