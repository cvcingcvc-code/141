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

> **一句话区分**：`src/content/intake/*`（含本文件及 `journal-template.md.template`）为 A2 面向用户的素材采集核对表，不直接入库；`templates/journal-template.md` 为 A4 的正式入库骨架模板。

- **A4**：可填空的"录入文件"（新建一条 journal / error 的骨架文件），服务 T4.3 的导入流程。
- **本目录**：字段级"采集与核对清单"，服务"用户给素材 → 我结构化 → 校验 → 用户确认"这一步，不产出可填空条目。
- 两者都不得复制 `schema.ts` 的规则为第二份真相源：本目录只写"该准备什么"，判定仍由 `scripts/validate-content.mjs` 执行。

## 3. 文件

| 文件 | 用途 |
| --- | --- |
| `field-checklist.md` | 五类内容的字段级采集清单（必填/可选/约束/对应校验编号），逐条对应 `CONTRACTS.md` C-3..C-8 |
| `source-verification.md` | 来源核对：`kind` 怎么选、`locator` 要写到什么粒度、`status`/`confidence` 怎么判 |
| `pending-confirmation.md` | **待用户确认清单**，当前状态 `RESOLVED-D1`（2026-11-18 仓库所有者已审阅批准首批五类共 8 条真实内容公开上站） |
| `intake-form.md` | **可直接复制到仓库外填写的素材表单**（授权块 + 五类填写块 + 来源核对 + 标签/关联），闭环采集 |
| `status-t2.2.txt` | 本轮 T2.2 的实际核对结果与 DoD 差距快照（**状态**，不是清单；要问什么看 `pending-confirmation.md`） |
| `journal-template.md.template` | 复盘/错误条目的录入模板（扩展名刻意不以 `.md` 结尾，避免被当成内容条目） |

## 4. 本轮红线（Wave 2 §11.6 + 用户本轮指令）

1. 不编造经历、成绩、日期、他人评价；用户没说的，写成"待补充"，不写成内容。
2. 不从历史聊天里搬取隐私内容；需要原文时只走仓库外私密库 + `vault_ref` 指针。
3. **不把 `published` 改为 `true`，不填 `published_by`，不把 `review_status` 改为 `approved`** —— 这三件事只能由用户确认后，由用户或 A1 执行。
4. 不为了"让页面有东西看"制造示例经历：空内容就显示空态，这是正确状态，不是缺陷。

## 5. 使用流程（拿到授权素材后）

```
用户复制 intake-form.md 到 F:\141-vault\intake\ 填写（或在对话里按同样结构给）
  → 我按 field-checklist.md 结构化（id 生成、文件名、tags 取自 TAXONOMY）
  → 我按 source-verification.md 核对来源（不够 verified 就标 seed + low）
  → npm run validate（必须 0 errors）
  → 提 PR，`published` 保持 false，`published_by` 不填
  → 用户确认条目内容与公开范围
  → 用户/A1 在合并时决定是否置 published: true 并填 published_by: user
```

证据链与 `docs/ACCEPTANCE.md` §2 一致：命令输出、PR 链接、用户确认原话，三者缺一不算完成。

### 5.1 三种"存在状态"（最容易混淆的一处）

| 状态 | 存放位置 | 谁可见 | 判据 | 谁能推进 |
| --- | --- | --- | --- | --- |
| ① **私人原稿** | `F:\141-vault\intake\`（仓库外，不进 git） | 只有本人 | 仓库里没有任何痕迹；可含 L3 细节 | 用户 |
| ② **可公开但未发布的 Markdown** | `content/**`，`published: false`（或省略）、`sample: false` | **公开仓库的所有人**（已入库＝已公开，不是保密） | `npm run validate` 0 errors 且 `isVisibleEntry === false` | A2 写入（需用户授权入库） |
| ③ **已批准发布** | `content/**`，`published: true` + `published_at` + `published_by: user`（journal 另需 `review_status: approved`） | 站点 / 搜索 / `content.json` | `isVisibleEntry === true`；构建产物里能查到 | **只有用户或 A1** |

一句话：② 是"写进仓库但不上站"，不是"藏起来"；① 才是真正的私密。把 ① 当成 ② 处理，等于公开。

## 6. 当前状态（2026-11-18）

- `content/` 共 13 条：真实条目 8 条（`profile`、`KB-ENG-003`..`KB-ENG-006`、`PJ-PKOS`、`ER-20261114-01`、`DJ-2026-11-18`，全部 `sample: false` 且已获仓库所有者明确批准公开上站）+ 契约回归示例 5 条（`sample: true`，全部保持未发布）。
- 已发布可见条目 **8 条**（knowledge 4 / projects 1 / journal 1 / errors 1 / profile 1），`dist/data/content.json` 与静态详情路由全部就绪，5 条示例条目 0 泄漏。
- `npm run validate` 为 `0 errors, 0 warnings`（示例占比 5/13 = 38.5% ≤ 50%，`W-002` 告警已自然消除）。
- 后续新增个人素材仍严格遵循 §4 红线与 §5 流程（默认 `published: false` / `draft`，经用户审阅确认后再写入人工审批字段）。

## 7. 采集资料的收敛状态（2026-11-06 已收敛）

`content/_INTAKE-*` 已在 `eaea05e` 归并进本目录，仓库里只有这一套采集资料，`content/` 下不再放非条目文件。
我没有删除任何他人产物，只记录事实。

仍待 A1 裁决的残留：`journal-template.md.template` 与 `intake-form.md` 功能重叠，且文件名（journal）与内容（通用采集模板）不符。
建议删除或改名。它不会被当成内容条目：扩展名不以 `.md` 结尾，且位于 `content/` 之外（两条都有测试守着）。
