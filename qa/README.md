# qa/ — A5 独立 QA 区域

> A5 只读业务代码，本目录为 QA 专属产出。脚本不经 `package.json`，直接 `node` 运行
> （见 CONTRACTS C-11）。

## 目录结构

```
qa/
├── checklist.md                 # 全量测试清单（M0..M5 + 路由 + R/P + 隐私）
├── test-plan.md                 # 正向 + 反向用例构造/期望/复现步骤
├── README.md                    # 本文件
├── scripts/
│   ├── link-check.mjs           # C-9 路由探测 + 站内链接爬取
│   └── privacy-scan.mjs         # 隐私三层扫描（工作树 / 历史 / 产物）
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

# 2. 链接检测（默认探测 12 条路由 + 爬取站内链接）
node qa/scripts/link-check.mjs --base http://localhost:4321/141/
#    M2 门禁用 --strict（要求 12/12 全 200）
node qa/scripts/link-check.mjs --base http://localhost:4321/141/ --strict

# 3. 隐私三层扫描（默认扫当前仓库；可指定 --repo / --dist / --history N）
node qa/scripts/privacy-scan.mjs
```

## 约定

- 脚本只读站点/仓库，不改任何业务代码。
- 未实现路由、未落地的校验器 → 一律标「未实现 / 待测试」，不虚构通过。
- 缺陷单统一放 `docs/qa/defects/DF-<NNN>.md`，格式见 `docs/qa/defects/TEMPLATE.md`。
- 隐私扫描的「白名单」会逐条透明上报（示例值 / 规则字面量），不静默吞掉。
