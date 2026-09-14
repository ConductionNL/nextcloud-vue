## Context

Verified against `nextcloud-vue` `development` @ `101243b` (2026-09-11):

- `dispatchAction` (`src/utils/actionsDispatcher.js`) is a pure synchronous
  switch — every `case` either does its work inline (`object-op`, `api-call`,
  `agent`, all of which return a Promise of the CALL's outcome, not of any
  human decision) or delegates to a `context.openXxx` function and returns
  immediately (`open-modal`, `export`, `open-form`). No case currently blocks
  dispatch on user input; the ones that open UI (`open-modal`, `export`,
  `open-form`) hand off to the rendering surface and are done.
- `sentinelTokens.js` is a closed, mirrored-into-schema vocabulary; a unit
  test (referenced in its own docblock) asserts the JS pattern strings and the
  JSON Schema `$defs` patterns are byte-identical. Adding a member is not a
  small edit — it is a coordinated change across the module, the schema, and
  that test, and every member so far resolves synchronously.
- The manifest action `type` enum (`app-manifest-v2.schema.json:1648`) already
  has 11 members; `run-action` is taken by the UNRELATED setup-wizard step
  `type` enum at line 76.
- OpenRegister's `IFlowNodeConfigForm` (existing) gives a field vocabulary —
  `key/label/type/help/required/optionsFrom` — that `CnFlowSidebar` (this
  repo) already renders for the flow editor. Reusing that renderer for a
  standalone dialog is the same shape as reusing `CnAdvancedFormDialog` for
  `open-form`'s schema-driven create.

## Decisions

### RN-4 — `run-node` follows the `open-form` shape, not a new async-token shape

Considered and rejected: making `dispatchAction` itself `await` a UI
interaction before resolving (i.e., `case 'run-node'` opens a dialog and its
Promise does not resolve until the user submits or cancels). Rejected because
every OTHER caller of `dispatchAction` (`CnActionButtons`, row actions,
`CnWidgetObjectTable`) treats the returned Promise as "the call happened",
using it to drive refresh/toast timing (see `api-call` / `agent`'s own
docblocks). Making one case's Promise mean "the human decided" instead would
be a silent contract change for every consumer that doesn't specifically know
to treat `run-node` differently. Matching `open-form` (fire the dialog, return
immediately, let the dialog's OWN submit handler make the follow-up call) is
free of that hazard because it is the existing precedent, not a new one.

### RN-5 — `run-node` is a real action type, not a "picker" variant of `api-call`

Considered and rejected: keep `type: "api-call"` and add a generic
`pickBefore` field that opens a dialog before any api-call. Rejected because
`api-call`'s whole contract (URL + payload token-interpolation) is unrelated
to "does this call need a config dialog first" — bolting it onto `api-call`
would make EVERY api-call author reason about a field that only ever applies
to flow-node calls, and `api-call`'s URL is caller-authored/arbitrary while
`run-node`'s target (`/api/flows/{flowId}/nodes/{nodeId}/run`) is fully
determined by `flowId`/`nodeId` — there is no URL to author. A distinct type
keeps each contract legible on its own.

### Naming — `run-node` (not `run-flow-node`, not `flow-run`)

Short, and paired with the already-established manifest vocabulary
(`object-op`, `open-form`, `api-call` are all similarly terse). No collision
found in either action-type enum.

## Nothing here is a blocked decision

Unlike the OpenRegister proposal's RN-1 (authorization), everything above is
an engineering choice with a clear existing precedent to follow, not a new
product surface. This proposal can be implemented once `or-flow-run-node`'s
RN-1 is resolved and its endpoint exists — this repo has no open question of
its own gating implementation.
