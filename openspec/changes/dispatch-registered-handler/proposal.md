# Proposal: dispatch-registered-handler

## Why

A widget row action of type `handler` (CnObjectListWidget `rowActions`, CnRecordListWidget `rowAction`) dispatches
through the page's `cnDispatchAction`, whose `handlers` are the manifest's `actions` map. That map is JSON, so a
function never answers it: the action warned once and did nothing. The index page already resolves a handler name
against the app's component registry (`resolveRegisteredHandler`) and calls it with `{ actionId, item }`. dossiq's
"Pick up" on the My team queue (`claimCase`, DqMijnTeam "Oppakken") was dark for that reason.

## What changes

`dispatchAction` with `type: "handler"` falls back to the registry when `handlers` has no function of that name. The
registered handler is called as on an index page, with `{ actionId, item, args }`: `item` is the context's `row`, else
the last argument.

## Scope

`src/utils/actionsDispatcher.js`. A handler in `handlers` keeps its spread-argument call; a name nobody answers still
warns.
