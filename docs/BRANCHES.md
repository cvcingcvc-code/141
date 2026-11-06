# BRANCHES.md — 分支与多 Agent 隔离方案

> 结论先说：**5 个角色 = 5 个分支 + 5 个 worktree**，主仓库只有一份 `main` 检出用于集成，开发互不干扰。

## 1. 分支模型（简化 trunk-based）

```
main ──●─────────────────●──────────────●────────────►  (仅经 PR 合入，squash)
        \               /              /
         ●─●─● feat/a2-schema ────────┘   (短生命周期，≤3 天)
          \             /
           ●─● feat/a3-shell ── ...
```

- `main` 永远可构建、可部署。合入即发布。
- 分支生命周期短（一个任务一个分支），合并后删除。
- 不做 `develop` / `release` 分支：单人 + 静态站，多分支层级只增加合并成本。

## 2. 分支清单

| 分支 | 归属 | 任务 | 基于 | 合入顺序 |
| --- | --- | --- | --- | --- |
| `main` | 集成 | — | — | — |
| `docs/phase0-contracts` | A1 | T1.1 | main@9fdd3c7 | **1** |
| `chore/bootstrap-toolchain` | A1 | T1.2 | main | 2 |
| `feat/a2-schema` | A2 | T2.1 | main(T1.2 后) | 3（门禁） |
| `feat/a4-ci` | A4 | T4.1 | main(T1.2 后) | 4 |
| `feat/a3-shell` | A3 | T3.1 | main | 5 |
| `feat/a2-content` | A2 | T2.2 | main(T2.1 后) | 6 |
| `feat/a3-pages` | A3 | T3.2 | main(T2.1 后) | 7 |
| `feat/a4-data` | A4 | T4.2 | main(T3.2 后) | 8 |
| `feat/a3-polish` | A3 | T3.3 | main | 9 |
| `feat/a4-import` | A4 | T4.3 | main | 10 |
| `feat/a4-deploy` | A4 | T4.4 | main | 11 |
| `qa/a5-baseline` → `qa/a5-run` | A5 | T5.1/T5.2 | main | 只提 PR，不改业务码 |
| `fix/<slug>` | 任何人 | 缺陷修复 | main | 按缺陷优先级插队 |

## 3. worktree 布局（Windows 实测环境）

主仓库：`F:\141`（只做集成与推送）
开发副本：`F:\141-wt\<角色>`

> **当前不要执行下面的命令。** PR #1 未合并、T1.2 未完成前，只允许 `docs/phase0-contracts` 一个分支存在；四个开发 worktree 在 Wave 1 启动时才创建（用户明确要求过不得提前建目录）。

```bash
# 一次性创建（在主仓库执行）
cd /f/141
git worktree add ../141-wt/a2 -b feat/a2-schema main
git worktree add ../141-wt/a3 -b feat/a3-shell main
git worktree add ../141-wt/a4 -b feat/a4-ci main
git worktree add ../141-wt/a5 -b qa/a5-baseline main

# 查看
git worktree list

# 分支合并后回收
git worktree remove ../141-wt/a2
```

为什么用 worktree 而不是多份 clone：共享同一个 `.git` 对象库，不会出现多份仓库状态不一致、也不会误推到不同 remote。

注意事项：
- 同一分支**不得**在两个 worktree 同时检出（git 会拒绝，这是保护，不要绕过）。
- Node 依赖各自安装（`npm ci`），不要跨 worktree 共用 `node_modules`。
- Windows 路径含空格需引号；本项目路径无空格，可直接使用。

## 4. `main` 保护规则（**P0-2 修订：分两阶段，不会自锁**）

单人项目的根本约束：没有第二个人能提供 approve。**因此不设"必须 N 个审批人"**，否则唯一的开发者永远无法合并。门禁靠三件事：必须走 PR、CI 必须绿、禁止 force push；再叠加"合入前由用户确认"。

### 阶段 A — CI 尚未存在时（T1.3 立即执行）

