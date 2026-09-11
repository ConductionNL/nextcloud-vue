# Tasks: manifest-run-node-action

**BLOCKED on `or-flow-run-node` (openregister): its RN-1 authorization
decision has not been made, and this repo's `run-node` action has no server
to call until that endpoint exists.** No task below is started.

- [ ] 1. `app-manifest-v2.schema.json`: add `run-node` to the header/row action
  `type` enum (line ~1648); document it distinctly from the setup-wizard
  `run-action` step type in the same paragraph other types are documented in.
  - unit test: schema accepts a `run-node` action; the two `run-action` /
    `run-node` enums do not cross-validate.
- [ ] 2. `actionsDispatcher.js`: `case 'run-node'` calling
  `context.openRunNode(action)`, mirroring `open-form` (missing-context warn,
  no throw, resolves immediately).
  - unit test: dispatches to `context.openRunNode` with the action; warns and
    no-ops when `context.openRunNode` is absent.
  - mutation-check: break the `typeof context.openRunNode !== 'function'`
    guard, confirm the missing-context test reddens, restore.
- [ ] 3. Rendering-surface wiring (`CnActionButtons` or equivalent): resolve
  the node's config form via OpenRegister's describe surface, render it with
  the SAME field renderer `CnFlowSidebar` uses (no new form-rendering code),
  skip the dialog for an empty form, and POST subject+config to
  `/api/flows/{flowId}/nodes/{nodeId}/run` on submit.
  - vitest: a select-field node opens a dialog sourcing `optionsFrom`; an
    empty-form node runs with no dialog; a 403 from the endpoint toasts an
    error and does not refresh.
- [ ] 4. `npm run check:manifest` / the sentinel-token gate exits 0 — confirms
  no `@pick:`-shaped string was introduced anywhere.
- [ ] 5. `@spec openspec/changes/manifest-run-node-action/specs/manifest-run-node-action/spec.md`
  on every changed method.
