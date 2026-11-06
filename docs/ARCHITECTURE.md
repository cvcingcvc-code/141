# ARCHITECTURE.md — 技术方案与架构

> 状态：v1.0 / rc2（2026-11-06 按 PR #1 审查意见修订）
> 已确认决策：D2 技术栈批准（Astro 5 + Pagefind + Node 22）；D3 公开仓库只存可公开内容；D4 代码 MIT、原创内容保留版权
> 前置：`docs/AUDIT.md`（空仓库，无既有栈可继承，故本文件是唯一技术权威）

## 1. 架构原则

1. **内容即数据源**：Markdown + frontmatter 是唯一事实来源，站点是从内容编译出来的产物。任何数据不得只存在于构建脚本或前端代码里。
2. **无服务器**：纯静态产物，静态托管，零运行时依赖、零数据库、零密钥。这是"长期可维护"的主要来源。
3. **契约优先**：字段、路由、命令、数据产物先定死，再并行开发。校验器是契约的可执行形式。
4. **可降级**：内容能被人直接读写（纯文本），即使工具链全废，知识本身仍可读。
5. **写权限分区**：每个 Agent 拥有互斥目录，跨区改动必须走 RFC，避免并行覆盖。权限的**唯一权威表**在 `AGENTS.md §3`，本文件不复制该表（复制即产生第二个真相源）。
6. **仓库是公开的（P0-1）**：本仓库为 public，git 历史不可撤回。系统只负责"发布过滤"，**不提供任何保密能力**。不得公开的原文必须留在仓库外的私密库，仓库内只留指针（`vault_ref`）。详见 `CONTRACTS.md §C-18` 与 §6 数据边界。

## 2. 技术选型与理由

### 2.1 选定

| 层 | 选择 | 版本基线 |
| --- | --- | --- |
| 静态站点框架 | **Astro 5**（content collections + glob loader） | astro ^5 |
| 内容校验 | **Zod**（Astro 内置依赖，不额外引入） | 随 astro |
| 全文搜索 | **Pagefind**（构建后索引静态 HTML） | pagefind ^1 |
| 样式 | 原生 CSS + CSS 变量（无 UI 框架） | — |
| 运行时 | 无（仅构建期 Node） | Node 22 |
| 托管 | GitHub Pages + Actions | — |
| 包管理 | npm（`package-lock.json` 入库） | npm 10 |

### 2.2 为什么不是别的

| 备选 | 否决理由 |
| --- | --- |
| Vite + React SPA | 搜索/内容页需要客户端路由与手工索引，代码量与长期维护成本明显更高；个人知识库以内容为主，MVP 不需要 SPA 交互复杂度 |
| Next.js | 需要 Node 运行时或复杂静态导出，为了静态站引入过多框架约定 |
| Eleventy | 轻，但 schema 校验要自己拼，五类内容 × 十余字段的校验成本高；Astro 的 zod schema 直接复用为运行期与构建期同一份契约 |
| 数据库（SQLite/Supabase） | 违反"无服务器"，且公开仓库的静态站不需要；未来若要动态能力再 RFC |
| Algolia / 云搜索 | 需要账号与密钥，静态站可用 Pagefind 完全离线替代 |

**关键收益**：`src/content/schema.ts` 一份 zod 定义，同时被 Astro 构建（不合法则构建失败）和 `scripts/validate-content.mjs`（PR 门禁，可给出人类可读的逐字段错误）使用 —— 这就是"统一接口契约"落到代码上的唯一实现点。

### 2.3 已知取舍

- Pagefind 索引在 `postbuild` 生成，因此**搜索只能验证构建产物**，不能只跑 dev server 验收（写进 ACCEPTANCE）。
- Astro content layer 不校验"关联 id 是否存在"（zod 只能校验形状），该项由 `validate` 脚本以自定义规则实现。
- GitHub Pages 子路径部署（`/141/`），所有内部链接必须走 `base` 前缀，禁止硬编码根路径 `/`。

## 3. 目录结构

