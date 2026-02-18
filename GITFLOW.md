# Git-flow for SafeTale Sync

This repo follows the [git-flow](https://nvie.com/posts/a-successful-git-branching-model/) branching model.

## Branches

| Branch    | Purpose |
|----------|--------|
| **main** | Production-ready code. Only merge from `release/*` or `hotfix/*`. |
| **develop** | Integration branch. Default branch for new work. Merge `feature/*` here. |

## Branch types

- **feature/*** — New features. Branch from `develop`, merge back into `develop`.
- **release/*** — Release prep (version bump, changelog). Branch from `develop`, merge into `main` and back into `develop`.
- **hotfix/*** — Urgent production fixes. Branch from `main`, merge into `main` and into `develop`.

## Workflow (without git-flow CLI)

Git-flow CLI is optional. You can follow the model with plain git:

### Start a feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
# ... work, commit ...
git checkout develop
git merge --no-ff feature/my-feature
git push origin develop
# delete branch: git branch -d feature/my-feature
```

### Start a release

```bash
git checkout develop
git checkout -b release/1.0.0
# bump version, update changelog, commit
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin main --tags
git checkout develop
git merge --no-ff release/1.0.0
git push origin develop
```

### Hotfix

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix
# ... fix, commit ...
git checkout main
git merge --no-ff hotfix/critical-fix
git tag -a v1.0.1 -m "Hotfix 1.0.1"
git push origin main --tags
git checkout develop
git merge --no-ff hotfix/critical-fix
git push origin develop
```

## Config (already set)

The repo has git-flow branch config in `.git/config` so tools that read it (e.g. IDE plugins) can detect the model. To use the official git-flow CLI, install it and run `git flow init` (it will use existing `main`/`develop`).
