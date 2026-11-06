---
id: KB-ENG-003
type: knowledge
title: 我用 5 个 AI Agent 开发个人知识库，终于明白了什么叫真正的协作
summary: 用 5 个 AI Agent 并行开发个人知识库的实践复盘：多会话抢写、CI 假绿、搜索接通三个坑，指向同一条结论——协作边界比并行数量更关键。
created: 2026-11-06
updated: 2026-11-06
published: false
tags: [agent-collaboration, workflow, ci-cd]
sample: false
vault_ref: null
domain: engineering
status: seed
confidence: low
sources:
  - kind: experience
    ref: 作者本人在 2026-11 用 5 个 AI Agent 协作开发个人知识库的实践
    locator: 2026-11 项目复盘
    note: 文中"我认为/我学到"的判断均出自此次实践，未经外部复核，故 status=seed、confidence=low
  - kind: url
    ref: https://github.com/cvcingcvc-code/141/pull/3
    locator: T4.1 范围门禁 + CI / Pages 部署编排
    accessed: 2026-11-06
    note: 只证明"存在按分支前缀校验改动范围的 CI"，不证明零缺陷
  - kind: url
    ref: https://github.com/cvcingcvc-code/141/pull/6
    locator: T2.1 契约代码化（zod schema / 五类 collections / 校验器）
    accessed: 2026-11-06
    note: 只证明契约与校验器已落地，不证明知识条目内容为真
  - kind: url
    ref: https://github.com/cvcingcvc-code/141/pull/12
    locator: T3.2 十二条路由 + 五个组件
    accessed: 2026-11-06
    note: 只证明路由与组件存在且只读 collections.ts，不证明体验好坏
  - kind: url
    ref: https://github.com/cvcingcvc-code/141/pull/13
    locator: T4.2 content.json 生成器（复用单一发布过滤）
    accessed: 2026-11-06
    note: 只证明产物只含已发布条目，不证明内容质量
  - kind: url
    ref: https://github.com/cvcingcvc-code/141/pull/16
    locator: T2.2 采集模板与来源核对清单（BLOCKED-D1 记录）
    accessed: 2026-11-06
    note: 只证明采集流程与"真实内容尚未到位"的事实记录
  - kind: url
    ref: https://github.com/cvcingcvc-code/141/pull/17
    locator: Wave 2 最终独立验收（8 PASS + 1 BLOCKED-D1）
    accessed: 2026-11-06
    note: 只证明 QA 的验收结论，不能替代对文章内容的确认
related: []
---

*分类：AI 编程 / 软件工程 / 实践复盘*

以前我觉得，AI 编程想提高效率，最简单的方法就是同时打开几个窗口，让不同的 Agent 一起写代码。

一个负责前端，一个负责后端，一个负责测试。

看起来大家都在忙，效率应该翻倍。

但实际做下来，我发现：

**AI Agent 越多，不代表项目进展越快。没有明确分工，反而可能把项目搞得越来越乱。**

## 01｜我做了一个实验

最近，我用 5 个 AI Agent 协作开发了一个个人知识库项目。

目标并不复杂：记录自己学过的知识、做过的项目、每天的复盘和踩过的坑，并且能在网站上搜索。

项目采用 Astro、Markdown、Pagefind 和 GitHub Actions。

我把五个 Agent 分成了不同角色：

- A1：负责架构、任务分配和最终验收。
- A2：负责知识内容、Schema 和校验。
- A3：负责网站页面和交互。
- A4：负责自动化、构建与搜索。
- A5：负责独立测试和质量检查。

每个 Agent 使用独立分支和 Git Worktree，完成任务后提交 PR，而不是直接修改主分支。

## 02｜第一个坑：多个 Agent 可能互相干扰

开发过程中，曾有两个 A2 会话同时操作同一个 Worktree。

结果就是，两边都在编写采集模板、修改文件和推送提交。

虽然最后没有丢失成果，但出现了重复文件和额外的整理工作。

这让我意识到：

**Git Worktree 能隔离分支，却不能自动管理多个 AI 会话的写入权限。**

因此，一个工作目录最好只由一个 Agent 会话负责写入。

## 03｜第二个坑：测试显示成功，不代表功能都测过了

有一次，GitHub Actions 显示绿色成功。

但仔细检查才发现，内容校验步骤实际上被跳过了。

也就是说，CI 成功，只证明已经执行的检查成功，并不代表所有检查都执行了。

后来，我们修改了流程：必要的验证不能被静默跳过，还用故意构造的错误输入测试 CI 是否真的会报红。

我学到的第二件事是：

**不要只看 PASS，要看它测试了什么、跳过了什么。**

## 04｜第三个坑：页面能打开，不代表整个网站能用

一开始，网站能构建，首页能访问。

但知识详情页、全文搜索和数据索引还没有全部接通。

后来在接入 Pagefind 搜索时，又遇到了资源路径重复拼接的问题。

最终通过检查真实浏览器请求、修改加载方式，并在隔离环境里验证搜索关键词，我们才把功能串起来。

这让我开始区分两件事：

- 代码能运行，是技术上的第一步。
- 用户能够完成一个真实任务，才是产品闭环。

## 05｜最重要的收获

这次实践让我重新理解了 AI 编程。

以前更关注 AI 一次能写多少代码。

现在更关注：

**目标有没有冻结？任务边界是否清晰？有没有真实证据？错误出现后能不能定位和回滚？**

最终，项目完成了页面、详情、搜索、内容过滤和独立 QA 的技术验收。

但它仍然没有公开部署，真实个人内容也还在准备中。

我不想把一个只完成技术演示的项目，说成已经正式上线的产品。

**AI 可以替我写代码，但不能替我定义目标、承担判断，也不能替我确认一项成果是否真正完成。**

这可能是我在这次多 Agent 实践中学到的最重要的一课。

## 可核对证据（只映射事实，不证明观点）

文中提到的开发事实可以在仓库里逐条核对；上文关于"协作边界""PASS 不等于测过""能运行不等于能用"的判断属于个人经验，**不由这些链接背书**。

| 文中提到的事实 | 可核对来源 | 它能证明 / 不能证明 |
| --- | --- | --- |
| 五个角色的分工与"独立分支 + Worktree + PR"的做法 | PR #3（范围门禁与 CI 编排） | 证明存在按分支前缀校验的门禁；不证明分工方案普适 |
| A2 负责内容契约与校验（`schema.ts` / 校验器 / 发布过滤） | PR #6 | 证明契约与校验器已落地；不证明知识内容为真 |
| 页面、详情与搜索接通 | PR #12 | 证明路由与组件存在；不证明体验好坏 |
| 数据索引与内容过滤 | PR #13 | 证明产物只含已发布条目；不证明内容质量 |
| 真实内容仍在准备中 | PR #16 | 证明采集流程与"待授权"这一事实 |
| 技术验收与未达成项并存 | PR #17 | 证明 QA 的结论；不能替代对内容的确认 |

> 说明：本文 `status: seed`、`confidence: low`。它是实践复盘，不是经过外部复核的结论；
> 若要升级为 `verified`，需要补上可追溯的一手来源（见 `src/content/intake/source-verification.md`）。
