# manifest-detail-lifecycle-actions Specification

## Purpose
TBD - created by archiving change manifest-detail-lifecycle-actions. Update Purpose after archive.
## Requirements
### Requirement: REQ-MDLA-1 — CnDetailPage SHALL accept a `lifecycleActions` config

`CnDetailPage` SHALL expose an optional `lifecycleActions` prop (Object,
default `null`). When set AND the page has an `objectId` (or a loaded
object), the page SHALL render a `CnLifecycleActions` instance in its
header, forwarding the page's `objectId`, the loaded `object`, and the
config. When `lifecycleActions` is null/omitted the page SHALL NOT render
any transition affordance and SHALL behave exactly as before this change.

#### Scenario: omitting the config renders no transition buttons
- GIVEN a `CnDetailPage` mounted with `register`, `schema`, `objectId` and no `lifecycleActions`
- WHEN the page renders
- THEN no `CnLifecycleActions` instance is mounted

#### Scenario: declaring the config mounts CnLifecycleActions with the page object
- GIVEN a `CnDetailPage` with `objectId='o1'`, a loaded object `{ status: 'open' }`, and `lifecycleActions={ field: 'status' }`
- WHEN the page renders
- THEN a `CnLifecycleActions` instance is mounted
- AND it receives `objectId='o1'`, the loaded object, and the config `{ field: 'status' }`

### Requirement: REQ-MDLA-2 — CnLifecycleActions SHALL derive allowed transitions from OpenRegister

`CnLifecycleActions` SHALL, when the config is `{ field: '<name>' }` (no
explicit `transitions`), GET
`/apps/openregister/api/objects/{id}/available-actions` and render one
button per returned action, using the action's `description` as the label
when present and a title-cased action name otherwise.

#### Scenario: server-derived buttons
- GIVEN `CnLifecycleActions` with `objectId='shift-1'` and config `{ field: 'status' }`
- AND `/available-actions` returns `{ actions: [{ action: 'close', to: 'closed' }, { action: 'void', to: 'voided', description: 'Void shift' }] }`
- WHEN the component mounts
- THEN it requests `/apps/openregister/api/objects/shift-1/available-actions`
- AND renders two buttons labelled `Close` and `Void shift`

#### Scenario: no allowed actions renders nothing
- GIVEN `/available-actions` returns `{ actions: [] }`
- WHEN the component mounts
- THEN no transition buttons (and no wrapper) are rendered

### Requirement: REQ-MDLA-3 — an explicit `transitions` array SHALL be filtered by current state

`CnLifecycleActions` SHALL, when the config carries an explicit
`transitions: [{ from, to, action, label, confirm?, variant? }]` array,
render only the transitions whose `from` includes the object's current
lifecycle value (a missing `from` means "any state") and SHALL NOT call
`/available-actions`.

#### Scenario: config-declared transitions filtered by status
- GIVEN an object `{ status: 'open' }` and config with transitions `[{ from: 'open', to: 'closed', action: 'close', label: 'Close shift' }, { from: 'closed', to: 'archived', action: 'archive' }]`
- WHEN the component renders
- THEN only the `close` button (labelled `Close shift`) is rendered
- AND no request to `/available-actions` is made

### Requirement: REQ-MDLA-4 — clicking a transition SHALL POST it and reload the object

Clicking a transition button SHALL POST `{ action }` to
`/apps/openregister/api/objects/{id}/transition`, emit `transitioned`
`{ action, to, object }` and `reload` on success, and (in server-derived
mode) re-fetch the available actions. The hosting `CnDetailPage` SHALL
re-fetch the object on `reload` so the new state renders.

#### Scenario: applying a transition
- GIVEN a rendered `close` button on `CnLifecycleActions` for `objectId='shift-1'`
- WHEN the button is clicked AND `/transition` resolves with the updated object
- THEN a POST is sent to `/apps/openregister/api/objects/shift-1/transition` with body `{ action: 'close' }`
- AND `transitioned` is emitted with `{ action: 'close', to: 'closed', object }`
- AND `reload` is emitted

#### Scenario: detail page re-fetches on reload
- GIVEN a `CnDetailPage` in schema-driven mode hosting `CnLifecycleActions`
- WHEN the child emits `reload`
- THEN the page calls `objectStore.fetchObject(type, objectId)` again

### Requirement: REQ-MDLA-5 — a rejected transition SHALL surface the server message

`CnLifecycleActions` SHALL, when `/transition` returns a 403/422 with
`{ error: '<reason>' }`, display `<reason>` inline and SHALL NOT emit
`reload`.

#### Scenario: rejected transition shows the reason
- GIVEN a `close` button and `/transition` rejecting with status 422 and `{ error: 'Cannot close: open balance.' }`
- WHEN the button is clicked
- THEN the inline error reads `Cannot close: open balance.`
- AND `reload` is NOT emitted

