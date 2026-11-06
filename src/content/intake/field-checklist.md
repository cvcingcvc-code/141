# 五类内容字段级采集清单（C-3..C-8）

用途：用户给素材时，按本表逐项确认"有没有、填什么、谁来填"。
**约束列里的编号一律来自 `docs/CONTRACTS.md` C-12**，本文件不新造规则；判定由 `npm run validate` 执行。

图例：`必填` = 缺就 `V-002`；`条件必填` = 满足条件时缺就报对应编号；`可选` = 可留空/省略。

## 1. 公共字段（C-3，五类都要）

| 字段 | 必填 | 类型 / 约束 | 采集时问用户什么 | 编号 |
| --- | --- | --- | --- | --- |
| `id` | 必填 | 按类型正则，见 §6 | 不需要用户管，我按规则生成 | V-004 |
| `type` | 必填 | `profile`/`knowledge`/`project`/`journal`/`error`，须与目录一致 | — | V-003 / V-012 |
| `title` | 必填 | 4..80 字符 | 这条讲什么？（一句话，不用标题党） | V-003 |
| `summary` | 必填 | 20..200 字符 | 它解决了什么问题？（不能是标题的复述） | V-013 |
| `created` | 必填 | `YYYY-MM-DD` | 这件事/这条知识是哪天开始的？（不确定就写用户给的范围） | V-007 |
| `updated` | 必填 | `YYYY-MM-DD`，不得早于 `created` | 最近一次修改是哪天？ | V-007 |
| `published` | 可选（默认 `false`） | boolean | **不询问、不修改**：Agent 一律不置 `true` | — |
| `published_at` | 条件必填 | `YYYY-MM-DD`，`published: true` 时必填 | 仅在用户批准发布时由用户/A1 填 | V-021 |
| `published_by` | 条件必填 | 人工标识，只允许 `user` | 仅在用户批准发布时由用户/A1 填 | V-021 / V-019 |
| `tags` | 可选（默认 `[]`） | 0..12 项，小写 kebab，须在 `docs/TAXONOMY.md` §3 | 这属于哪几个主题？（我按受控表给建议，用户拍板） | V-014 / W-001 |
| `sample` | 可选（默认 `false`） | boolean | 真实内容一律 `false`；示例才 `true` | — |
| `vault_ref` | 可选 | `vault:<仓库外相对路径>` | 有没有"不能进公开仓库"的原始记录？只留指针 | V-020 |

> `published` 的语义不是"保密开关"：仓库是公开的，写进来的字节即视为已公开（C-18）。

## 2. knowledge 增补（C-5）

| 字段 | 必填 | 采集要求 | 编号 |
| --- | --- | --- | --- |
| `domain` | 必填 | 九选一：`engineering`/`product`/`design`/`data`/`finance`/`language`/`health`/`life`/`meta`（按"这条知识被用在哪类工作里"判，见 TAXONOMY §1） | V-003 / V-004 |
| `status` | 必填 | `seed`（未验证）/`verified`（已核实）/`stale`（过时）/`archived`（归档） | V-003 |
| `confidence` | 必填 | `low`/`medium`/`high`；`high` 必须至少 1 个非 `agent` 来源 | V-003 / V-009 |
| `sources` | 必填（可为空数组） | 每项 `kind` + `ref`，建议带 `locator`/`accessed`；`status: verified` 时不得为空 | V-009 |
| `related` | 可选（默认 `[]`） | 只填**已存在**的 knowledge id；不存在就 `V-008` | V-008 / V-015 |

## 3. projects 增补（C-6）

| 字段 | 必填 | 采集要求 | 编号 |
| --- | --- | --- | --- |
| `status` | 必填 | `idea`/`active`/`paused`/`shipped`/`archived` | V-003 |
| `role` | 必填 | 用户在该项目中的真实角色，不夸大（"独立开发"要用户确认过） | V-002 |
| `period` | 必填 | `start` 与 `end` 均为 `YYYY-MM`；进行中时 `end: null`；`end` 不得早于 `start` | V-003 |
| `stack` | 必填（可为空数组） | 技术/工具名，小写或通用写法 | V-003 |
| `links` | 可选 | 每项 `label` + 合法 `url`；只在用户同意公开时收录 | V-003 |
| `outcomes` | 必填 ≥1 | 必须可验证（"CI 拦下非法条目" ✅，"提升了很多" ❌） | V-002 |
| `linked_knowledge` | 可选（默认 `[]`） | 只引用已存在的 knowledge id | V-008 / V-015 |
| `linked_errors` | 可选（默认 `[]`） | 只引用已存在的 error id | V-008 / V-015 |

## 4. journal 增补（C-7，含审批矩阵）

