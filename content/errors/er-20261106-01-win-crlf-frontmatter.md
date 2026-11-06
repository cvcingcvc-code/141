---
id: ER-20261106-01
type: error
title: CRLF 混入导致 frontmatter 解析失败
summary: Windows 检出把 Markdown 换成 CRLF 后 frontmatter 解析失败，用 .gitattributes 与校验器双防线兜住。
created: 2026-11-06
updated: 2026-11-06
published: false
tags: [windows, debugging, tooling]
sample: true
vault_ref: null
occurred: 2026-11-06
severity: medium
symptom: 构建时 frontmatter 解析失败，报"缺少结束的 --- 分隔行"，但文件肉眼看起来完全正常。
context: Windows 上检出仓库后编辑器把 Markdown 保存成 CRLF；frontmatter 解析器按 LF 切行。
root_cause: 仓库缺少 .gitattributes，检出时按系统默认行尾写入 CRLF，切行逻辑只认 LF。
fix: 增加 .gitattributes 强制所有文本文件 eol=lf，并在校验脚本里先归一化 CRLF 再解析。
prevention: 校验器统一 normalize 行尾 + CI 扫描仓库内是否出现 CRLF；编辑器侧开启 files.eol=lf。
evidence:
  - kind: commit
    ref: "a6dbf83"
project: PJ-141
---

> **这是示例数据（`sample: true`）**，且 `published: false`（L2：已脱敏但暂不上站），
> 用于验证"显式不发布"形态与 C-8 五要素（`V-016`）的强制约束。

## 为什么这条值得沉淀

这条不是"报错了所以记一下"，而是把"症状 → 上下文 → 根因 → 修复 → 预防"五段都写清楚：
缺任何一段，下次遇到同类问题时仍然只能重新猜。`V-016` 就是把这个要求变成机器可判的门槛。

## 常见的判断失误（示例说明，非真实事故记录）

容易出现的反应是"frontmatter 写错了"，于是反复改 YAML —— 但**问题不在 YAML 内容**。
要点：报错信息指向的位置（第 1 行）不等于根因位置（行尾编码）。
修复顺序应当是先复现、再看字节、再改代码，而不是先改内容。