> **写权限不在此文件定义。**唯一权威表是 `AGENTS.md §3`；`CONTRACTS.md §C-17` 的 CI 门禁按该表实现。
> 此处只描述结构，避免出现"两份权限表互相矛盾"的问题（这正是 rc1 的 P1-3）。

```
141/
├─ AGENTS.md
├─ README.md
├─ .gitattributes
├─ package.json / package-lock.json
├─ astro.config.mjs
├─ tsconfig.json
├─ content/
│  ├─ profile/profile.md
│  ├─ knowledge/*.md
│  ├─ projects/*.md
│  ├─ journal/YYYY/YYYY-MM-DD.md
│  └─ errors/*.md
├─ src/
│  ├─ content/schema.ts          # 契约的唯一代码实现
│  ├─ content.config.ts          # 五个集合的 glob loader 注册
│  ├─ pages/**
│  ├─ layouts/**
│  ├─ components/**
│  ├─ styles/**
│  └─ lib/                       # collections.ts / format.ts / search.ts
├─ scripts/
│  ├─ validate-content.mjs       # V-001..V-021 / W-001..W-005
│  ├─ check-scope.mjs            # C-17 分支范围门禁（T4.1）
│  ├─ build-data.mjs             # content.json（v0.1 不产出 graph.json）
│  └─ import/**
├─ templates/                    # 复盘/错误 录入模板
├─ .github/workflows/            # ci.yml / deploy.yml
├─ public/                       # 静态资源；public/data/** 为构建产物落点
├─ docs/                         # 产品/架构/契约/任务/验收 + qa/ + rfc/ + incidents/
└─ qa/                           # 清单、脚本、证据（A5 独占）
```

`src/lib/` 必须按下表拆分，四人不同改一文件（归属以 `AGENTS.md §3` 为准）：

| 文件 | 职责 |
| --- | --- |
| `src/lib/collections.ts` | 集合查询封装（`getAllKnowledge` 等）+ **发布会话过滤**；页面只许通过它取数 |
| `src/lib/format.ts` | 日期/文本格式化 |
| `src/lib/search.ts` | Pagefind UI 初始化（含 base 路径处理） |

> 新建 `src/lib/` 下文件前先向 A1 登记，避免两个 Agent 同时创建同名文件。

## 4. 数据流

```
人工/Agent 写入 content/*.md（已脱敏，L1/L2）
        │
        ├─(PR 时) scripts/check-scope.mjs ── 越界改动 → CI 红灯
        ├─(PR 时) scripts/validate-content.mjs ── 失败 → CI 红灯，禁止合并
        │        ↑ 复用 src/content/schema.ts
        │
        └─(merge 到 main)  astro build
                 ├─ content collections 解析 + zod 校验（再兜一次底）
                 ├─ 页面渲染（仅 published:true 且 journal.status=approved）
                 ├─ scripts/build-data.mjs → dist/data/content.json
                 └─ postbuild: pagefind --site dist  → dist/pagefind/**
                          ↓
                 actions/upload-pages-artifact → deploy-pages
                          ↓
                 https://cvcingcvc-code.github.io/141/
```

**构建期过滤规则（唯一实现处，不得散落到组件里）**：
1. `published: false` → 不渲染、不进索引、不进 `content.json`。
2. `journal.review_status: draft` → 不渲染（dev 模式可显式开启预览，但 dev 产物不得部署）。
3. `sample: true` → 渲染但必须带「示例」徽章；构建日志打印样本条数。
4. 关联 id 悬空 → 校验期报错；构建期降级为不渲染该链接并 warn（双保险）。
5. **以上过滤只控制"是否展示"，不控制"是否保密"**：被过滤的文件仍在公开仓库里（P0-1）。

## 5. 与外部系统的边界

