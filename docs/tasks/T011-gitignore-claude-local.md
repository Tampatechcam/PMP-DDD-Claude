# T011 — Gitignore `.claude/settings.local.json`

**Commit:** `4ef9ef2` · `chore: gitignore .claude/settings.local.json`

## Problem

Claude Code's per-user permission allowlist file
(`.claude/settings.local.json`) was showing up as untracked on every
`git status` call. Convention is that the shared `.claude/settings.json`
holds project defaults and the `.local.json` variant holds each
developer's personal overrides — and therefore stays out of source
control.

## Approach

One-line addition to `.gitignore`:

```
.claude/settings.local.json
```

## Files

- [.gitignore](../../.gitignore)

## Verification

- `git status` after the commit no longer flags the file
