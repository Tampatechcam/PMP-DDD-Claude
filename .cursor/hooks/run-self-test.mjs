#!/usr/bin/env node
/** Local smoke tests (stdin via spawn, not shell pipe). */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const guard = join(dir, "before-shell-guard.mjs");
const afterEdit = join(dir, "after-file-edit.mjs");

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
    script: guard,
    input: '{"command":"git commit --no-verify -m x"}',
    expect: '"permission":"deny"',
  },
  {
    name: "ask force-push main",
    script: guard,
    input: '{"command":"git push --force origin main"}',
    expect: '"permission":"ask"',
  },
  {
    name: "allow git status",
    script: guard,
    input: '{"command":"git status"}',
    expect: '"permission":"allow"',
  },
  {
    name: "lint reminder for tsx",
    script: afterEdit,
    input:
      '{"file_path":"C:/proj/components/Foo.tsx","conversation_id":"self-test"}',
    expect: "additional_context",
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