```bash
cd /f/141
cat > /tmp/protect-a.json <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": false
}
JSON
gh api -X PUT repos/cvcingcvc-code/141/branches/main/protection \
  -H "Accept: application/vnd.github+json" --input /tmp/protect-a.json
```

要点：
- `required_approving_review_count: 0` —— 仍然要求"必须走 PR"，但不需要第二个人 approve（这是唯一能自己完成合并的配置）。
- `required_status_checks: null` —— 因为此刻还没有任何 workflow，写死检查名会让所有 PR 永久 pending。
- `enforce_admins: true` —— 连自己也不能 force push，防止手滑毁历史。

### 阶段 B — CI 已在 main 上真实跑过之后

1. 先取**真实**的检查名，不要凭记忆写：

```bash
gh api repos/cvcingcvc-code/141/commits/main/check-runs \
  --jq '.check_runs[] | {name, conclusion}'
```

2. 用返回的 `name`（例如 `ci` 或 `scope`）填入：

```bash
cat > /tmp/protect-b.json <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
gh api -X PUT repos/cvcingcvc-code/141/branches/main/protection \
  -H "Accept: application/vnd.github+json" --input /tmp/protect-b.json
```

3. `"ci"` 必须替换为第 1 步的真实输出；名字写错 = 所有 PR 卡在 "Expected — Waiting for status to be reported"。

### 必须自证（否则不算完成）

| 验证 | 方法 | 通过标准 |
| --- | --- | --- |
| 能自己合并 | 开一个文档 PR，等 CI 绿，自己点 merge | 成功，附 run 链接 |
| 不能直推 | `git push origin main` | 被拒（贴报错原文） |
| 不能强推 | `git push --force origin main` | 被拒 |
| 检查名正确 | 见阶段 B 第 1 步 | contexts 与 check-runs 的 name 完全一致 |

### 应急降级（CI 挂掉导致全员阻塞时）

1. 记录原因到 PR 描述。
2. 临时把 `required_status_checks` 设为 `null`（回到阶段 A 配置）。
3. 修好 CI、main 上跑通一次后，按阶段 B 恢复。
4. 整个过程必须在 PR 里留痕；不得静默关掉保护。

## 5. PR 规则

- 一个 PR 只做一件事（对应一个 `T*` 任务或一个缺陷）。
- 描述必须含：目标 / 变更文件与原因 / 关联任务 / 运行命令与输出 / 证据 / 未解决项 / 是否触碰契约。
- 触碰契约 → 打 `contract-change` 标签 + 附 RFC 链接，否则拒收。
- 审核关系（单人项目的现实安排）：
  - A2/A3/A4/A5 的 PR → 由 A1 审（Agent 之间互相审）。
  - A1 的 PR（含 T1.2）→ 由**用户**审并确认后合并；A1 不自行合并自己未经确认的 PR。
  - 不要求第三方人工 approve（没人能满足，会形成死锁）。
- 合并方式：squash merge，提交信息用 `type(scope): subject (#PR)`。
- 合并前必过：`scope:check` + `validate` + `build`（阶段 B 后由 CI 强制）。

## 6. 冲突预防（比解决冲突更重要）

1. 写权限互斥——唯一表在 `AGENTS.md §3`，CI 用 `scope:check` 强制。
2. `package.json` / `package-lock.json` / `astro.config.mjs` / `AGENTS.md` / `docs/CONTRACTS.md` 单点所有权（A1）。
3. 大文件（长文内容）与代码分开 PR。
4. 每天开工前 `git fetch && git rebase origin/main`，不要攒三天再合并。
5. 合并顺序严格按 §2 表，A1 负责在合并后立刻通知下一顺位 Agent rebase。

## 7. 清理

- 合并后：`git branch -d <branch>`、`git worktree remove <path>`、`git push origin --delete <branch>`。
- 长期不动的分支（>14 天无提交）由 A1 询问后关闭，避免僵尸分支。
