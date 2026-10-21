# Proposal: object-actions-ui

## Why

OpenRegister now declares an action on an object once and runs it through one path (openregister change
`object-actions-declared-and-run`, accepted by Ruben on 21 Oct 2026). It answers which actions the person may run on an
object, with a reason when one cannot run now, and runs one with inputs, sync or async.

nextcloud-vue still renders actions through five paths: `api-call` buttons with hand-built URLs, `CnMacrosWidget` for
macros only, `CnLifecycleActions` for transitions, `CnActionDialog` and `run-node`. Visibility is `visibleWhen` only, so a
person sees buttons that answer 403. This change is the consumer half recorded as task 5.2 of the OpenRegister change.

## What changes

1. `useObjectActions` reads `GET /api/objects/{register}/{schema}/{id}/actions` (or, for a selection,
   `GET /api/object-actions/{register}/{schema}`) and runs an action, following an async run to its end.
2. A manifest action `type: "object-action"` with `action: "<key>"` runs one declared action.
3. `actionsFrom: "openregister"` on a header, row or bulk action list renders every listed action whose `surfaces`
   include that place, narrowed by `include`.
4. An action with `inputs` opens `CnObjectActionDialog`, built from the input JSON Schema with
   `CnTransitionInputFields`, which `CnTransitionInputDialog` also uses.
5. An unavailable action renders disabled with its reason. An action the person may not run is absent.
6. An async run shows that it is running, then its result. A suspended run says so.
7. `CnMacrosWidget` becomes a view over the same list (`kind: flow|steps`). `macrosFrom` keeps working as the record's
   `include`, and the widget falls back to the schema declaration on an OpenRegister without the actions route.

## Backward compatibility

Additive. `api-call`, `run-node`, `CnLifecycleActions` and `CnTransitionInputDialog` keep their contracts. The macros
widget keeps its manifest shape (`content.macrosFrom`, `emptyText`, `description`).

## Consumers

dossiq, pipelinq and learniq migrate their verbs in their own changes (OpenRegister design D-9).
