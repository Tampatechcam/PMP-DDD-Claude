#!/usr/bin/env node
/** Local smoke tests (stdin via spawn, not shell pipe). */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const gitGuard = join(dir, "block-unsafe-git.mjs");
const lintReminder = join(dir, "remind-lint-typecheck.mjs");

function run(script, input) {
  const r = spawnSync(process.execPath, [script], {
    input,
    encoding: "utf8",
  });
  return { status: r.status, out: (r.stdout || "").trim() };
}

const cases = [
  {
    name: "deny --no-verify",
    script: gitGuard,
    input: '{"command":"git commit --no-verify -m x"}',
    expect: '"permission":"deny"',
  },
  {
    name: "deny force-push main",
    script: gitGuard,
    input: '{"command":"git push --force origin main"}',
    expect: '"permission":"deny"',
  },
  {
    name: "allow git status",
    script: gitGuard,
    input: '{"command":"git status"}',
    expect: '"permission":"allow"',
  },
  {
    name: "allow force-push feature branch",
    script: gitGuard,
    input: '{"command":"git push --force origin feature/foo"}',
    expect: '"permission":"allow"',
  },
  {
    name: "lint reminder for tsx",
    script: lintReminder,
    input:
      '{"file_path":"C:/proj/components/Foo.tsx","conversation_id":"self-test"}',
    expect: "additional_context",
  },
  {
    name: "skip non-ts file",
    script: lintReminder,
    input: '{"file_path":"C:/proj/README.md","conversation_id":"self-test"}',
    expect: "{}",
  },
];

let failed = 0;
for (const c of cases) {
  const { status, out } = run(c.script, c.input);
  const ok = status === 0 && out.includes(c.expect);
  console.log(ok ? "ok" : "FAIL", c.name, out.slice(0, 80));
  if (!ok) failed += 1;
}

process.exit(failed ? 1 : 0);
