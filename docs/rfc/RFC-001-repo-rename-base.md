# RFC-001 同步仓库改名（141 → personal-knowledge-os）的站点子路径与契约示例

- 状态：accepted
- 提出人：A1（总控 / 架构）
- 日期：2026-11-18
- 目标契约版本：1.0.0（rc4） → 1.0.1
- 关联任务：W1-A1（`chore/rename-paths`）

## 1. 动机

GitHub 远端仓库已从 `cvcingcvc-code/141` 更名为 `cvcingcvc-code/personal-knowledge-os`。在项目子路径部署模式下，GitHub Pages 的公开访问地址同步变更为 `https://cvcingcvc-code.github.io/personal-knowledge-os/`。

若不更新 `astro.config.mjs` 的 `base` 与相关文档：
1. 构建产物中的内部路由、静态资源（`_astro/*`）、Pagefind `bundlePath` 及 `dist/data/content.json` 的 `base` 字段仍为 `/141/`，首次公开部署后将导致全站样式、链接与搜索索引 404；
2. `README.md`、`AGENTS.md`、`docs/**` 中的仓库 URL、Pages URL 与 `gh api` 命令仍指向旧仓库名，影响复现与分支保护维护。

## 2. 提案

本次仅做仓库名与部署子路径同步，按 `docs/rfc/README.md` 版本号规则升补丁版本 `1.0.0 → 1.0.1`（不改变任何字段、路由模式、产物结构或校验器语义）：

- `astro.config.mjs`：`base: '/141'` → `base: '/personal-knowledge-os'`
- `docs/CONTRACTS.md`：
  - C-6 示例仓库链接改为 `https://github.com/cvcingcvc-code/personal-knowledge-os`
  - C-10 示例 `"base": "/141/"` 改为 `"base": "/personal-knowledge-os/"`
  - C-18 公开仓库标识改为 `cvcingcvc-code/personal-knowledge-os`（注明原名 `141`）
  - C-16 增补 `1.0.1` 冻结记录

### 明确不改的边界

1. **已冻结内容 ID 不改**：项目示例 ID `PJ-141` 及文件名 `pj-141-personal-knowledge-os.md` 属于合法项目代号，按 C-2「id 一经使用不得改号」保留不变，避免断链。
2. **本机物理目录不改**：`F:\141`（集成主仓）、`F:\141-vault`（仓库外私密库）、`F:\141-wt\*`（各角色 worktree）仅是本机目录名，不迁移、不重命名，避免破坏 git worktree 指针与导入脚本默认路径。
3. **历史审计快照不篡改**：`docs/AUDIT.md` 与 `docs/incidents/*` 中的历史输出保留原貌。

## 3. 影响面

| 受影响 | 具体 |
| --- | --- |
| `docs/CONTRACTS.md` | 版本号 `1.0.1`、C-6 示例链接、C-10 `base` 示例、C-16 记录、C-18 仓库名 |
| `src/content/schema.ts` | 无变更 |
| `scripts/validate-content.mjs` | 校验编号与逻辑无变更（实际优先动态读取 `astro.config.mjs` 的 `base`；回退常量 `DEFAULT_BASE` 由 A2 在 `W1-2` 独立分支跟进） |
| `content/**` | ID 与结构无变更（外链 URL 由 A2 在 `W1-2` 独立分支跟进） |
| 页面 / 组件 | 路由与内部链接已统一经 `import.meta.env.BASE_URL` 拼接；`Footer.astro` 仓库外链由 A3 在 `W1-2` 独立分支跟进 |
| 数据产物 | `dist/data/content.json` 形状不变，`base` 值自动随 `astro.config.mjs` 变为 `"/personal-knowledge-os/"` |

## 4. 迁移方案

受 `scripts/check-scope.mjs`（C-17）分支改动范围门禁约束，按角色写权限分两步合入：
1. **W1-1（本 PR，`chore/rename-paths`，A1）**：更新 `astro.config.mjs`、`AGENTS.md`、`README.md`、归属 A1 的 `docs/**` 及本 RFC。
2. **W1-2（独立子分支，A3 / A2 / A5）**：本 PR 合入 `main` 后，分别由 A3（`Footer.astro` 等）、A2（`validate-content.mjs` 回退常量与测试/内容外链）、A5（QA 脚本默认 `--base` 参数）提交最小 PR。

## 5. 回滚方案

直接 `git revert` 对应 squash commit 即可将 `astro.config.mjs` 的 `base` 与文档恢复至 `/141`，无任何内容数据迁移或破坏性副作用。

## 6. 裁决

- 结论：accepted
- 理由：仓库改名已生效，同步 `base` 是 GitHub Pages 正常加载样式、路由与 Pagefind 搜索索引的必要前提，且不改变契约结构。
- 裁决人：仓库所有者确认 / A1 执行
- 日期：2026-11-18
