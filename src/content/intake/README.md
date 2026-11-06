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
| `intake-form.md` | **可直接复制到仓库外填写的素材表单**（授权块 + 五类填写块 + 来源核对 + 标签/关联），闭环采集 |
| `status-t2.2.txt` | 本轮 T2.2 的实际核对结果与 DoD 差距快照（**状态**，不是清单；要问什么看 `pending-confirmation.md`） |
| `journal-template.md.template` | 另一会话的通用采集模板（内容其实是"授权块 + 五类字段"，不是仅复盘）。与 `intake-form.md` 功能重叠、文件名与内容不符，**待 A1 决定移除或改名**，我未删除 |

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

## 6. 当前状态

`BLOCKED-D1`：本轮未获得可公开个人素材的授权，`content/` 仍为 6 条 `sample: true` + `published: false`，
站点没有任何真实条目（Wave 1 `docs/TASKS.md §10` 已记录同一事实）。详见 `pending-confirmation.md`。

## 7. 与另一套采集资料的关系（待 A1 裁决，未删除）

同一 worktree 中出现过第二个 A2 会话的产物，已由该会话自行提交到本分支（commit `c551134`，两条文件）：
`journal-template.md.template`、`status-t2.2.txt`（已归并到本目录，`content/` 下不再放非条目文件）。
我没有删除它们（归属未确认前不动别人的产出），差异如下：

| 维度 | 唯一入口：`src/content/intake/`（本目录） | 已取消：`content/_INTAKE-*` 不再存在（重复会话写入风险已消除） |
| --- | --- | --- |
| 位置 | `src/content/` 下，**不在 `content/` 内** | `content/` 根目录 |
| 防误解析 | 位置天然隔离：content collections 的 loader base 只指向五个子目录，`content/**` 扫描只认 `.md` | 靠扩展名规避（`.txt` / `.md.template`）；一旦有人改名成 `.md` 立即触发 `V-012` |
| 结构 | 分工：字段清单 / 来源规则 / 待确认清单 / 填写表单 | 合并式：一份模板 + 一份状态报告 |
| 字段深度 | 45 个字段逐条列出约束与对应 `V-*`/`W-*` 编号 | 类型级字段串 + 关键硬约束摘要 |
| 自动化守卫 | 7 个测试（清单↔schema 对齐、编号白名单、`BLOCKED-D1` 齐全、发布红线、PII、`content/` 根目录无可解析 `.md`、本目录在 `content/` 之外） | 无测试 |
| 与 A4 `templates/**` 的边界 | 已声明（A4 做可填空录入文件，本目录做采集与核对） | 未声明 |
| 结论 | **唯一入口**：本目录 | 已取消：`content/` 下不再放非条目文件 |

**当前状态（2026-11-06 19:21，commit `eaea05e`）**：A1 已把另一会话的两份文件归并进本目录（`content/_INTAKE-*` 不再存在），
"两套采集资料"在**位置上**已收敛为一套，`content/` 根目录不再有非条目文件。我没有删除任何他人产物，
只做了三件不改变归属的事：修掉 §7 里过期的结论、修正 `journal-template.md.template` 的用途描述、补两条守卫测试。

**仍需 A1 裁决的残留**：`journal-template.md.template` 与 `intake-form.md` 功能重叠，且文件名（journal）与其内容（通用采集模板）不符。
建议二选一：① 删除前者（内容已被 `intake-form.md` 覆盖）；② 由 A1 改名后保留。
在此之前它**不会**被解析成内容条目：扩展名不以 `.md` 结尾、位置在 `content/` 之外——两点都有测试守着。
