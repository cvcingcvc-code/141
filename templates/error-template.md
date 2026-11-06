---
# 错误经验录入模板（T4.3 / A4）
# 用法：复制到仓库外填写，或按命名规则放入 content/errors/er-YYYYMMDD-NN-<slug>.md（需授权）。
# 本文件是「待填骨架」，不是有效条目：必填字段留空，直接 validate 会失败（这是故意，
# 防止空白模板被误当作真实笔记）。
# 五要素（symptom/context/root_cause/fix/prevention）各 ≥8 字符，缺一项 V-016 会拦。
id: ER-YYYYMMDD-NN       # 【必填】ER-<出错日期>-<2位序号>，如 ER-20261108-01
type: error
title: ""                 # 【必填】4..80 字，一句话说清踩了什么坑（不要写"一个报错"）
summary: ""               # 【必填】20..200 字，症状 + 影响 + 解决浓缩版
created: YYYY-MM-DD       # 【必填】记录日期
updated: YYYY-MM-DD       # 【必填】≥ created
published: false          # 【固定】不要改成 true
tags: []                  # 【可选】小写 kebab，见 docs/TAXONOMY.md
sample: false             # 【固定】真实内容为 false
vault_ref: null           # 【可选】仓库外原始记录指针 vault:<相对路径>
occurred: YYYY-MM-DD      # 【必填】出错当天
severity: medium          # 【必填】low / medium / high（按是否阻断交付判）
symptom: ""               # 【必填】≥8 字符，看到的现象，含报错原文关键行
context: ""               # 【必填】≥8 字符，环境、版本、触发条件
root_cause: ""            # 【必填】≥8 字符，真正的原因（写"原因不明"视为未完成）
fix: ""                   # 【必填】≥8 字符，怎么修的、改了什么
prevention: ""            # 【必填】≥8 字符，下次怎么不再犯（检查项/断言/文档）
evidence: []              # 【可选】每项 kind(commit/pr/log/url/none) + ref
project: null             # 【可选】关联的 PJ-* id，须已存在
---

## 复现步骤

1.
2.

## 排查过程

（走过哪些弯路、哪些假设被推翻。这部分比"最终答案"更值钱。）
