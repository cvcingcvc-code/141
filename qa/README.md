# qa/ — A5 独立 QA 区域

> A5 只读业务代码，本目录为 QA 专属产出。脚本不经 `package.json`，直接 `node` 运行
> （见 CONTRACTS C-11）。

## 目录结构

```
qa/
├── checklist.md                 # 全量测试清单（M0..M5 + 路由 + R/P + 隐私）
├── test-plan.md                 # 正向 + 反向用例构造/期望/复现步骤
├── acceptance-plan-wave2.md     # Wave 2 验收计划（固定/动态路由、隔离/未授权/真实内容五类区分）
├── README.md                    # 本文件
├── scripts/
│   ├── link-check.mjs           # 路由探测（固定/动态/无效 ID）+ 站内链接爬取
│   ├── privacy-scan.mjs         # 隐私三层扫描（工作树 / 历史 / 产物，值级 SHA-256 白名单）
│   ├── layout-check.mjs         # 多视口布局实测（360/768/1280，CDP 读 scrollWidth）
│   ├── data-isolation.mjs       # 已发布 / 未发布 / 草稿数据隔离核查
│   ├── content-consistency.mjs  # content.json ↔ Pagefind ↔ HTML 产物一致性
│   └── search-probe.mjs         # 真实关键词命中与跳转（前置探测）
├── baseline/                    # 基线报告（BASELINE-<日期>.md）
│   └── BASELINE-<日期>.md
├── fixtures/                    # 反向/正向用例夹具（复制到临时克隆使用，不进 content/）
└── evidence/                    # 截图等验收证据（qa/evidence/<里程碑>/<编号>.png）
```

> 脚本每次运行会在 `qa/baseline/` 生成 `*-latest.json` 机器可读输出；该文件为
> 运行时产物，不入库（隐私扫描 JSON 含命中值，避免在仓库里二次落盘）。

## 运行

```bash
# 1. 构建 + 启动 preview（搜索与链接验收必须用 preview，不能 dev）
npm ci && npm run build && npm run preview

# 2. 路由探测（固定 8 条 + 动态有效/无效 ID + 站内链接爬取）
node qa/scripts/link-check.mjs --base http://localhost:4321/141/
#    M2 门禁用 --strict
node qa/scripts/link-check.mjs --base http://localhost:4321/141/ --strict

# 3. 隐私三层扫描（默认扫当前仓库；可指定 --repo / --dist / --history N）
node qa/scripts/privacy-scan.mjs

# 4. 多视口布局实测（360/768/1280，需系统 Chrome/Edge）
node qa/scripts/layout-check.mjs --base http://localhost:4321/141/

# 5. 数据隔离 + 产物一致性 + 关键词命中（T3.2/T4.2 落地后可用，否则 BLOCKED）
node qa/scripts/data-isolation.mjs
node qa/scripts/content-consistency.mjs
node qa/scripts/search-probe.mjs --keywords "git,rebase,schema,复盘,错误"
```

## 约定

- 脚本只读站点/仓库，不改任何业务代码。
- 未实现路由、未落地的校验器 → 一律标「BLOCKED / 待测试」，不虚构通过。
- 「因未实现而 404 / 无泄漏」不视作「正确处理已通过」，必须如实标注。
- 缺陷单统一放 `docs/qa/defects/DF-<NNN>.md`，格式见 `docs/qa/defects/TEMPLATE.md`。
- 隐私扫描白名单仅允许**值级**（SHA-256），逐条透明上报，见 `docs/incidents/INC-001.md`。

