# qa/fixtures/ — 反向/正向用例夹具

> 本目录存放 A5 复现 R-01..R-12 / P-01..P-04 用的**夹具文件**。
> 约束：夹具**绝不**写入本仓库 `content/**`，也不进 main；复现时复制到
> **临时克隆**的 `content/` 对应目录，跑完即弃（见 `qa/test-plan.md` §1）。

## 使用方式

```bash
git clone https://github.com/cvcingcvc-code/141.git /tmp/141-qa-fixture
cp qa/fixtures/<case>/<文件> /tmp/141-qa-fixture/content/<对应目录>/
cd /tmp/141-qa-fixture && npm ci && npm run validate
```

## 目录约定

```
qa/fixtures/
├── r-01-verified-empty-sources/
├── r-02-related-missing-id/
├── ...
└── p-01-agent-drafted-draft/
```

每个用例一个子目录，内含一个最小 `*.md` 夹具与 `README.md`（说明构造与期望编号）。

> 当前基线：`validate` 尚未落地（T2.1 未合并），夹具待 schema 冻结后补齐。
> 在此之前本目录仅保留约定说明，不预生成可能随 schema 变化而失效的夹具。
