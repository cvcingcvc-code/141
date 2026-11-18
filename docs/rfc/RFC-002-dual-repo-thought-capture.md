# RFC-002 双库隔离的在线思考捕获与受控同步方案（v0.2）

- 状态：proposed
- 提出人：A1（总控 / 架构，按仓库所有者需求立项）
- 日期：2026-11-18
- 目标契约版本：1.0.1 → 1.1.0（向后兼容新增可选工具路由 `/capture/` 与双库同步协议）
- 关联任务：v0.2 阶段首项特性（在线思考输入 → 私有库沉淀 → 脱敏同步公开站）

## 1. 动机

Personal Knowledge OS v0.1 已完成公开部署上线（`https://cvcingcvc-code.github.io/personal-knowledge-os/`），跑通了“受控 Markdown → 契约校验 → 静态站点与离线全文搜索 → 手动门控部署”闭环。

但在日常高频使用场景中，站主需要在电脑或手机浏览器打开一个**在线网址**即可随时随地记录灵光一现的思考、阅读心得或当日复盘，并让整理成熟的内容顺畅同步进知识库。当前 v0.1 仅支持在本地机器运行 `scripts/import/new-journal.mjs` 或手工编辑仓库文件，存在两个现实痛点：

1. **缺乏跨设备随手记录入口**：不在本机开发环境（`F:\141`）旁时，无法随时通过网页快速捕获思考。
2. **公开仓库不能直接承接原始思考流**：`personal-knowledge-os` 是 GitHub Public 仓库，Git 历史永久公开不可撤回。日常随手输出的原始思考往往夹杂未脱敏的个人情境、内部项目代号或临时判断（属 `C-18` 定义的 L3 私密数据）。若网页端直接向公开仓库写入文件，即使标记 `published: false`，也会造成不可逆的隐私暴露。

因此，v0.2 需要引入一套**零服务器运维成本、手机/桌面浏览器即开即用、原始思考 100% 物理隔离在私有仓库、仅脱敏条目经 PR 受控同步至公开知识库**的双库架构。

## 2. 提案

采用 **架构 A：双库物理隔离 + 纯静态在线捕获页（直连 GitHub REST API）+ 受控同步 PR**。

### 2.1 双仓库物理职责边界

| 仓库 | 可见性 | 核心职责 | 允许存放的数据级别 |
| --- | --- | --- | --- |
| `cvcingcvc-code/personal-knowledge-vault`（新建） | **Private（私有）** | 承接在线网页输入的**全部原始思考**（闪念、长文草稿、未脱敏复盘）与待同步脱敏草稿 | **L1 / L2 / L3（全量私密安全）** |
| `cvcingcvc-code/personal-knowledge-os`（现有） | **Public（公开）** | 仅存放已脱敏的结构化五类内容、编译公开站点与离线搜索索引 | **仅 L1 / L2（严禁 L3 入库）** |

私有仓库 `personal-knowledge-vault` 建议目录结构：
```text
personal-knowledge-vault/          # GitHub Private 仓库
├─ inbox/YYYY/YYYY-MM-DD-<ts>.md   # 在线页「快速思考」一键直存的原始记录（L3）
├─ staged/                         # 在线页或人工勾选「已脱敏待同步」的五类标准草稿（L2）
│  ├─ knowledge/
│  ├─ projects/
│  ├─ journal/YYYY/
│  └─ errors/
└─ .github/workflows/
   └─ promote-to-public.yml        # 受控同步 Action：校验脱敏后向公开库发起草稿 PR
```

### 2.2 在线思考输入网址（`/capture/` 纯静态工作台）

在公开站点新增第 13 条路由：`/capture/`（完整访问地址：`https://cvcingcvc-code.github.io/personal-knowledge-os/capture/`）：

1. **零后端、零密钥泄漏的客户端鉴权**：
   - 静态网页源码中**不包含任何凭据或私钥**；第三方访客打开 `/capture/` 仅能看到空白工具外壳，无法读取或写入任何数据。
   - 站主首次在本人手机/电脑浏览器打开 `/capture/` 时，配置一枚 GitHub **Fine-Grained Personal Access Token**（权限严格最小化：**仅限 `personal-knowledge-vault` 单个私有仓库的 `Contents: Read and write`**，不授予公开库直接写权限）。
   - 该令牌仅保存在站主本人设备的浏览器 `localStorage` 中（支持随时一键清除），请求仅通过 HTTPS 直接发往 `https://api.github.com`，不经过任何第三方中转服务器。
2. **双模式输入体验**：
   - **模式一：快速思考模式（默认，3 秒记录）**：仅需输入标题（可选，默认按时间戳生成）与正文思考，点击「存入私有库」，直接写入私有仓库 `inbox/YYYY/YYYY-MM-DD-<HHmmss>.md`。无繁琐必填项，不打断思考流。
   - **模式二：结构化沉淀模式（直通知识库）**：选择类型（`knowledge / journal / error / project`），按契约字段辅助填写，并可选择：**「仅存私有库」** 或 **「标记为已脱敏，放入 `staged/` 准备同步公开库」**。
3. **浏览器端实时隐私预检（前端 V-010 雷达）**：
   - 当勾选放入 `staged/` 准备同步公开库时，前端复用 `V-010` 同源敏感规则（邮箱、中国大陆手机号、身份证号、常见 API 密钥前缀与私钥头）实时检测输入文本；命中时高亮提示拦截，强制先脱敏或退回纯私密 `inbox/` 模式。
