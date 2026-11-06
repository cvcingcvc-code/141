# 素材填写表（可复制到仓库外填写）

> **不要在本仓库内填写这份表。** 仓库是 public，写入即等于公开（C-18 / P0-1）。
> 正确用法：把本文件复制到 `F:\141-vault\intake\<日期>-<主题>.md` 填写，填完把**允许入库的部分**发给我，
> 我按 `field-checklist.md` 结构化、按 `source-verification.md` 核对来源，再走 PR。
> 当前状态：`BLOCKED-D1`（尚未收到任何可入库素材）。

## 0. 每条素材一份授权块（缺一项就不入库）

| 项 | 填写 |
| --- | --- |
| 素材编号 | `M-001`（自定，按顺序递增） |
| 素材提供人 / 来源 | 用户本人 / 用户指定的公开链接 / 其他（写明） |
| 是否明确允许写入公开仓库 | □ 是　□ 否（填"否"则只留在私密库，正文不写） |
| 脱敏级别 | □ L1 可公开　□ L2 暂不发布　□ L3 禁止入库（只留 `vault_ref` 指针） |
| 用户确认记录 | 日期 + 原话/链接（例如"2026-11-07 用户口头确认可公开"） |
| 我（A2）核对结论 | 结构化前的自检：字段是否齐、来源是否可追溯、是否含第三方信息 |

> 规则：`L3` 只留在 `F:\141-vault\`，仓库里只写 `vault_ref: vault:<相对路径>`；
> 正文不得出现真实姓名、联系方式、公司内部系统名、他人隐私、健康/家庭细节（`V-010` 全文件拦截）。

## 1. profile（1 条，固定 `content/profile/profile.md`）

```
title:            （4..80 字符）
summary:          （20..200 字符：这个库解决什么问题）
可公开的身份描述：   （一句话；写不写行业/岗位/公司类型，按用户授权的粒度）
当前在做什么：      （一句话，用户原话）
不希望出现的信息：   （明确列出，我按此裁剪）
```

## 2. knowledge（每条一份；`domain` 决定 id 前缀）

```
标题：            （这条讲什么）
一句话结论：       （summary，20..200 字符）
domain：          engineering / product / design / data / finance / language / health / life / meta
正文要点：         （用户自己的话，几条 bullet 即可，我来整理结构）
适用边界：         （什么情况下不成立——没有就写"未确认"）
来源①：kind = url/book/paper/course/person/experience/agent
        ref =            （书名+版次 / 完整 URL / 论文标题）
        locator =        （章节、页码、段落小标题——必须能定位到章以下）
        accessed =       （URL 类来源必填，YYYY-MM-DD）
来源②：…（没有第二个就留空；只有一个来源时 confidence 最高 medium）
我是否复现/验证过：  □ 是（怎么验的）　□ 否
期望 status：       seed / verified（说"是"才敢 verified）
期望 confidence：   low / medium / high（high 必须有非 agent 来源）
related：          （要关联的已有 knowledge id；没有就留空，不按标题猜）
```

## 3. projects（每条一份）

```
项目名：            （title）
一句话说明：         （summary）
status：           idea / active / paused / shipped / archived
我的真实角色：       （用户原话，不夸大；"独立开发"要用户确认过）
period：start = YYYY-MM　end = YYYY-MM 或 null（进行中）
stack：            （技术/工具，逗号分隔）
可验证结果 ≥1：      （能指向 commit / PR / 上线 / 数据的那一句）
链接（可选）：        label + url（仅在用户同意公开时填）
linked_knowledge：  （已有 knowledge id）
linked_errors：     （已有 error id）
```

## 4. journal（每条一份；默认 `draft`，不发布）

```
日期：             YYYY-MM-DD（同时决定文件名与 id：content/journal/<YYYY>/<YYYY-MM-DD>.md ↔ DJ-<日期>）
title：            这天的复盘标题
summary：          20..200 字符
did ≥1：           当天实际做成的事（用户原话，我不代写）
learned ≥1：       当天真正学到的东西（不是"学了 X 技术"这种空话）
blocked：          卡住的事（可空）
tomorrow：         次日打算（可空）
energy：           1..5（可空）
含不宜公开细节吗：   □ 否　□ 是 → 正文只写脱敏结论，原始记录放 vault 并填 raw_source
```

## 5. errors（每条一份）

```
出错日期：          YYYY-MM-DD（occurred）
severity：         low / medium / high（按是否阻断交付判，不按心情）
症状：             看到的报错现象（关键行原文，≥8 字符，不写"出错了"）
上下文：           系统/版本/操作序列（≥8 字符）
根因：             定位到的原因（文件 + 行为；写"原因不明"视为未完成）
修复：             实际改动（最小修复）
预防：             下次怎么不再犯（规则/检查/工具）
证据：             kind = commit/pr/log/url/none，ref = （commit sha / PR 号 / 日志片段，加引号）
关联项目：          PJ-xxx（可空，须已存在）
涉及同事/内部系统：  □ 否　□ 是 → 用"某系统/同事 A"脱敏，或整条改走 vault_ref
```

## 6. 标签与关联（每条都要回答）

```
标签候选：          （我按 docs/TAXONOMY.md 现有 53 个受控标签给建议，你拍板；最多 12 个）
现有标签不够用吗：   □ 够　□ 不够 → 需要新标签：名称 + 一句话定义 + 为什么现有标签覆盖不了
需要关联谁：         （明确写出"哪条 → 哪条"，我不按相似度猜）
```

## 7. 交回之后我做什么（不需要你操作）

1. 生成 `id` 与文件名（C-1 / C-2），补齐必填字段。
2. 按 `source-verification.md` 五问核对来源；不够就降级为 `seed` + `low`，不升级。
3. 跑 `npm run validate` / `npm test` / `npm run typecheck` / `npm run build`。
4. 提 PR：逐条说明"哪句来自用户、哪句是我的整理"，`published` 保持 `false`，不填 `published_by`。
5. 你逐条确认后再决定是否发布（`published: true` + `published_by: user` 只能由你或 A1 执行）。
