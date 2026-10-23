#!/usr/bin/env bash
# PreToolUse (Bash): block npm / npx / pnpm / bun. This project uses yarn only (CLAUDE.md).
# Only matches the tool in command position, so `grep npm file` or `yarn add foo` still run.
cmd=$(jq -r '.tool_input.command // empty')

if printf '%s' "$cmd" | grep -Eq '(^|[;&|(`]|\$\()[[:space:]]*(sudo[[:space:]]+)?(npm|npx|pnpm|pnpx|bun|bunx)([[:space:]]|$)'; then
  echo "Blocked: this project uses yarn only. Use 'yarn install', 'yarn add <pkg>', 'yarn add -D <pkg>', or 'yarn <bin>' instead of npm/npx/pnpm/bun." >&2
  exit 2
fi
exit 0
