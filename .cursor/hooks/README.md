# PMP Dashboard Cursor hooks

Project hooks in [../hooks.json](../hooks.json) (schema version 1).

| Script | Event | Behavior |
|--------|-------|----------|
| `block-unsafe-git.mjs` | `beforeShellExecution` | **Deny** `--no-verify` on git commit and **deny** `git push --force` (or `-f` / `--force-with-lease`) to `main`/`master`. |
| `remind-lint-typecheck.mjs` | `afterFileEdit` | After `.ts`/`.tsx` edits, inject debounced `additional_context` to run `npm run lint` + `npm run typecheck` once per batch. |

Debounce state: `.state/lint-reminder.json` (gitignored).

**Manual test:** `node .cursor/hooks/run-self-test.mjs`
