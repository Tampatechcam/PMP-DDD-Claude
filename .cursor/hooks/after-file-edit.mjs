#!/usr/bin/env node
/**
 * afterFileEdit — remind agent to run lint + typecheck after .ts/.tsx edits (debounced per session).
 * stdin: { file_path, edits?, conversation_id?, session_id?, ... }
 * stdout: { additional_context? }
 */
import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const DEBOUNCE_MS = 120_000;
const LINT_REMINDER =
  "PMP post-edit: This batch touched TypeScript. Before finishing, run `npm run lint` and `npm run typecheck` once (or report results if you already ran them). Do not use `git commit --no-verify`.";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function loadState(stateFile) {
  if (!existsSync(stateFile)) return {};
  try {
    return JSON.parse(readFileSync(stateFile, "utf8"));
  } catch {
    return {};
  }
}

function saveState(stateFile, state) {
  mkdirSync(join(stateFile, ".."), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state), "utf8");
}

function shouldRemind(sessionKey, stateFile) {
  const now = Date.now();
  const state = loadState(stateFile);
  const last = state[sessionKey] ?? 0;
  if (now - last < DEBOUNCE_MS) return false;
  state[sessionKey] = now;
  saveState(stateFile, state);
  return true;
}

function detectRawFromWarning(filePath, edits) {
  const normalized = filePath.replace(/\\/g, "/");
  const inAppOrComponents =
    /\/app\//.test(normalized) || /\/components\//.test(normalized);
  const inDbLayer = /\/lib\/db\//.test(normalized);
  if (!inAppOrComponents || inDbLayer) return "";

  const addedFrom = (edits ?? []).some((edit) =>
    String(edit.new_string ?? "").includes(".from("),
  );
  if (!addedFrom) return "";

  return " Data-layer: new `.from(` under app/components — prefer `lib/db/*` for Supabase reads.";
}

function main() {
  let payload = {};
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.stdout.write("{}\n");
    return;
  }

  const filePath = String(payload.file_path ?? "");
  if (!/\.tsx?$/i.test(filePath)) {
    process.stdout.write("{}\n");
    return;
  }

  const sessionKey =
    payload.conversation_id ?? payload.session_id ?? "default";
  const stateFile = join(
    process.cwd(),
    ".cursor/hooks/.state/lint-reminder.json",
  );

  if (!shouldRemind(sessionKey, stateFile)) {
    process.stdout.write("{}\n");
    return;
  }

  let context = LINT_REMINDER;
  context += detectRawFromWarning(filePath, payload.edits);

  process.stdout.write(
    `${JSON.stringify({ additional_context: context })}\n`,
  );
}

main();