4. **免配置备用入口（GitHub 原生表单）**：
   - 私有仓库同步提供 `.github/ISSUE_TEMPLATE/thought.yml` Issue 表单。在已登录 GitHub App 的手机上，即使不配置浏览器令牌，也可点开私有库表单直接提交思考，由私有库 Action 自动归档为 `inbox/` Markdown 文件并关闭 Issue。

### 2.3 从私有库到公开知识库的受控同步闭环

```text
站主在 /capture/ 在线网址输入思考
        │
        ├─[日常随手写]──► 私有库 inbox/（Private，L3 原稿永久私密保存）
        │
        └─[整理脱敏后勾选同步]──► 私有库 staged/<type>/<file>.md
                                        │
                    （私有库 promote-to-public.yml 手动或定时扫描触发）
                                        ├─ 1. 剥离私密字段，原稿路径自动转为 vault_ref: vault:inbox/...
                                        ├─ 2. 强制覆写 published: false、review_status: draft（禁自动上站）
                                        ├─ 3. 执行 V-010 敏感模式预检（命中即中止同步，绝不推向公开库）
                                        ▼
                        向公开库 personal-knowledge-os 自动创建 PR（分支 feat/a2-sync-*）
                                        │
                                        ├─ 公开库 CI 自动跑 scope:check + validate + test + build + dist PII
                                        └─ 站主审阅 PR（按需置 published: true）→ Squash 合并 → 手动/受控部署上线
```

**关键安全不变量**：
- 在线网页永远**不直接向公开仓库直推代码**；
- 私有库未显式放入 `staged/` 的 `inbox/` 原稿**永远不会触碰公开库**；
- 同步至公开库的 PR 默认 `published: false`，依然完整受控于现有的 CI 门禁与站主最终合并审批权。

## 3. 影响面

| 受影响模块 | 具体变更（待本 RFC 批准后实施） | 负责角色 |
| --- | --- | --- |
| `docs/CONTRACTS.md` | 升版本 `1.0.1 → 1.1.0`；`C-9` 路由契约由 12 条扩充为 13 条（新增 `/capture/` 静态工具页，标注 `noindex` 且不纳入 Pagefind 正文索引以免干扰知识检索）；`C-18` 增补私有远端库 `personal-knowledge-vault` 作为 `vault_ref` 的云端对应源说明 | A1 |
| `src/content/schema.ts` | 五类内容字段与校验规则**零破坏性变更**；`STATIC_ROUTES` 常量同步登记 `/capture/` | A2 |
| `scripts/validate-content.mjs` | 无需新增错误码，自动继承 `STATIC_ROUTES` 更新 | A2 |
| `src/pages/capture.astro`、`src/lib/capture.ts` | 新增纯前端在线思考捕获工作台（含本地令牌管理、双模式编辑器、前端 V-010 隐私预检、GitHub Contents API 写入封装）及 `.sources__ref` 长链接折行 P2 样式微调 | A3（需先向 A1 登记 `src/lib/capture.ts` 归属 A3） |
| 私有库初始化资产与 `docs/IMPORT.md` | 提供私有库一键初始化脚本/模板（`inbox/`、`staged/`、`promote-to-public.yml`、Issue Form）并更新导入文档 | A4 |
| `qa/scripts/link-check.mjs`、`qa/checklist.md` | 固定路由检查由 8 条更新为 9 条（含 `/capture/`），新增前端 V-010 拦截与令牌零泄漏检查用例 | A5 |
| `content/**`、`dist/data/content.json` | 存量 13 条内容与 `content.json` 数据结构**完全不变** | — |

## 4. 迁移方案

本次为纯增量向后兼容演进（`1.0.1 → 1.1.0`），存量内容无需任何迁移：
1. **阶段 1（契约与权限登记，A1）**：本 RFC 获仓库所有者批准后，更新 `CONTRACTS.md` v1.1.0、`AGENTS.md §3`（登记 `src/lib/capture.ts` 归 A3），并由所有者授权创建 GitHub 私有仓库 `cvcingcvc-code/personal-knowledge-vault`。
2. **阶段 2（并行开发，A2 + A3 + A4）**：
   - A2 在 `STATIC_ROUTES` 登记 `/capture/`；
   - A3 实现 `/capture/` 响应式页面（360px 手机端优先适配，方便手机随时记录）与前端隐私预检；
   - A4 交付私有仓库同步工作流 `promote-to-public.yml` 与配置指南。
3. **阶段 3（独立 QA 与实机联调，A5 + 所有者）**：A5 验证网页源码/产物零凭据残留、360px 手机输入体验、私有库写入与跨仓同步 PR 门禁闭环。

## 5. 回滚方案

1. 若需回滚公开站在线输入页：直接 `git revert` `/capture/` 相关 PR 并重新部署，原有 12 条知识站路由与全部已发布内容不受任何影响。
2. 若需停用跨仓同步：在 GitHub 撤销对应的单仓 Fine-Grained Token 或禁用私有库 `promote-to-public.yml` Action 即可瞬时切断写入通道，已在私有库沉淀的思考 Markdown 原文完好保留。

## 6. 裁决（待仓库所有者确认）

- 结论：待定（proposed）
- 待所有者确认事项：
  1. 私有仓库名称是否定为 `cvcingcvc-code/personal-knowledge-vault`？
  2. 在线输入页路径是否采用站内子路由 `https://cvcingcvc-code.github.io/personal-knowledge-os/capture/`（顶部导航可选择放入口或仅本人书签访问）？
  3. 确认批准本 RFC 后，即按阶段 1 → 阶段 3 分派 A1–A5 落地实现。
- 裁决人：仓库所有者
- 日期：待填写