| 字段 | 必填 | 采集要求 | 编号 |
| --- | --- | --- | --- |
| `date` | 必填 | 必须等于文件名、目录年份与 id 中的日期（`content/journal/<YYYY>/<YYYY-MM-DD>.md` ↔ `DJ-<date>`） | V-017 |
| `review_status` | 必填 | `draft` / `approved`；**Agent 只能写 `draft`** | V-003 |
| `source` | 必填 | `self-reported`（本人所述）/ `agent-drafted`（Agent 起草） | V-003 |
| `approved_at` | 条件必填 | `source: agent-drafted` 且 `review_status: approved` 时必填 | V-011 |
| `approved_by` | 条件必填 | 同上，且只能是人工标识 `user` | V-011 / V-019 |
| `energy` | 可选 | 1..5 的整数（当天精力，主观值） | V-003 |
| `did` | 必填 ≥1 | 当天**用户确认过**做过的事；用户没说就不写 | V-002 |
| `learned` | 必填 ≥1 | 当天真正学到的东西（不是"今天学了 X 技术"这类空话） | V-002 |
| `blocked` | 可选（默认 `[]`） | 卡住的事 | — |
| `tomorrow` | 可选（默认 `[]`） | 次日打算 | — |
| `linked_knowledge` / `linked_projects` / `linked_errors` | 可选（默认 `[]`） | 参考的已有条目 id | V-008 / V-015 |
| `raw_source` | 可选 | 原始记录只能是仓库外私密库指针（`vault:...`） | V-020 |

## 5. errors 增补（C-8）

| 字段 | 必填 | 采集要求 | 编号 |
| --- | --- | --- | --- |
| `occurred` | 必填 | 出错当天 `YYYY-MM-DD` | V-007 |
| `severity` | 必填 | `low`/`medium`/`high`（按"是否阻断交付"判，不按心情） | V-003 |
| `symptom` | 必填 ≥8 字符 | 看到的**现象**（报错原文的关键行，不写"出错了"） | V-016 |
| `context` | 必填 ≥8 字符 | 发生条件（系统/版本/操作序列） | V-016 |
| `root_cause` | 必填 ≥8 字符 | 定位到的原因（文件 + 行为），写"原因不明"视为未完成 | V-016 |
| `fix` | 必填 ≥8 字符 | 实际改动（最小修复），不是"再试一次就好了" | V-016 |
| `prevention` | 必填 ≥8 字符 | 下次怎么不再犯（规则/检查/工具） | V-016 |
| `evidence` | 必填（可为空数组） | 每项 `kind`（`commit`/`pr`/`log`/`url`/`none`）+ `ref`；`ref` 建议加引号 | V-003 |
| `project` | 可选 | 关联的 `PJ-*` id，须已存在 | V-008 |

## 6. id 与文件名生成规则（C-1 / C-2）

| 类型 | 目录 | 文件名 | id |
| --- | --- | --- | --- |
| profile | `content/profile/` | 固定 `profile.md` | `profile` |
| knowledge | `content/knowledge/` | `<id 小写>-<slug>.md` | `KB-<DOMAIN>-<3位序号>`，DOMAIN 取 domain 缩写（engineering→ENG、product→PRD、design→DSN、data→DAT、finance→FIN、language→LNG、health→HLT、life→LIF、meta→MET） |
| project | `content/projects/` | `<id 小写>-<slug>.md` | `PJ-<2..8 位大写字母数字>` |
| journal | `content/journal/<YYYY>/` | `<YYYY-MM-DD>.md`（无 id 前缀，唯一例外） | `DJ-<YYYY-MM-DD>` |
| error | `content/errors/` | `<id 小写>-<slug>.md` | `ER-<YYYYMMDD>-<2位序号>` |

- 只允许字母/数字/`-`，全小写，无空格、无中文文件名。
- id 一经使用不得改号（改号 = 断链）。序号按同域递增，不复用已删除的号。

## 7. 提交前自检（与 CI 同一条命令）

```bash
npm run validate   # 期望末行：0 errors, N warnings
npm test           # 契约回归
npm run typecheck
npm run build
```

- `W-001` 标签未登记 → 先在 PR 里登记 `docs/TAXONOMY.md`（§4 流程），不要在内容里用未登记标签蒙过去。
- `W-004` 正文 < 80 字符 → 说明这条内容还不够一条，别提交。
- `W-005` 正文站内链接悬空 → v0.1 正文不要硬编码 `/141/...` 路由，关联关系一律写 `related` / `linked_*`。
- `W-002` 示例占比 > 50% → 真实内容补齐后自然消失；长期无法消除说明还在用示例冒充内容。
