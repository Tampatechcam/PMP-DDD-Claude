# PMP Dashboard Cursor hooks

| Script | Event | Behavior |
|--------|-------|----------|
| `before-shell-guard.mjs` | `beforeShellExecution` | **Deny** commands containing `--no-verify`. **Ask** before `git push` with force flags to `main`/`master`. |
| `after-file-edit.mjs` | `afterFileEdit` | After `.ts`/`.tsx` edits, inject debounced `additional_context` to run `npm run lint` + `npm run typecheck` once per batch; optional warning if edits add `.from(` under `app/` or `components/`. |

Configured in [../hooks.json](../hooks.json). Debounce state: `.state/lint-reminder.json` (gitignored via `.state/.gitkeep` parent if needed).

**Manual test**

```bash
node .cursor/hooks/run-self-test.mjs
```

Uses `spawnSync` with JSON on stdin (avoids shell-pipe quirks on Windows). For individual checks, pipe JSON into each script; use commands that do not contain `git commit` if your shell rewrites piped JSON.
