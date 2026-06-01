#!/usr/bin/env node
/**
 * beforeShellExecution — block --no-verify; ask on force-push to main/master.
 * stdin: { command, cwd?, sandbox? } → stdout: { permission, user_message?, agent_message? }
 */
import { readFileSync } from "node:fs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function respond(body) {
  process.stdout.write(`${JSON.stringify(body)}\n`);
}

function main() {
  const raw = readStdin().trim();
  if (!raw) {
    respond({ permission: "allow" });
    return;
  }

  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    respond({
      permission: "deny",
      user_message: "Shell guard could not parse hook input; command blocked (fail-closed).",
      agent_message:
        "before-shell-guard received invalid JSON on stdin. Retry the command or check .cursor/hooks.json.",
    });
    return;
  }

  const command = String(payload.command ?? "");
  const cmd = command.toLowerCase();

  if (/--no-verify\b/.test(cmd)) {
    respond({
      permission: "deny",
      user_message:
        "PMP policy: do not bypass git hooks (--no-verify). Fix lint/typecheck or pre-commit failures instead.",
      agent_message:
        "Shell command blocked: --no-verify is never allowed in this project. Resolve hook failures; do not skip verification.",
    });
    return;
  }

  const isGitPush =
    /\bgit\b/.test(cmd) && /\bpush\b/.test(cmd);
  const hasForce =
    /--force(?:\s|$|-)/.test(cmd) ||
    /--force-with-lease(?:\s|$|-)/.test(cmd) ||
    /(?:^|\s)-f(?:\s|$)/.test(cmd);
  const targetsMainBranch =
    /\b(?:origin\/|refs\/heads\/)?(?:main|master)\b/.test(cmd) ||
    /\bpush\b[\s\S]*\b(?:main|master)\b/.test(cmd);

  if (isGitPush && hasForce && targetsMainBranch) {
    respond({
      permission: "ask",
      user_message:
        "Possible force-push to main/master — review before approving (project policy discourages this).",
      agent_message:
        "Hook flagged a git push with force flags targeting main or master. Only proceed if the user explicitly requested a force push.",
    });
    return;
  }

  respond({ permission: "allow" });
}

main();
