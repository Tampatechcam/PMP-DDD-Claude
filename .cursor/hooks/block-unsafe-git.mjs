#!/usr/bin/env node
/**
 * beforeShellExecution — block unsafe git commands (no jq).
 * stdin: { command, cwd?, sandbox? }
 * stdout: { permission: "allow" | "deny", user_message?, agent_message? }
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
      user_message:
        "Git safety hook could not parse shell input; command blocked (fail-closed).",
      agent_message:
        "block-unsafe-git received invalid JSON on stdin. Retry the command or check .cursor/hooks.json.",
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
        "Shell command blocked: --no-verify is never allowed. Resolve hook failures; do not skip verification.",
    });
    return;
  }

  const isGitPush = /\bgit\b/.test(cmd) && /\bpush\b/.test(cmd);
  const hasForce =
    /--force(?:\s|$|-)/.test(cmd) ||
    /--force-with-lease(?:\s|$|-)/.test(cmd) ||
    /(?:^|\s)-f(?:\s|$)/.test(cmd);
  const targetsMainBranch =
    /\b(?:origin\/|refs\/heads\/)?(?:main|master)\b/.test(cmd) ||
    /\bpush\b[\s\S]*\b(?:main|master)\b/.test(cmd);

  if (isGitPush && hasForce && targetsMainBranch) {
    respond({
      permission: "deny",
      user_message:
        "PMP policy: force-push to main/master is blocked. Use a feature branch or ask the user explicitly for another approach.",
      agent_message:
        "Shell command blocked: git push with force flags targeting main or master is not allowed in this project.",
    });
    return;
  }

  respond({ permission: "allow" });
}

main();
