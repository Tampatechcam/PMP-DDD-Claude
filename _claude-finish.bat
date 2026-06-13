@echo off
setlocal EnableDelayedExpansion
set REPO=C:\Users\cah50\Downloads\PMP DDD CLaude
set LOG=%REPO%\_claude-deploy.log

cd /d "%REPO%"

(
  echo === PMP auto-deploy started %DATE% %TIME% ===
  echo.
  echo --- step 1: clear ghost index.lock if present ---
  if exist ".git\index.lock" (
    del /f /q ".git\index.lock"
    if errorlevel 1 (
      echo del failed - trying powershell
      powershell -NoProfile -Command "Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue"
    ) else (
      echo index.lock removed
    )
  ) else (
    echo no index.lock present
  )
  echo.
  echo --- step 2: git status pre-push ---
  git rev-parse --abbrev-ref HEAD
  git log --oneline -5
  echo.
  echo --- step 3: push main to origin ---
  git push origin main
  echo push exit code: !errorlevel!
  echo.
  echo --- step 4: discard CRLF noise in worktree ---
  git checkout -- .
  echo.
  echo --- step 5: stage memory + handoff docs ---
  git add memory/projects/standard-intake-pivot.md HANDOFF-2026-06-13.md _claude-finish.bat
  echo --- step 6: commit docs ---
  git commit -m "docs(memory): standard-intake pivot summary + handoff" -m "Per-project memory file documenting the June 2026 pivot: standardized CSV intake template, audit log layer, normalized venue cascade, office defaults from history." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
  echo commit exit: !errorlevel!
  echo.
  echo --- step 7: push docs ---
  git push origin main
  echo push exit: !errorlevel!
  echo.
  echo --- step 8: npm install ---
  call npm install
  echo install exit: !errorlevel!
  echo.
  echo --- step 9: stage + commit lockfile if changed ---
  git add package-lock.json
  git diff --cached --quiet
  if errorlevel 1 (
    git commit -m "chore(deps): refresh package-lock.json after intake feature merge" -m "Picks up zod ^3.23.8 and @anthropic-ai/sdk ^0.27.0." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
    git push origin main
  ) else (
    echo lockfile unchanged - skipping commit
  )
  echo.
  echo --- step 10: typecheck ---
  call npm run typecheck
  echo typecheck exit: !errorlevel!
  echo.
  echo === DONE %DATE% %TIME% ===
) > "%LOG%" 2>&1

echo Script finished. Log at %LOG%
type "%LOG%" | more
