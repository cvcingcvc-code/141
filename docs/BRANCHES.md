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

## 4. `main` 保护规则（T1.3 执行）

```bash
gh api -X PUT repos/cvcingcvc-code/141/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=ci" \
  -f "enforce_admins=true" \
  -F "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "required_pull_request_reviews[dismiss_stale_reviews]=true" \
  -F "restrictions=" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false"
```

> `enforce_admins=true` 意味着连主 Agent 也不能绕；这是刻意的。若 CI 尚未配置，`required_status_checks` 需在 T4.1 之后再设，否则所有 PR 卡死。

## 5. PR 规则

- 一个 PR 只做一件事（对应一个 `T*` 任务或一个缺陷）。
- 描述必须含：目标 / 变更文件与原因 / 关联任务 / 运行命令与输出 / 证据 / 未解决项 / 是否触碰契约。
- 触碰契约 → 打 `contract-change` 标签 + 附 RFC 链接，否则拒收。
- 不自审自合：Agent 的 PR 由 A1 审；A1 的 PR 由用户审。
- 合并方式：squash merge，提交信息用 `type(scope): subject (#PR)`。

## 6. 冲突预防（比解决冲突更重要）

1. 目录写权限互斥（见 ARCHITECTURE §3）。
2. `package.json` / `package-lock.json` / `astro.config.mjs` / `AGENTS.md` / `docs/CONTRACTS.md` 单点所有权。
3. 大文件（长文内容）与代码分开 PR。
4. 每天开工前 `git fetch && git rebase origin/main`，不要攒三天再合并。
5. 合并顺序严格按 §2 表，A1 负责在合并后立刻通知下一顺位 Agent rebase。

## 7. 清理

- 合并后：`git branch -d <branch>`、`git worktree remove <path>`、`git push origin --delete <branch>`。
- 长期不动的分支（>14 天无提交）由 A1 询问后关闭，避免僵尸分支。