| 系统 | v0.1 状态 | 说明 |
| --- | --- | --- |
| GitHub（仓库/PR/Actions/Pages） | 已接通 | 唯一的写入与发布通道 |
| 本地文件系统 | 已接通 | 内容录入 |
| 笔记类第三方（Notion/飞书/微信/Flomo） | **未接通** | 任何相关页面/文档必须标注"未接通"，禁止假装同步 |
| 自动抓取学习记录 | **未接通** | 不做，且禁止编造 |
| 分析统计（访问量） | 未启用 | v0.2 候选 |
| 仓库外私密库 `F:\141-vault\` | 人工维护，**未接入任何自动流程** | 只接受 `vault_ref` 指针引用；工具链不读取它 |

## 6. 数据边界与私密资料（**P0-1**）

| 级别 | 例子 | 存放 | 进 git | 上站 |
| --- | --- | --- | --- | --- |
| L1 可公开 | 技术知识、项目说明、脱敏复盘、普通错误经验 | `content/**` | ✅ | ✅ |
| L2 暂不发布 | 已脱敏但未定稿/暂缓 | `content/**` + `published: false` | ✅ | ❌ |
| L3 禁止入库 | 私密复盘原文、他人隐私、健康与家庭细节、未脱敏截图、凭据、内部资料 | `F:\141-vault\`（仓库外） | ❌ | ❌ |

三条必须说清的事实：
1. `published: false` 是**发布开关**，不是保密机制。GitHub 公开仓库的任何提交都可被索引、fork、缓存。
2. 删除文件不能撤回历史。因此 L3 内容一律不提交，而不是"提交后再删"。
3. 私密库在仓库外，**没有自动备份**（v0.1）。备份与加密由用户自己负责，工具链不假装提供了这层保障。

细节（分级定义、`vault_ref` 格式、事故流程、三道扫描）见 `CONTRACTS.md §C-18`。

### 许可证（D4）

- **代码**：MIT，`LICENSE` 文件在 T1.2 与工具链一起落地（本轮不加文件，避免超出"仅文档修订"的范围）。
- **原创知识内容**：默认保留版权（© 作者，All rights reserved），**不自动套用 CC 等开放许可**。若某条内容要开放，单独在条目中声明。
- 第三方引用（书摘、文章要旨）遵守原许可，`sources` 里必须能追到出处；不整段搬运他人全文。

## 7. 失败模式与对策

| 失败模式 | 表现 | 对策 |
| --- | --- | --- |
| 契约漂移 | 两个 Agent 对同一字段理解不同 | schema.ts 为唯一实现；PR 模板强制勾选"未改契约"；`scope:check` 拦越界文件 |
| 冲突合并 | 同文件两人改 | 写权限单表（AGENTS §3）+ worktree 隔离 + 小 PR |
| 隐私泄漏 | 复盘含真实人名/邮箱，或 L3 原文被提交 | 三层防线：入库前人工分级 → `V-010` 全文件拦截 → 工作树/历史/产物三道扫描；泄漏按 C-18 事故流程处理（含凭据轮换） |
| 权限失效 | 文字规则被 Agent 忽略 | `scope:check` 在 CI 强制执行；仅"改得对不对"仍靠人工审核 |
| 构建漂移 | 本地过 CI 挂 | `npm ci` + 锁版本 + Node 22 固定 |
| 子路径 404 | 部署后样式/链接全断 | 统一 `import.meta.env.BASE_URL`，禁硬编码 `/` |
| 验收失真 | 只看 CI 绿 | ACCEPTANCE 强制真实浏览器操作 + 截图/日志证据 |

## 8. 未来演进（不承诺，仅记录方向）

v0.1 只做必需链路：输入 → 校验 → 展示 → 搜索 → 审核 → 部署。以下均为 v0.2 及以后，**本轮不得实现**：

1. v0.2：标签页/领域页聚合、`graph.json` 与图谱可视化、RSS、暗色模式、列表分页、`RelationList`/`Timeline` 组件。
2. v0.3：本地脚本把第三方笔记导出为 md → 走同一校验管线（先解决"未接通"）。
3. v0.4：Agent 辅助起草复盘（仍强制人工 approved 才发布）。

判断标准（写在这里防止范围再次膨胀）：一个功能进入 v0.1，必须同时满足 —— 它能被"输入真实知识 → 校验 → 展示 → 搜索 → PR 审核 → 自动部署"这条链路直接需要，且删掉它会让该链路断掉。做不到就不进。
