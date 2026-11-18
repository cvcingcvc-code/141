# 仓库使用与版权声明（Repository Usage & Content Notice）

> 适用范围：`https://github.com/cvcingcvc-code/personal-knowledge-os` 及其编译发布的公开站点 `https://cvcingcvc-code.github.io/personal-knowledge-os/`
> 生效日期：2026-11-18

---

## 1. 仓库定位

本仓库是维护者（GitHub：`cvcingcvc-code`）的**个人知识操作系统（Personal Knowledge OS）**工程仓库与单一事实源。

系统以受控 Markdown 文件承载五类结构化资产（`profile` 个人介绍、`knowledge` 知识、`projects` 项目、`journal` 每日复盘、`errors` 错误经验），经 Zod 契约校验、分支改动范围门禁与三层隐私扫描后，编译为零运行时依赖的静态站点与离线全文搜索索引。

---

## 2. 双轨许可与知识产权边界（必读）

本仓库严格区分**“工程代码与工具链”**与**“个人原创内容”**，二者适用完全不同的许可规则（对应产品决策 `D4`）：

### 2.1 工程代码与自动化工具链 —— MIT License
以下目录中的框架代码、组件、样式、构建与校验脚本、QA 工具及 CI/CD 工作流，按根目录 [`LICENSE`](../LICENSE)（**MIT License**）开源授权：
- `src/**`（不含任何个人内容正文）
- `scripts/**`
- `templates/**`
- `qa/scripts/**`、`qa/*.md`
- `.github/workflows/**`
- 根目录工程配置文件（`astro.config.mjs`、`package.json`、`tsconfig.json` 等）

任何个人或组织均可在保留原版权声明与许可文本的前提下，自由使用、复制、修改、Fork 本套工程底座来搭建自己的知识库系统。

### 2.2 原创知识与个人记录内容 —— 保留全部权利（All Rights Reserved）
以下路径中所有 `sample: false` 的真实个人介绍、知识文章、项目复盘、日常记录、踩坑分析及相关验收证据：
- **`content/**` 下的全部真实条目**
- **`docs/incidents/**` 与项目专属实践记录**

上述内容版权归原作者 `cvcingcvc-code` 独家所有，**不适用 MIT 许可，亦不默认套用任何 Creative Commons（CC）开放许可**：
- **允许的使用**：正常在线阅读、分享公开页面链接、在注明原作者（`cvcingcvc-code`）与原文链接的前提下进行简短合理的观点引用。
- **禁止的使用**：未经作者本人事前明确授权，**严禁**整篇或大段转载、洗稿改写、去除署名搬运、用于商业出版/付费课程、或打包进第三方语料/数据集以他人经历名义分发。

---

## 3. 内容真实性、状态标识与免责声明

1. **严格区分验证等级**：
   - 知识条目显式标注 `verified`（附带可复查的一手文档、源码或工程实证）与 `seed`（基于个人阶段性实践的初步观察，待进一步外部复核），并配套 `confidence`（`low / medium / high`）徽章。
   - 严禁编造个人经历、指标或时间线；所有已发布条目均经过人工确认（`published: true` 且 `published_by: user`）。
2. **契约回归样本说明**：
   - `content/` 目录下带有 `sample: true` 且 `published: false` 的少量条目，仅作为自动化契约与校验器的回归测试样本，**不代表作者个人经历**，且被构建管线严格排除在公开站点、`content.json` 与搜索索引之外。
3. **非专业建议免责**：
   - 仓库及站点中的全部技术判断、架构取舍与排障记录，仅反映特定环境与时间点下的个人工程实践，按“原样（AS IS）”提供，不构成针对任何生产系统、商业决策、法律或投资场景的适用性担保。因直接照搬文中方案造成的任何损失，维护者不承担责任。

---

## 4. 公开仓库安全与隐私边界

1. **公开可见性**：本仓库为 GitHub Public 仓库，所有进入 Git 树与提交历史的字节均视为公开信息。Frontmatter 中的 `published: false` 或 `review_status: draft` **仅控制是否编译上站，不提供任何保密能力**。
2. **私密隔离准则**：未脱敏的私人原稿、第三方非公开信息、内部系统细节及任何密钥凭据（L3 级数据）**一律禁止进入本仓库**，仅保存在仓库外的本地独立私密目录中，仓库内至多保留 `vault:` 格式的相对路径指针。
3. **安全门禁不可绕过**：任何提交均须通过 `V-010` 敏感信息校验与 `L1 工作树 / L2 Git 历史 / L3 构建产物` 三层隐私扫描，严禁通过关闭规则或添加低熵值哈希白名单掩盖告警。

---

## 5. Fork 自建个人知识库指南（给复用者）

如果您希望复用本项目的工程底座搭建自己的个人知识库，请按以下步骤清理原作者的个人内容后再发布：

```bash
# 1. 克隆或 Fork 后拉取到本地
git clone https://github.com/<你的用户名>/<你的仓库名>.git
cd <你的仓库名>
npm ci

# 2. 清空原作者的真实个人条目（保留目录结构；如需保留 sample:true 回归夹具可按需调整测试白名单）
#    - 将 content/profile/profile.md 替换为你自己的介绍（默认先设 published: false）
#    - 移除 content/knowledge/kb-eng-003..006*.md、content/projects/pj-pkos*.md、
#      content/journal/2026/2026-11-18.md、content/errors/er-20261114-01*.md
#    - 同步更新 src/content/__tests__/positive.test.mjs 与 intake.test.mjs 中的作者专属快照列表

# 3. 修改站点域名与 GitHub Pages 子路径
#    编辑 astro.config.mjs 中的 site 与 base（例如 base: '/<你的仓库名>'）

# 4. 本地运行全套校验与预览，确认 0 错误后再部署到你自己的 GitHub Pages
npm run validate && npm test && npm run typecheck && npm run build
npm run preview
```

---

## 6. 协作与外部贡献规则

- **唯一审批权**：本仓库为单人主理的个人知识系统，合并入 `main`、将内容标记为 `published: true` / `approved` 以及触发公开部署的最终决定权，仅归仓库所有者本人所有。
- **Issue 与 PR 边界**：
  - 如发现工程脚本缺陷、样式异常或死链，欢迎提交 GitHub Issue 反馈。
  - **不接受**外部直接新增或修改 `content/**` 个人知识与复盘内容的 Pull Request；工程修复类 PR 须遵守 [`AGENTS.md`](../AGENTS.md) 中的目录写权限与测试门禁要求。
