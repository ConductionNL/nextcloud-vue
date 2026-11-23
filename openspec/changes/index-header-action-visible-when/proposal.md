# An index header action can show only for some readers

## Why
stackiq offers Find duplicates on `/organisaties` only to readers whose `/api/me` says `mayFindDuplicates`
(`operations-record-reconciliation` task 4). An index page's header actions honoured `adminOnly` only; their
`visibleWhen`, which the schema already accepts, was ignored.

## What changes
CnIndexPage evaluates each header action's `visibleWhen` once (reader groups, an installed app, an endpoint or source,
with `@config.<key>` tokens) and draws a gated action only once its condition holds. A failed request hides it.
No schema change.
