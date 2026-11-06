# ARCHITECTURE.md — 技术方案与架构

> 状态：v1.0（待批准冻结）
> 前置：`docs/AUDIT.md`（空仓库，无既有栈可继承，故本文件是唯一技术权威）

## 1. 架构原则

1. **内容即数据源**：Markdown + frontmatter 是唯一事实来源，站点是从内容编译出来的产物。任何数据不得只存在于构建脚本或前端代码里。
2. **无服务器**：纯静态产物，静态托管，零运行时依赖、零数据库、零密钥。这是"长期可维护"的主要来源。
3. **契约优先**：字段、路由、命令、数据产物先定死，再并行开发。校验器是契约的可执行形式。
4. **可降级**：内容能被人直接读写（纯文本），即使工具链全废，知识本身仍可读。
5. **写权限分区**：每个 Agent 拥有互斥目录，跨区改动必须走 RFC，避免并行覆盖。

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

## 3. 目录结构与写权限

```
141/
├─ AGENTS.md                    # 主 Agent 维护
├─ README.md                    # 主 Agent
├─ .gitattributes               # 主 Agent（统一 LF，避免 Windows CRLF 污染 frontmatter）
├─ package.json / lock          # 主 Agent 独占（依赖变更需申请）
├─ astro.config.mjs             # 主 Agent
├─ tsconfig.json                # 主 Agent
├─ content/                     # Agent 2 独占
│  ├─ profile/profile.md
│  ├─ knowledge/*.md
│  ├─ projects/*.md
│  ├─ journal/YYYY/*.md
│  └─ errors/*.md
├─ src/
│  ├─ content/schema.ts         # Agent 2（契约实现）
│  ├─ content.config.ts         # Agent 2（集合注册）
│  ├─ pages/**                  # Agent 3
│  ├─ layouts/**                # Agent 3
│  ├─ components/**             # Agent 3
│  ├─ styles/**                 # Agent 3
│  └─ lib/**                    # 见下表拆分
├─ scripts/
│  ├─ validate-content.mjs      # Agent 2
│  ├─ build-data.mjs            # Agent 4
│  └─ import/**                 # Agent 4
├─ templates/                   # Agent 4（复盘导入模板）
├─ .github/workflows/**         # Agent 4
├─ public/                      # Agent 3（静态资源）；public/data/** 由 Agent 4 生成
├─ docs/                        # 主 Agent（docs/qa/** 归 Agent 5）
│  ├─ AUDIT/PRODUCT/ARCHITECTURE/CONTRACTS/TASKS/ACCEPTANCE/TAXONOMY/BRANCHES.md
│  ├─ rfc/                      # 全员可提，主 Agent 裁决
│  └─ qa/                       # Agent 5 独占
└─ qa/                          # Agent 5 独占（清单、脚本、证据）
```

`src/lib/` 内部再切分，避免两人同改一文件：

| 文件 | 归属 | 职责 |
| --- | --- | --- |
| `src/lib/collections.ts` | Agent 2 | 集合查询封装（getAllKnowledge 等），页面只许通过它取数 |
| `src/lib/format.ts` | Agent 3 | 日期/文本格式化 |
| `src/lib/search.ts` | Agent 3 | Pagefind UI 初始化（含 base 处理） |
| `src/lib/graph.ts` | Agent 4 | 读取 `graph.json` 并转成组件需要的结构（可选，v0.1 仅统计） |

> 规则：文件不在上表 → 需新建时先报主 Agent 登记，避免两个 Agent 同时创建同名文件。

## 4. 数据流

```
人工/Agent 写入 content/*.md
        │
        ├─(PR 时) scripts/validate-content.mjs ── 失败 → CI 红灯，禁止合并
        │        ↑ 复用 src/content/schema.ts
        │
        └─(merge 到 main)  astro build
                 ├─ content collections 解析 + zod 校验（再兜一次底）
                 ├─ 页面渲染（仅 public + approved）
                 ├─ scripts/build-data.mjs → dist/data/content.json, graph.json
                 └─ postbuild: pagefind --site dist  → dist/pagefind/**
                          ↓
                 actions/upload-pages-artifact → deploy-pages
                          ↓
                 https://cvcingcvc-code.github.io/141/
```

**构建期过滤规则（唯一实现处，不得散落到组件里）**：
1. `visibility: private` → 不渲染、不进索引、不进 data.json。
2. `journal.review_status: draft` → 不渲染（dev 模式可显式开启预览）。
3. `content/sample-*` 或 `sample: true` → 渲染但必须带"示例"徽章；构建日志打印样本条数。
4. 关联 id 悬空 → 校验期报错；构建期降级为不渲染该链接并 warn（双保险）。

## 5. 与外部系统的边界

| 系统 | v0.1 状态 | 说明 |
| --- | --- | --- |
| GitHub（仓库/PR/Actions/Pages） | 已接通 | 唯一的写入与发布通道 |
| 本地文件系统 | 已接通 | 内容录入 |
| 笔记类第三方（Notion/飞书/微信/Flomo） | **未接通** | 任何相关页面/文档必须标注"未接通"，禁止假装同步 |
| 自动抓取学习记录 | **未接通** | 不做，且禁止编造 |
| 分析统计（访问量） | 未启用 | v0.2 候选 |

## 6. 失败模式与对策

| 失败模式 | 表现 | 对策 |
| --- | --- | --- |
| 契约漂移 | 两个 Agent 对同一字段理解不同 | schema.ts 为唯一实现；PR 模板强制勾选"未改契约" |
| 冲突合并 | 同文件两人改 | 目录写权限 + worktree 隔离 + 小 PR |
| 隐私泄漏 | 复盘含真实人名/邮箱上站 | 校验器正则拦截 + 灰度（先 private 后公开）+ QA 产物扫描 |
| 构建漂移 | 本地过 CI 挂 | `npm ci` + 锁版本 + Node 22 固定 |
| 子路径 404 | 部署后样式/链接全断 | 统一 `import.meta.env.BASE_URL`，禁硬编码 `/` |
| 验收失真 | 只看 CI 绿 | ACCEPTANCE 强制真实浏览器操作 + 截图/日志证据 |

## 7. 未来演进（不承诺，仅记录方向）

1. v0.2：RSS、暗色模式、标签云、graph 可视化。
2. v0.3：本地脚本把第三方笔记导出为 md → 走同一校验管线（先解决"未接通"）。
3. v0.4：Agent 辅助起草复盘（仍强制人工 approved 才发布）。
