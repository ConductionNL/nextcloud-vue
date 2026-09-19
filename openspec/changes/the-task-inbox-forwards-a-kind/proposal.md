---
kind: code
---

# Proposal: the-task-inbox-forwards-a-kind

## Summary

Let the `tasks` entity source forward `kind`, so a Tasks page can ask for one
sort of work.

## Why

OpenRegister's engine task now carries a `kind`: a short free label saying
what sort of work a task is, as the creating app named it, indexed and
filterable (openregister#3863). Dossiq's first use of it is a reminder you set
for a colleague from a case, and its Tasks page needs a facet that picks the
reminders out of everything else.

Two things in this library would drop that filter without saying much. The
inbox store forwards an allowlist of query parameters, and `kind` is not on
it, so the argument never reaches the endpoint. The `tasks` source declares
which sidebar field becomes which inbox argument, and a field it does not
declare logs one console error and leaves a control on screen that narrows
nothing. Both are the right defaults; they just need the new argument added.

## What changes

- `kind` joins `ALLOWED_PARAMS` in `useTaskInboxStore`.
- The `tasks` source declares `kind: { param: 'kind', single: true }` in its
  `searchFields`, single-valued like `priority` because the endpoint compares
  one kind.

Nothing widens whose inbox the source answers from: `kind` narrows within the
inbox the session already decides, exactly as `priority` and `state` do.

## Impact

`src/composables/useTaskInboxStore.js`, `src/composables/indexSources.js`,
`tests/components/tasksEntitySource.spec.js`.
