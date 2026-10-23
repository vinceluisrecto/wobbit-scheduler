#!/usr/bin/env bash
# PreToolUse (Write|Edit): block creating or editing non-yarn lockfiles, and hand-editing yarn.lock.
file=$(jq -r '.tool_input.file_path // empty')

case "$(basename "$file")" in
  package-lock.json|npm-shrinkwrap.json|pnpm-lock.yaml|bun.lock|bun.lockb)
    echo "Blocked: yarn.lock is the only lockfile in this project. Don't create $(basename "$file")." >&2
    exit 2
    ;;
  yarn.lock)
    echo "Blocked: don't edit yarn.lock by hand. Change dependencies with 'yarn add' / 'yarn remove'." >&2
    exit 2
    ;;
esac
exit 0
