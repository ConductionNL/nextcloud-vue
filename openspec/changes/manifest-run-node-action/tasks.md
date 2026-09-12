# Tasks: manifest-run-node-action

**UNBLOCKED 2026-09-12: openregister's `or-flow-run-node` merged**
(RN-1 decided by Ruben — option (c), opt-in `IFlowDirectlyInvokable` AND
object-RBAC on the subject; `flow.run` not consulted), so
`POST /api/flows/{flowId}/nodes/{nodeId}/run` and its `GET` describe sibling
exist on `development`. Implementation below.

- [x] 1. `app-manifest-v2.schema.json`: add `run-node` to the header/row action
  `type` enum (line ~1648); document it distinctly from the setup-wizard
  `run-action` step type in the same paragraph other types are documented in.
  Also added `flowId` (required), `nodeId` (required) and `subject` action
  fields, and extended `register`/`schema`/`successMessage`/`errorMessage`/
  `refresh`'s existing descriptions to cover `run-node` too, matching `agent`'s
  own defaulting.
  - unit test (`tests/utils/validateManifest.runNode.spec.js`): schema accepts
    a `run-node` action; rejects one missing `flowId` or `nodeId`; the two
    `run-action` / `run-node` enums do not cross-validate (a manifest with
    BOTH validates; each type is rejected in the other's slot).
- [x] 2. `actionsDispatcher.js`: `case 'run-node'` calling
  `context.openRunNode(action)`, mirroring `open-form` (missing-context warn,
  no throw, resolves immediately — it only OPENS the dialog/decision, never
  waits on the person, per design.md RN-4). A second, separately exported
  function, `postRunNode(action, context, config)`, makes the ACTUAL call
  once the rendering surface has a `config` (mirroring `executeAgentAction`'s
  shape: subject/register/schema token resolution defaulting to the page's
  `@objectId`/`@register`/`@schema`, fail-closed on an unresolved subject or
  a missing `flowId`/`nodeId`, toast + refresh on success, server-message
  fail-closed on a 403/other error).
  - unit tests (`tests/utils/actionsDispatcherW3.spec.js`): dispatches to
    `context.openRunNode` with the action; warns and no-ops when absent;
    `postRunNode` POSTs subject+config and toasts/refreshes; lets an explicit
    subject/register/schema override the page context; BLOCKS (with a warn)
    when a required token is unresolved or flowId/nodeId is missing;
    fail-closes with the server message on a 403 (RN-1(c)); honours
    `refresh: false`.
  - mutation-checked: the `typeof context.openRunNode !== 'function'` guard
    (removing it throws a TypeError instead of warning — confirmed) and
    `postRunNode`'s fail-closed guard (relaxing it lets an incomplete subject
    reference reach `axios.post` — confirmed).
- [x] 3. Rendering-surface wiring (`CnActionButtons`): GETs the target node's
  describe endpoint on click; a node with declared fields mounts the new
  `CnRunNodeDialog` (a small, focused field renderer for `configForm()`'s own
  vocabulary — text/textarea/number/boolean/select+optionsFrom; see that
  component's own docblock for why it is a NEW component rather than a reuse
  of `CnFlowNodeEditModal`'s heuristic, engine-config-key renderer, which
  solves a materially different problem); a node with an empty/no form runs
  immediately with no dialog. Either way `postRunNode()` makes the call. A
  failed describe call toasts and opens neither.
  - unit tests (`tests/components/CnActionButtons.spec.js`,
    `tests/dialogs/CnRunNodeDialog.spec.js`): a select-field node opens the
    dialog sourcing `optionsFrom`; an empty/absent-form node runs with no
    dialog; the dialog confirm calls `postRunNode` with the collected config
    then closes; close/cancel calls nothing; a failed describe call toasts
    and opens no dialog; required-field gating disables Run until filled;
    number-field empty-string stays empty (not coerced to 0, which would
    silently satisfy a required check).
  - mutation-checked: the "empty form runs immediately" branch (removing it
    leaves `postRunNode` never called — confirmed) and `CnRunNodeDialog`'s
    `requiredFieldsFilled` guard (hardcoding it true lets Run stay enabled
    with a required field empty — confirmed).
- [x] 4. Sentinel-token vocabulary unaffected: `tests/schemas/sentinel-token-vocabulary.spec.js`
  and `tests/utils/sentinelTokens.spec.js` both pass unmodified, and
  `grep -rn "@pick:" src/` finds nothing — no sentinel token was introduced
  anywhere, exactly as design.md required. (No `check:manifest` script exists
  in this repo under that name; the sentinel vocabulary test above is the
  actual mechanical check tasks.md meant.)
- [x] 5. `@spec openspec/changes/manifest-run-node-action/specs/manifest-run-node-action/spec.md`
  on every changed/added method (`dispatchAction`'s `run-node` case,
  `postRunNode`, `CnActionButtons`' `openRunNode`/`onRunNodeConfirm`/
  `runNodePost`/`closeRunNode`, `CnRunNodeDialog` itself).
