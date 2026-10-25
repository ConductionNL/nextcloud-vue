---
kind: code
---

# Proposal: tasks-source-open-first

## Summary

Board DqTaken lists a month's tasks by deadline with the finished ones last. When a column sorts the task inbox, the
tasks source now also asks `openFirst=true` (openregister feat/task-inbox-open-first, PR #4842): open work first,
then finished, each in the chosen order. The store forwards `openFirst` (allowlisted, stringified like `isTerminal`).
An openregister without the parameter ignores it, and the list sorts as before.

## Scope

- `src/composables/indexSources.js`: `sortParam` returns `{ sort, openFirst: true }`.
- `src/composables/useTaskInboxStore.js`: `openFirst` in the allowlist.
- No schema change.
