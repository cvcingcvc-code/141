---
# 复盘录入模板（T4.3 / A4）
# 用法：复制到仓库外（如 F:\141-vault\drafts\）填写，或直接走 scripts/import/new-journal.mjs。
# 本文件是「待填骨架」，不是有效条目：必填字段留空或占位，直接 validate 会失败（这是故意，
# 防止空白模板被误当作真实笔记）。填完后务必 npm run validate 确认 0 errors。
# 可选字段若不用，保持注释或删掉整行，不要写 null（energy 尤其不能写 null）。
id: DJ-YYYY-MM-DD        # 【自动】= DJ-<日期>，如 DJ-2026-11-08
type: journal
title: ""                 # 【必填】4..80 字
summary: ""               # 【必填】20..200 字，一句话说清这条复盘
created: YYYY-MM-DD       # 【必填】复盘日期
updated: YYYY-MM-DD       # 【必填】≥ created
published: false          # 【固定】不要改成 true（发布由用户确认合入 main 才发生）
tags: []                  # 【可选】0..12 项小写 kebab，见 docs/TAXONOMY.md
sample: false             # 【固定】真实内容为 false
vault_ref: null           # 【可选】仓库外原始记录指针 vault:<相对路径>
date: YYYY-MM-DD          # 【必填】= 文件名 = 目录年份 = id 中的日期（V-017）
review_status: draft      # 【固定】Agent 只能写 draft
source: agent-drafted     # 【如实】self-reported（本人）或 agent-drafted（Agent 起草）
# energy: 3               # 【可选】1..5 整数；不填就保持注释（不能写 null）
did: []                   # 【必填】≥1 项，当天实际完成的事，一条一句写结果不写心情
learned: []               # 【必填】≥1 项，当天真正学到的东西
blocked: []               # 【可选】卡住的事
tomorrow: []              # 【可选】次日打算
linked_knowledge: []      # 【可选】已存在的 knowledge id
linked_projects: []       # 【可选】已存在的 project id
linked_errors: []         # 【可选】已存在的 error id
raw_source: null          # 【可选】原始记录只能指向仓库外私密库 vault:<相对路径>
---

## 原始记录

（把当天的原始笔记原样贴在这里。混乱、碎片、口语都没关系——
结构化字段要的是结论，正文要的是上下文。）

## 补充说明

（可选：为什么做这件事、当时的判断依据、后来发现哪里想错了。）
