# src/content/intake/ — 内容采集与核对资产（T2.2）

本目录**不是内容条目**，不会被 Astro 的 content collections 读取（loader 的 base 指向 `content/knowledge` 等），
也不会进入站点、搜索索引或 `content.json`。它存放的是"把用户提供的素材变成合规条目"这一步所需的清单。

## 1. 为什么放在这里，而不是 `templates/` 或 `docs/`

| 候选位置 | 归属（AGENTS §3 / CONTRACTS C-17） | 结论 |
| --- | --- | --- |
| `templates/**` | A4（T4.3 的录入模板：`journal-template.md` / `error-template.md`） | ❌ A2 无写权限，且会与 A4 的交付重叠 |
| `docs/**` | 除 `docs/TAXONOMY.md` / `docs/IMPORT.md` / `docs/qa/**` 外均为 A1 | ❌ A2 无写权限 |
| `src/content/**` | **A2** | ✅ 只用自有权重路径，且与它所描述的 schema 相邻，改动时不容易只改一边 |

如果 A1 认为应改放到 `templates/`（A4）或 `docs/`，请直接说，我按新归属把文件移过去，内容不变。

## 2. 与 A4 `templates/**` 的边界（避免两份模板打架）

- **A4**：可填空的"录入文件"（新建一条 journal / error 的骨架文件），服务 T4.3 的导入流程。
- **本目录**：字段级"采集与核对清单"，服务"用户给素材 → 我结构化 → 校验 → 用户确认"这一步，不产出可填空条目。
- 两者都不得复制 `schema.ts` 的规则为第二份真相源：本目录只写"该准备什么"，判定仍由 `scripts/validate-content.mjs` 执行。

## 3. 文件

| 文件 | 用途 |
| --- | --- |
| `field-checklist.md` | 五类内容的字段级采集清单（必填/可选/约束/对应校验编号），逐条对应 `CONTRACTS.md` C-3..C-8 |
| `source-verification.md` | 来源核对：`kind` 怎么选、`locator` 要写到什么粒度、`status`/`confidence` 怎么判 |
| `pending-confirmation.md` | **待用户确认清单**，当前状态 `BLOCKED-D1`（未获得可公开素材的授权） |

## 4. 本轮红线（Wave 2 §11.6 + 用户本轮指令）

1. 不编造经历、成绩、日期、他人评价；用户没说的，写成"待补充"，不写成内容。
2. 不从历史聊天里搬取隐私内容；需要原文时只走仓库外私密库 + `vault_ref` 指针。
3. **不把 `published` 改为 `true`，不填 `published_by`，不把 `review_status` 改为 `approved`** —— 这三件事只能由用户确认后，由用户或 A1 执行。
4. 不为了"让页面有东西看"制造示例经历：空内容就显示空态，这是正确状态，不是缺陷。

## 5. 使用流程（拿到授权素材后）

```
用户在 pending-confirmation.md 勾选/提供素材
  → 我按 field-checklist.md 结构化（id 生成、文件名、tags 取自 TAXONOMY）
  → 我按 source-verification.md 核对来源（不够 verified 就标 seed + low）
  → npm run validate（必须 0 errors）
  → 提 PR，`published` 保持 false，`published_by` 不填
  → 用户确认条目内容与公开范围
  → 用户/A1 在合并时决定是否置 published: true 并填 published_by: user
```

证据链与 `docs/ACCEPTANCE.md` §2 一致：命令输出、PR 链接、用户确认原话，三者缺一不算完成。

## 6. 当前状态

`BLOCKED-D1`：本轮未获得可公开个人素材的授权，`content/` 仍为 6 条 `sample: true` + `published: false`，
站点没有任何真实条目（Wave 1 `docs/TASKS.md §10` 已记录同一事实）。详见 `pending-confirmation.md`。
