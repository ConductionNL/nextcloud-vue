# Tasks — flow editor fleet completion

## 1. Release (human gate)

- [ ] 1.1 Merge nextcloud-vue `development` → `beta` (human approval — this is
      the fleet's promotion gate and is deliberately not automated).
- [ ] 1.2 Verify the release actually published: the git tag moved AND
      `npm view @conduction/nextcloud-vue dist-tags` carries the new version.
      A green Release run that publishes nothing has happened before.

## 2. Lockfile bumps + shim removal (one PR per app)

- [ ] 2.1 openregister: bump `@conduction/nextcloud-vue` ≥ 2.4 (package.json +
      lockfile), delete FlowDetailSidebar's transition save/run handlers,
      collapse `flow-controls.spec.ts` / `flow-engine.spec.ts` to the toolbar
      path and drop the `NEW_EDITOR` gates.
- [ ] 2.2 openconnector: same bump; same shim removal in FlowDetailSidebar and
      `flows-editor.spec.ts`.
- [ ] 2.3 openbuild: bump only (its picker + modal are version-agnostic).
- [ ] 2.4 hermiq: bump only — verifies its flow list's "New flow" button
      renders (the `#header-actions` slot fix reaches it with no code change).
- [ ] 2.5 Fleet decision: `#actions` or `#header-actions` for index-page
      create buttons — one answer, applied to both flow lists.

## 3. hermiq parity port (order = value per unit of risk)

- [ ] 3.1 Store: `flowDocument` write-normalisation (endpoint-list collapse,
      edge `type`/`config` strip), run-replay state, `flowBranches.js` moved
      across intact.
- [ ] 3.2 CnFlowDetail: ports (in / out:<branch> / loop body), branch
      arithmetic + orphaned-branch edges, edge label chips (`labelT`),
      per-edge drawing style, context menu + keyboard parity, run-replay
      overlay, annotations.
- [ ] 3.3 CnFlowSidebar: lazy per-run detail + per-step payload fold-outs,
      Refresh, the four Runs empty states.
- [ ] 3.4 Dialogs: NodeEditModal (no agent pane), PayloadModal,
      ConnectionEditModal, RunLogModal, RunFlowDialog, DeadEndWarningDialog.
- [ ] 3.5 Switch hermiq's manifest routes (incl. legacy `/graphs` aliases) to
      the shared components; delete FlowBuilder/FlowSidebar/flowEditor store.
- [ ] 3.6 e2e: hermiq's flow surface on the shared components, asserting a
      hydra flow (branch ports + edge titles) renders and round-trips
      unchanged.
