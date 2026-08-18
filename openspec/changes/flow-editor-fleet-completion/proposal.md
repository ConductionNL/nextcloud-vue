# Flow editor fleet completion — release, lockfile bumps, hermiq parity

## Why

The flow-editor consolidation (PR #675, merged to `development` 2026-08-19)
gave the shared editor its toolbar (Save / Run / Check / arrange / zoom), a
seeded manual-trigger start node on `/flows/new`, a tabbed sidebar with a
searchable role-aware palette, dialect-safe edge rendering, and the
`CnIndexPage` `#header-actions` slot that had been documented but never
rendered. openregister, openconnector and openbuild adopted it the same
night — with deliberate transition shims, because the apps' CI installs
`@conduction/nextcloud-vue` from npm, which still serves 2.3.x.

Three pieces of work remain, and this change is their single record. None of
them is optional: until task 1 lands, every consuming app runs the OLD
editor in production builds; until task 3 lands, hermiq runs a 7,000-line
bespoke editor over the same backend the shared one serves.

## What changes

### 1. Release the library (human gate: `development` → `beta`)

Merging `development` into `beta` triggers `release.yml` (semantic-release,
npm Trusted Publisher). Verify the TAG MOVED and the npm dist-tag carries the
new version — a green Release run that publishes nothing has happened before.

### 2. Bump the fleet's lockfiles, remove the transition shims

Per app (openregister, openconnector, openbuild, hermiq): bump
`@conduction/nextcloud-vue` past 2.4, `npm install`, commit BOTH package.json
and the lockfile. Then remove the shims, which are marked in place:

- `FlowsIndex.vue` (openregister + openconnector): the "New flow" button sits
  in `#actions` because 2.3.x never rendered `#header-actions`; either keep
  `#actions` deliberately or move to `#header-actions` — one fleet-wide
  answer, not per app.
- `FlowDetailSidebar.vue` (both): the save/run handlers marked "Transition
  wiring" become dead code after the bump — delete them.
- e2e: the `NEW_EDITOR` feature-detection in `flow-controls.spec.ts`,
  `flow-engine.spec.ts` (openregister) and `flows-editor.spec.ts`
  (openconnector) starts returning true everywhere; collapse the dual paths
  to the toolbar path and drop the skips.
- hermiq's flow list: its "New flow" `#header-actions` button — which has
  been shipping into the void — starts rendering on the bump with no code
  change.

### 3. hermiq consumes the shared editor (the parity port)

hermiq stays on its bespoke `FlowBuilder.vue` (2,613 lines) + `FlowSidebar.vue`
(1,464) + `flowEditor.js` (1,790) until the shared editor carries what its
live hydra flows depend on. Switching before that regresses production
tooling (hydra dispatch/sequencer/reaper run on schedule from these flows).
The port order, highest value per unit of risk — the full porting inventory
with file:line anchors is in this change's `design.md`:

1. **Store**: `flowDocument` write-normalisation (collapse endpoint lists,
   strip edge `type`/`config` — the engine refuses pre-inversion documents),
   run-replay state, `flowBranches.js` moved across intact (pure module).
2. **CnFlowDetail**: connection ports (`in`/`out:<branch>`/loop body ports),
   branch arithmetic + orphaned-branch edges (never auto-deleted), edge label
   chips with draggable `labelT`, per-edge drawing style, context menu +
   keyboard parity (copy/paste/delete/Enter), run-replay overlay, annotations
   (sticky notes — never lowered into `flow.nodes`).
3. **CnFlowSidebar**: lazy per-run detail with per-step payload fold-outs,
   Refresh, the four distinct Runs empty states.
4. **Dialogs**: NodeEditModal (minus the hermiq agent pane — a typed config
   pane stays blocked on the catalogue publishing a config schema),
   PayloadModal, ConnectionEditModal, RunLogModal, RunFlowDialog (subject
   optional), DeadEndWarningDialog.
5. **Switch hermiq**: manifest routes `/flows/:id` (+ legacy `/graphs`
   aliases) to the shared components; delete the bespoke editor and
   `useFlowEditorStore`; keep `roleOfNodeType`-style role decisions — never
   graph position.

Do NOT port: `loadAgents`/`agentOptions`, the `hermiq.agent-step` typed pane,
the hard-coded `FLOW_APP`, the `TERMINAL/LOOP/ROUTER_STEP_TYPES` lists except
as documented fallbacks behind catalogue fields, the duplicate `save()` in
FlowSidebar, the dead `activeTab = 'step'` watcher.

## Impact

- Affected: nextcloud-vue (editor components/store), openregister,
  openconnector, openbuild, hermiq (lockfiles + shim removal; hermiq also the
  port target).
- ADR-096 (dashboards land, CnIndexPage everywhere else) and ADR-065 (one
  flow engine) govern; the deprecated `CnFlowIndexPage` is removed one major
  after the fleet's lists have migrated.
