# 验收报告 — Personal Knowledge OS v0.1 线上端到端最终独立验收（2026-11-18）

> 角色：A5 独立 QA（只读业务代码，未修改任何 `src/`、`content/`、`scripts/`、`.github/` 或根配置文件）。
> 部署基线：`main@664a01d428f3bdaa838a66e3730c2dd27454e4d2`（GitHub Actions `deploy` run [`44263098409`](https://github.com/cvcingcvc-code/personal-knowledge-os/actions/runs/44263098409)，状态 `completed / success`）。
> 线上公开站点 URL：`https://cvcingcvc-code.github.io/personal-knowledge-os/`
> 契约版本：`docs/CONTRACTS.md` v1.0.1（`RFC-001` 仓库更名与子路径 `/personal-knowledge-os` 已生效）。
> 验收分支：`qa/a5-v0.1-acceptance`（工作树 `F:\141-wt\a5`）。
> 判定分类：**PASS** / **FAIL** / **BLOCKED** / **NOT TESTED**。
>
> **独立声明**：本报告全部输出、HTTP 状态码、DOM 测量数据与截图均由 A5 直接针对线上真实 GitHub Pages URL 及本地 `main@664a01d` 树独立执行采集，不采信口头结论或仅构建日志。

---

## 1. v0.1 最终验收结果总表

| # | 验收维度 | 判定 | 核心证据与退出码 |
| --- | --- | --- | --- |
| 1 | 本地全量门禁链（`scope:check / validate / test / typecheck / build`） | **PASS** | 全部 `exit 0`；`validate` `0 errors, 0 warnings`；构建 15 页（§6.1） |
| 2 | 线上 C-9 固定路由（8 条）+ 已发布动态详情页（7 条）+ 全站链接爬取 | **PASS** | `link-check.mjs --strict` `exit 0`；固定 8/8 `200`、动态 7/7 `200`、166 条站内引用 `0` 断链（§2） |
| 3 | 未发布 `sample` 条目（5 条）与无效 ID（4 条）线上隔离 | **PASS** | 线上访问全部返回 HTTP `404` + 自定义 404 页；`content.json` 与 `data-isolation.mjs` `0` 泄漏（§2 / §3） |
| 4 | 线上 Pagefind 全文搜索（真实词命中跳转 + 样本隔离 + 无结果空态） | **PASS** | `search-probe.mjs` 6/6 关键词命中且目标页 `200`（`exit 0`）；未发布专属词 `0` 命中；无结果空态明确（§3） |
| 5 | 线上 360 / 768 / 1280 三档视口可读性与真实截图取证 | **PASS** | `layout-check.mjs` 8 页 × 3 档 = 24 组全部无横向滚动（`exit 0`）；7 张线上 PNG 存档于 `qa/evidence/v0.1/`（§4） |
| 6 | v0.1 用户故事（US-1 / US-2 / US-3 / US-5 / US-6 / US-7 / US-8） | **PASS** | 7 项 v0.1 故事全部实测走通（US-4 按契约延后至 v0.2）（§5） |
| 7 | 里程碑门禁 M0–M5 与分支保护专项（P0-2） | **PASS** | M0–M4 及 M5 QA 项全部达成；`main` 保护规则经 `gh api` 在线核实（§6） |
| 8 | 隐私三层扫描（L1 工作树 / L2 Git 历史 / L3 构建产物） | **PASS** | `privacy-scan.mjs` `exit 0`（L1=0 / L2=0 / L3=0 真实命中）；`F:\141-vault\` 位于仓库外（§7） |
| 9 | 历史缺陷单与事故记录闭环（P0 / P1 清零） | **PASS** | `DF-001`、Wave 3A P1（`ER-20261114-01`）、`INC-001`、`INC-002` 全部闭环，P0=0，P1=0（§8） |

> **QA 总结论**：**9 大验收维度全部 PASS，0 FAIL，0 BLOCKED，0 NOT TESTED（P0/P1 缺陷数为 0）**。A5 独立 QA 予以签收通过，移交仓库所有者完成 M5 最终人工体验确认（打开站点、搜一次、点三条链接）。

---

## 2. 线上全量路由探测、未发布隔离与全站测链

本轮升级 `qa/scripts/link-check.mjs`，使其自动请求线上 `${base}data/content.json` 动态校验全部已发布详情页，同时显式探测未发布 `sample: true` 条目路由返回 HTTP 404（验证未批准内容隔离），并从首页递归爬取全站站内链接。

### 2.1 执行命令与真实输出

命令：

```bash
node qa/scripts/link-check.mjs --base https://cvcingcvc-code.github.io/personal-knowledge-os/ --strict
```

真实完整输出（退出码 **`0`**）：

```text
== A5 link-check（路由契约 + 动态详情 + 未发布隔离 + 站内爬虫）==
base: https://cvcingcvc-code.github.io/personal-knowledge-os/ (strict)

--- 固定路由（8 条）---
  [可访问] 200  (首页)  — 首页
  [可访问] 200  about/  — 个人介绍（profile）
  [可访问] 200  knowledge/  — 知识列表
  [可访问] 200  projects/  — 项目列表
  [可访问] 200  journal/  — 复盘列表（仅 approved）
  [可访问] 200  errors/  — 错误经验列表
  [可访问] 200  search/  — 全文搜索（Pagefind）
  [可访问] 200  404.html  — 未找到页（固定文件名）

--- 动态路由：已发布详情页（来自 data/content.json，共 7 条）---
  [可访问] 200  knowledge/kb-eng-003/  (KB-ENG-003, knowledge)
  [可访问] 200  knowledge/kb-eng-004/  (KB-ENG-004, knowledge)
  [可访问] 200  knowledge/kb-eng-005/  (KB-ENG-005, knowledge)
  [可访问] 200  knowledge/kb-eng-006/  (KB-ENG-006, knowledge)
  [可访问] 200  projects/pj-pkos/  (PJ-PKOS, project)
  [可访问] 200  journal/2026-11-18/  (DJ-2026-11-18, journal)
  [可访问] 200  errors/er-20261114-01/  (ER-20261114-01, error)

--- 未发布 sample 路由隔离（4 条，期望 404 隔离）---
  [已隔离(正确 404)] 404  knowledge/kb-eng-001/  (KB-ENG-001)
  [已隔离(正确 404)] 404  projects/pj-141/  (PJ-141)
  [已隔离(正确 404)] 404  journal/2026-11-06/  (DJ-2026-11-06)
  [已隔离(正确 404)] 404  errors/er-20261106-01/  (ER-20261106-01)

--- 动态路由：无效 ID（4 条，期望 404 + 特征文本）---
  [正确 404] 404  knowledge/qa-not-exist-999/
  [正确 404] 404  projects/pj-not-exist/
  [正确 404] 404  journal/2099-01-01/
  [正确 404] 404  errors/er-99999999-99/

--- 站内链接爬取 ---
  已访问 15 个站内资源/页面，发现站内链接引用 166 条
  断链：0

结论： 固定路由 8/8；已发布动态详情 7/7；未发布 sample 隔离 4/4；无效 ID 正确 404 4/4；断链 0 条
EXIT_LINK_CHECK=0
```

- 补充单点核验：仓库内第 5 条未发布 `sample: true` 条目 `https://cvcingcvc-code.github.io/personal-knowledge-os/knowledge/kb-eng-002/` 独立请求同样返回 HTTP `404`（含自定义 404 页文案「没有找到这个页面」）。
- C-9 十二类路由覆盖：8 条固定路由 + 4 类动态路由（`knowledge/[id]` ×4、`projects/[id]` ×1、`journal/[date]` ×1、`errors/[id]` ×1）在线上全部实测 `200`。

---

## 3. 线上数据产物（C-10）与 Pagefind 全文搜索实测

### 3.1 线上 `data/content.json` 与构建产物一致性

直接请求 `https://cvcingcvc-code.github.io/personal-knowledge-os/data/content.json` 返回 HTTP `200`：
- 顶层键集合：`["schemaVersion", "generatedAt", "base", "counts", "items"]`（与 `CONTRACTS.md` C-10 完全一致）。
- `"base"`：`"/personal-knowledge-os/"`。
- `"counts"`：`{"knowledge": 4, "projects": 1, "journal": 1, "errors": 1, "profile": 1}`（合计 8 条真实已批准内容，全部 `sample: false`）。
- 5 条未发布 `sample` ID（`KB-ENG-001`、`KB-ENG-002`、`PJ-141`、`DJ-2026-11-06`、`ER-20261106-01`）在线上 `content.json` 中检索命中数均为 **`0`**。
- 本地对同一基线 `dist/` 运行 `node qa/scripts/data-isolation.mjs`（`exit 0`）与 `node qa/scripts/content-consistency.mjs`（`exit 0`），确认 `content.json`、HTML 页面与 Pagefind 索引三处一致且 `0` 泄漏。

### 3.2 线上 5+1 个真实关键词命中与跳转验证

通过系统 Chrome Headless CDP 驱动线上真实搜索页 `https://cvcingcvc-code.github.io/personal-knowledge-os/search/`：

```bash
node qa/scripts/search-probe.mjs --port 9236 \
  --base https://cvcingcvc-code.github.io/personal-knowledge-os/ \
  --keywords "协作,check-scope,低熵,Pagefind,writeFileSync,isVisibleEntry" \
  --expect "*,*,*,*,/errors/er-20261114-01/,/projects/pj-pkos/"
```

真实输出（退出码 **`0`**）：

```text
== A5 search-probe（真实关键词命中与跳转）==
base: https://cvcingcvc-code.github.io/personal-knowledge-os/ | chrome: C:/Program Files/Google/Chrome/Application/chrome.exe

  [PASS] 「协作」 命中 8 条 → 首个 /personal-knowledge-os/knowledge/（可达 true，期望 *）
  [PASS] 「check-scope」 命中 3 条 → 首个 /personal-knowledge-os/knowledge/kb-eng-004/（可达 true，期望 *）
  [PASS] 「低熵」 命中 5 条 → 首个 /personal-knowledge-os/knowledge/kb-eng-005/（可达 true，期望 *）
  [PASS] 「Pagefind」 命中 7 条 → 首个 /personal-knowledge-os/knowledge/kb-eng-006/（可达 true，期望 *）
  [PASS] 「writeFileSync」 命中 1 条 → 首个 /personal-knowledge-os/errors/er-20261114-01/（可达 true，期望 /errors/er-20261114-01/）
  [PASS] 「isVisibleEntry」 命中 1 条 → 首个 /personal-knowledge-os/projects/pj-pkos/（可达 true，期望 /projects/pj-pkos/）

结论： 6/6 关键词命中并跳转正确
EXIT_SEARCH_PROBE=0
```

> 说明：`isVisibleEntry` 仅出现在 `PJ-PKOS` 正文第 46 行（未出现在 frontmatter `title` / `summary` / `tags`），专门用于验证 **US-3「搜索只出现在正文里的词并准确进入对应详情页」**。

### 3.3 未发布样本搜索隔离与无结果空态验证

在线上 `https://cvcingcvc-code.github.io/personal-knowledge-os/search/?q=<query>` 实测未发布 `sample: true` 条目专属特征串与不存在词：

| 查询词 | 用例类型 | 线上结果条数 | 线上 `[data-search-status]` 实测文案 / 核查结果 | 判定 |
| --- | --- | --- | --- | --- |
| `win-crlf-frontmatter` | 未发布 `ER-20261106-01` 专属标识 | **0 条** | `没有找到与「win-crlf-frontmatter」相关的内容，换个关键词试试。` | **PASS** |
| `Schema 校验只能证明形状合规` | 未发布 `KB-ENG-002` 专属标题 | **0 条** | `没有找到与「Schema 校验只能证明形状合规」相关的内容，换个关键词试试。` | **PASS** |
| `141 个人知识 OS（示例条目）` | 未发布 `PJ-141` 专属标题 | **0 条** | `没有找到与「141 个人知识 OS（示例条目）」相关的内容，换个关键词试试。` | **PASS** |
| `2026-11-06 复盘（示例草稿）` | 未发布 `DJ-2026-11-06` 专属标题 | **0 条** | `没有找到与「2026-11-06 复盘（示例草稿）」相关的内容，换个关键词试试。` | **PASS** |
| `Git rebase 与 merge 的取舍` | 未发布 `KB-ENG-001` 专属标题 | **0 条** | `没有找到与「Git rebase 与 merge 的取舍」相关的内容，换个关键词试试。` | **PASS** |
| `CRLF` | 短词边界核查 | 1 条（仅已发布 `KB-ENG-004` 前缀弱匹配 `C-17`，**不含** `ER-20261106-01`） | 返回结果列表中 `ER-20261106-01` 为 **0 命中** | **PASS** |
| `zyxwvuts998877` | 全站不存在词（M3 空状态门禁） | **0 条** | `没有找到与「zyxwvuts998877」相关的内容，换个关键词试试。` | **PASS** |

> 补充说明：若混合输入含高频常见汉字的假词（如包含「的」「测试」），Pagefind `zh-cn` 分词器会按分词子项召回含「测试」的已发布文章，属静态分词索引正常召回机制；使用不含已发布词根的字符串（`zyxwvuts998877`）验证零结果空状态提示完全符合契约设计。

---

## 4. 线上 360 / 768 / 1280 多视口可读性与截图证据

### 4.1 `layout-check.mjs` 线上多视口实测

命令：

```bash
node qa/scripts/layout-check.mjs --port 9237 \
  --base https://cvcingcvc-code.github.io/personal-knowledge-os/ \
  --urls "/,/about/,/knowledge/kb-eng-003/,/knowledge/kb-eng-004/,/projects/pj-pkos/,/journal/2026-11-18/,/errors/er-20261114-01/,/404.html" \
  --views 360,768,1280
```

真实输出（退出码 **`0`**）：

```text
== A5 layout-check（多视口）==
chrome: C:/Program Files/Google/Chrome/Application/chrome.exe | base: https://cvcingcvc-code.github.io/personal-knowledge-os/ | views: 360/768/1280

  [无横向滚动 ✅] 360px  /  scrollWidth=345 clientWidth=345  title="Personal Knowledge OS"
  [无横向滚动 ✅] 768px  /  scrollWidth=753 clientWidth=753  title="Personal Knowledge OS"
  [无横向滚动 ✅] 1280px  /  scrollWidth=1265 clientWidth=1265  title="Personal Knowledge OS"
  [无横向滚动 ✅] 360px  /about/  scrollWidth=345 clientWidth=345  title="关于 — Personal Knowledge OS"
  [无横向滚动 ✅] 768px  /about/  scrollWidth=753 clientWidth=753  title="关于 — Personal Knowledge OS"
  [无横向滚动 ✅] 1280px  /about/  scrollWidth=1265 clientWidth=1265  title="关于 — Personal Knowledge OS"
  [无横向滚动 ✅] 360px  /knowledge/kb-eng-003/  scrollWidth=345 clientWidth=345  title="我用 5 个 AI Agent 开发个人知识库，终于明白了什么叫真正的协作 — Personal Knowledge OS"
  [无横向滚动 ✅] 768px  /knowledge/kb-eng-003/  scrollWidth=753 clientWidth=753  title="我用 5 个 AI Agent 开发个人知识库，终于明白了什么叫真正的协作 — Personal Knowledge OS"
  [无横向滚动 ✅] 1280px  /knowledge/kb-eng-003/  scrollWidth=1265 clientWidth=1265  title="我用 5 个 AI Agent 开发个人知识库，终于明白了什么叫真正的协作 — Personal Knowledge OS"
  [无横向滚动 ✅] 360px  /knowledge/kb-eng-004/  scrollWidth=345 clientWidth=345  title="多 Agent 并行协作中以分支写权限门禁替代口头约定 — Personal Knowledge OS"
  [无横向滚动 ✅] 768px  /knowledge/kb-eng-004/  scrollWidth=753 clientWidth=753  title="多 Agent 并行协作中以分支写权限门禁替代口头约定 — Personal Knowledge OS"
  [无横向滚动 ✅] 1280px  /knowledge/kb-eng-004/  scrollWidth=1265 clientWidth=1265  title="多 Agent 并行协作中以分支写权限门禁替代口头约定 — Personal Knowledge OS"
  [无横向滚动 ✅] 360px  /projects/pj-pkos/  scrollWidth=345 clientWidth=345  title="Personal Knowledge OS（个人知识操作系统） — Personal Knowledge OS"
  [无横向滚动 ✅] 768px  /projects/pj-pkos/  scrollWidth=753 clientWidth=753  title="Personal Knowledge OS（个人知识操作系统） — Personal Knowledge OS"
  [无横向滚动 ✅] 1280px  /projects/pj-pkos/  scrollWidth=1265 clientWidth=1265  title="Personal Knowledge OS（个人知识操作系统） — Personal Knowledge OS"
  [无横向滚动 ✅] 360px  /journal/2026-11-18/  scrollWidth=345 clientWidth=345  title="2026-11-18 复盘 — Personal Knowledge OS"
  [无横向滚动 ✅] 768px  /journal/2026-11-18/  scrollWidth=753 clientWidth=753  title="2026-11-18 复盘 — Personal Knowledge OS"
  [无横向滚动 ✅] 1280px  /journal/2026-11-18/  scrollWidth=1265 clientWidth=1265  title="2026-11-18 复盘 — Personal Knowledge OS"
  [无横向滚动 ✅] 360px  /errors/er-20261114-01/  scrollWidth=345 clientWidth=345  title="复盘导入脚本先写盘后校验且整段拼接原稿导致隐私落地风险 — Personal Knowledge OS"
  [无横向滚动 ✅] 768px  /errors/er-20261114-01/  scrollWidth=753 clientWidth=753  title="复盘导入脚本先写盘后校验且整段拼接原稿导致隐私落地风险 — Personal Knowledge OS"
  [无横向滚动 ✅] 1280px  /errors/er-20261114-01/  scrollWidth=1265 clientWidth=1265  title="复盘导入脚本先写盘后校验且整段拼接原稿导致隐私落地风险 — Personal Knowledge OS"
  [无横向滚动 ✅] 360px  /404.html  scrollWidth=360 clientWidth=360  title="404 — Personal Knowledge OS"
  [无横向滚动 ✅] 768px  /404.html  scrollWidth=768 clientWidth=768  title="404 — Personal Knowledge OS"
  [无横向滚动 ✅] 1280px  /404.html  scrollWidth=1280 clientWidth=1280  title="404 — Personal Knowledge OS"

结论： 全部视口无横向滚动
EXIT_LAYOUT_CHECK=0
```

- **全站 15 页扩展巡检观察（P2 非阻断改进建议，交 A3 在 v0.2 评估）**：
  对全站全部 15 个已发布页面 × 3 档视口（45 组）做穷举扫描时，14 个页面在 360/768/1280 下均 `scrollWidth == clientWidth`；仅 `/knowledge/kb-eng-006/` 在 `360px` 一档测得 `document.documentElement.scrollWidth = 460 > clientWidth = 345`（768px 与 1280px 无溢出）。定位根因：`<div class="prose">` 已设置 `overflow-wrap: anywhere` 正文无溢出，且 `body` 设有 `overflow-x: hidden`，但详情页底部 `<section class="sources">` 中的 `.sources__ref` 未加 `overflow-wrap: anywhere`，遇到不含短横线断点的长 URL（`https://docs.astro.build/en/reference/configuration-reference/#base`）时单行盒宽 `407px`。因正文阅读无损且 `body` 已裁剪横向溢出，定级为 **P2 轻微样式改进项（非 P0/P1，不阻断 v0.1）**，建议 A3 后续为 `.sources` 补充 `overflow-wrap: anywhere`。

### 4.2 线上真实截图取证清单（含 URL 与 UTC 时间戳水印）

全部截图均采自线上 `https://cvcingcvc-code.github.io/personal-knowledge-os/` 并经人工逐张核验视觉渲染（CSS 样式表、徽章配色、移动端两行三列 44px 触控导航、搜索高亮均正常生效）：

| 截图路径 | 视口 | 对应线上 URL 与验证点 |
| --- | --- | --- |
| `qa/evidence/v0.1/home-360.png` | 360×800 | `.../personal-knowledge-os/` —— 移动端两行三列导航（≥44px）、首屏个人定位与统计、分类入口（US-1 / M2） |
| `qa/evidence/v0.1/home-768.png` | 768×900 | `.../personal-knowledge-os/` —— 平板视口两列卡片网格、最近复盘与最近知识区块 |
| `qa/evidence/v0.1/home-1280.png` | 1280×900 | `.../personal-knowledge-os/` —— 桌面视口完整首屏、导航栏与最近动态卡片 |
| `qa/evidence/v0.1/detail-knowledge-360.png` | 360×900 | `.../personal-knowledge-os/knowledge/kb-eng-004/` —— 360px 长文排版、`已核实` / `可信度高` 徽章、更新时间（US-2 / US-8） |
| `qa/evidence/v0.1/detail-project.png` | 1280×900 | `.../personal-knowledge-os/projects/pj-pkos/` —— 项目角色、技术栈、外链及底部纯文本关联列表（US-5） |
| `qa/evidence/v0.1/search-online.png` | 1280×900 | `.../personal-knowledge-os/search/?q=Pagefind` —— 线上真实 Pagefind 命中 7 条结果及 `<mark>` 摘要高亮（M3 / US-3） |
| `qa/evidence/v0.1/404-360.png` | 360×800 | `.../personal-knowledge-os/404.html` —— 自定义 404 页（「没有找到这个页面」+ 返回首页链接，M2） |

---

## 5. 用户故事端到端核验（`ACCEPTANCE.md §6`）

> 按契约规定，**US-4（按标签浏览）已延后至 v0.2**；且线上 DOM 实测 `hasTagOrDomainPageLink = false`，确认页面未违规偷跑标签页或领域页入口（符合 M2 门禁）。

| ID | 用户故事 | 线上 / 本地实测证据 | 判定 |
| --- | --- | --- | --- |
| **US-1** | 手机浏览器打开首页：首屏能读到“我是谁/在做什么”；有最近复盘与知识入口 | 360px 打开线上首页（`qa/evidence/v0.1/home-360.png`）：首屏展示标题「cvcingcvc-code 的个人知识 OS」及定位说明、统计「共 4 条知识 · 1 篇复盘 · 1 个项目 · 1 条错误经验 · 更新于 2026-11-18」，下方含「最近复盘」（指向 `/journal/2026-11-18/`）与「最近知识」入口卡片，点击均返回 `200`。 | **PASS** |
| **US-2** | 打开任一知识详情：能看到来源、`verified/seed` 徽章、更新时间 | 线上 `/knowledge/kb-eng-004/`（`detail-knowledge-360.png`）渲染 `已核实`（`verified`）、`可信度高`、`更新于 2026-11-18` 及底部 `<section class="sources">` 3 条带链接/定位符/查阅日期的来源；`/knowledge/kb-eng-003/` 渲染 `草苗`（`seed`）与 `可信度低` 徽章及 4 条来源；空来源展示「未标注来源」已由 `SourceList.astro` 与 `P-03` 单测锁定。 | **PASS** |
| **US-3** | 搜索页输入一个只出现在正文里的词：命中该条，点击进入正确页面 | 线上搜索仅存在于 `PJ-PKOS` 正文（不在 frontmatter）的标识符 `isVisibleEntry`，命中 1 条 `/personal-knowledge-os/projects/pj-pkos/`，跳转目标 HTTP `200`（§3.2）。 | **PASS** |
| **US-5** | 打开项目详情：关联知识/错误以纯文本标题链接列表出现，可点且不 404 | 线上 `/projects/pj-pkos/`（`detail-project.png`）底部 `<section class="related">` 以 `<ul><li><a>` 纯文本标题链接渲染 4 条关联知识（`kb-eng-003`..`006`）与 1 条关联错误（`er-20261114-01`），无图谱组件，5 条链接实测全部 `200`。 | **PASS** |
| **US-6** | 按 `docs/IMPORT.md` 走一遍录入：生成 draft → 校验通过但不上站 → approve 后上站 | 导入脚本 `scripts/import/new-journal.mjs` 默认写入仓库外 `F:\141-vault\drafts\`，`--authorize` 写盘前执行内存 `V-010` + Schema 预检且强制 `published: false, review_status: draft`（Wave 3A 实测通过）；真实复盘 `content/journal/2026/2026-11-18.md` 经用户审批（`review_status: approved, approved_by: user, published: true, published_by: user`）后已在线上 `/journal/2026-11-18/` 正常展示。 | **PASS** |
| **US-7** | 让 Agent 改非自己区域文件：被 `scope:check` 拒绝，或走 RFC 流程 | `scripts/check-scope.mjs` 在 CI 强制执行分支前缀路径校验（PR #3 落地）；仓库更名跨区变更通过 `docs/rfc/RFC-001-repo-rename-base.md` 拆分为 PR #34（A1）、#35（A3）、#36（A2）、#37（A5）分域合规合入，全程 `scope:check` `0` 越界。 | **PASS** |
| **US-8** | 360px 视口通读长文：无横向滚动，正文可读，代码块横向滚动而非撑破布局 | 线上 360px 打开长文 `/knowledge/kb-eng-003/`（162 行 Markdown）、`/knowledge/kb-eng-004/`、`/errors/er-20261114-01/`，均测得 `scrollWidth = 345 == clientWidth`（0 横向滚动），正文字号 `1rem`、行高 `1.8`；`.prose pre { overflow-x: auto }` 在 Wave 2/3A `1596px` 超宽代码块探针实测内部横向滚动生效且不撑破视口。 | **PASS** |

---

## 6. 本地全量校验门禁与里程碑 M0–M5 / 分支保护复核

### 6.1 本地命令真实输出与退出码（基线 `main@664a01d`）

```text
npm run scope:check → scope:check 通过：0 越界                                       exit 0
npm run validate    → 0 errors, 0 warnings（真实内容占比 8/13，W-002 告警已自然消除）  exit 0
npm test            → 37 tests / 36 pass / 0 fail / 1 skipped                        exit 0
npm run typecheck   → astro sync && tsc --noEmit（Generated 1.25s）                  exit 0
npm run build       → 15 page(s) built；content.json 可见 8 条（sample 0）；Pagefind 15 页  exit 0
data-isolation.mjs  → 真实发布 8 条 / sample 5 条 / 泄漏 0                            exit 0
content-consistency → PASS：三处产物一致且字段符合 C-10                               exit 0
privacy-scan.mjs    → L1=0 / L2=0 / L3=0 真实命中                                    exit 0
```

### 6.2 里程碑门禁（M0–M5）与分支保护专项（`ACCEPTANCE.md §3 / §11`）

- **M0 规划冻结**：PR #1 已完成契约冻结、`AGENTS.md §3` 单一权威写权限表、12 条路由收敛及无外部审批人分支保护设计 —— **PASS**。
- **M1 内容契约落地**：PR #6 落地 `src/content/schema.ts` 与 `scripts/validate-content.mjs`；R-01..R-12 红灯用例与 P-01..P-04 正向用例在 `src/content/__tests__/*.test.mjs`（37 项单测）持续绿灯；当前 `validate` `0 errors, 0 warnings` —— **PASS**。
- **M2 站点骨架**：12 类路由在线上全部可访问且 `0` 断链；来源列表/徽章/404 页/360px 布局均在线上验证通过；无标签页或领域页入口 —— **PASS**。
- **M3 数据与搜索**：线上 `data/content.json` 与 C-10 完全一致；`0` 条未发布/草稿泄漏；线上真实关键词命中跳转与空状态提示全部实测通过 —— **PASS**。
- **M4 自动化与保护**：
  - 通过 `gh api repos/cvcingcvc-code/personal-knowledge-os/branches/main/protection` 在线实测核实 `main` 分支保护规则：
    - `required_status_checks.contexts`: `["ci"]`（检查名与 `.github/workflows/ci.yml` 真实 job 名完全一致）
    - `required_approving_review_count`: `0`（无外部审批人死锁，单人维护者可独立走完 PR 闭环）
    - `enforce_admins`: `true`（管理员同样受 PR 与 `ci` 门禁约束，直推 `main` 被拒）
    - `allow_force_pushes`: `false`、`allow_deletions`: `false`
  - 线上公开站点 `https://cvcingcvc-code.github.io/personal-knowledge-os/`（deploy run [`44263098409`](https://github.com/cvcingcvc-code/personal-knowledge-os/actions/runs/44263098409)）返回 HTTP `200` 且样式正常；导入脚本默认产出仓库外 `draft` 草稿 —— **PASS**。
- **M5 最终验收**：US-1/2/3/5/6/7/8 全部走通、隐私三层扫描全部 `0` 真实命中、P0/P1 缺陷全部闭环 —— **QA 侧全部 PASS**（仅剩仓库所有者人工体验签字项）。

---

## 7. 隐私三层扫描与 P0-1 专项确认（`ACCEPTANCE.md §7`）

在本地完成 `npm run build`（生成完整 15 页 `dist/` 与 Pagefind 索引）后运行 `node qa/scripts/privacy-scan.mjs`（未修改任何扫描规则、阈值或白名单）：

| 扫描层 | 覆盖范围 | 实测真实命中 | 白名单透明上报数 | 结论 |
| --- | --- | --- | --- | --- |
| **L1 工作树** | 全部已跟踪文本文件（含未发布 `sample`） | **0** | 8（契约/QA 文档 `@example.com` 示例与历史已知测试占位符） | **PASS** |
| **L2 Git 历史** | 最近 50 提交 + 全部涉及 `content/` 的提交 | **0** | 10（`@example.com` 示例及 `INC-001` 已批准公开身份邮箱值级哈希） | **PASS** |
| **L3 构建产物** | `dist/**` 46 个文本文件 | **0** | 0 | **PASS** |

- `privacy-scan.mjs` 真实退出码：**`0`**（`结论：三层均无真实 PII/凭据命中`）。
- **三项附加显式确认**：
  - [x] 仓库内**没有任何** L3（私密原文、他人隐私、健康/家庭细节、密钥凭据）内容；已发布的 8 条真实内容均为公开技术架构、工程实践与项目复盘。
  - [x] 私密原稿目录 `F:\141-vault\` 位于 Git 工作树 `F:\141` / `F:\141-wt\*` 物理路径之外，不在版本控制内；仓库内所有已发布条目 `vault_ref: null`。
  - [x] 历史隐私事件均已在 `docs/incidents/` 完整建档并闭环：`INC-001`（公开身份邮箱值级 SHA-256 豁免，非凭据无需轮换）与 `INC-002`（QA 历史分支合成测试值不豁免、不改规则，PR #25 已按 squash 合入 `main@24eed1a` 移除 `main` 可达性，不宣称 GitHub 上的历史对象已消失）。

---

## 8. 历史缺陷与事故闭环核查及最终签收

| 编号 | 级别 | 现象摘要 | 当前状态与闭环证据 |
| --- | --- | --- | --- |
| `DF-001` / `INC-001` | P2 | `docs/AUDIT.md` 早期提交含仓库所有者公开身份邮箱 | **CLOSED** —— HEAD 已于 `0b4675c` 脱敏，历史值按用户授权建立 `INC-001` 值级 SHA-256 透明上报 |
| Wave 3A #5 / `ER-20261114-01` | P1 | `new-journal.mjs --authorize` 先写盘后校验且复制原稿正文 | **CLOSED** —— PR #32（`529fe47`）改为内存预检 + 仅输出结构化字段，复测通过并沉淀为公开错误经验条目 |
| `INC-002` | P3 | PR #25 早期分支提交含 3 项合成测试号码明文及报告退出码矛盾 | **CLOSED** —— 报告口径已修正（`fc9af00`），PR #25 按 `--squash` 合入 `main@24eed1a` 移除 `main` 可达性，`main` 上 `privacy-scan` 恢复 `exit 0` |

- **未关闭 P0 / P1 缺陷数**：**`0`**。
- **非阻断跟进项（v0.2 备忘）**：① `.prose table { display: block }` 窄屏退化为纵向堆叠（Wave 3A 观察）；② `.sources__ref` 补充 `overflow-wrap: anywhere` 以消除 `/knowledge/kb-eng-006/` 在 360px 下的来源长 URL 行盒超宽（本轮 P2 观察）。

### A5 独立 QA 最终签字

- **功能与隐私独立验收（A5）**：**PASS（SIGNED OFF，2026-11-18，基线 `main@664a01d` / deploy run `44263098409`）**
- **下一步**：提交本验收报告与线上取证资产 PR，待 CI 绿灯、A1 集成验收及仓库所有者打开 `https://cvcingcvc-code.github.io/personal-knowledge-os/` 完成最终体验确认后，Personal Knowledge OS **v0.1 正式交付完成**。
