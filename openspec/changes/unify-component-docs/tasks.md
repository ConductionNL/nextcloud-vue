# Tasks: Unify component documentation

## Phase 0 — Unblock root (already in flight)

- [x] Land [#135](https://github.com/ConductionNL/nextcloud-vue/pull/135) — `baseUrl: '/'`, custom-domain `url`, function-form `editUrl`, two pre-existing MDX-3 brace bugs fixed.
- [x] Land [#134](https://github.com/ConductionNL/nextcloud-vue/pull/134) — forward-merge `feature/styleguide-component-fixes` → `development` (then development → beta as a follow-up). Keeps source branch as backup.
- [ ] Once both lands on `beta`, verify https://nextcloud-vue.conduction.nl/ renders and `/beta/styleguide/` is preserved.

## Phase 1 — Autodoc infrastructure (CnDataTable as proving ground)

- [ ] `cd docusaurus && npm install --save-dev vue-docgen-cli` — pin to a version compatible with Vue 2 SFCs. Add to docusaurus's `package.json` only; library root stays clean (per `docs-site-infrastructure` Requirement: Docusaurus Project Structure).
- [ ] Write `docusaurus/docgen.config.js` — points at `../src/components/Cn*/Cn*.vue` glob, output dir `../docs/components/_generated/`, custom templates that emit Docusaurus-safe markdown (escape `\{...\}` braces; suppress empty sections; stable header for drift detection).
- [ ] Add `npm run prebuild:docs` to `docusaurus/package.json`. Wire as a `prebuild` hook so `npm run build` runs it automatically.
- [ ] Generate partial for `CnDataTable` only. Commit `docs/components/_generated/CnDataTable.md`.
- [ ] Update `docs/components/cn-data-table.md` to import + render the partial via MDX. Keep the existing hand-written prose at the top.
- [ ] Verify build still passes locally (`npm run build` for both en + nl).
- [ ] Extend [scripts/check-docs.js](../../../scripts/check-docs.js) to verify each Cn* component has a corresponding `_generated/<name>.md` partial and that it's fresh (no diff after running prebuild).
- [ ] Add a CI step in `Frontend Quality` workflow: `cd docusaurus && npm run prebuild:docs && git diff --exit-code docs/components/_generated/` — fails the build if a SFC change wasn't accompanied by a regenerated partial.

## Phase 2 — Playground MDX component

- [ ] Add `docusaurus/src/components/Playground.tsx` — props: `component: string`, `path?: string` (defaults to `#!/{component}`), `height?: string`. Renders an iframe pointing at `/styleguide${path}`.
- [ ] Auto-resize via `window.postMessage` listener: the Styleguidist build emits its content height; the parent React component sets the iframe's `style.height`. Requires a small patch to Styleguidist's `setup.js` to post the message — track separately if upstream patching is awkward.
- [ ] Include an "Open standalone" link below the iframe (target=_blank to `/styleguide${path}`).
- [ ] Theme the Styleguidist build to load `nextcloud-tokens.css` from the library so visual density matches the parent Docusaurus page. (Spike: if the visual gap is small, defer.)
- [ ] Use the Playground in `cn-data-table.md` as the first real consumer. Verify in `npm start` (dev) and `npm run build` (production iframe URL).

## Phase 2.5 — JSDoc completeness ratchet (the "auto-update" guarantee)

The unification's core promise is **components update → docs update automatically**. That requires more than just generating a partial: the JSDoc on each SFC has to be rich enough that the generated partial is actually useful. This phase builds the CI machinery that makes the discipline self-perpetuating, so Phase 3 doesn't degenerate into "pretty pages with thin auto-gen tables that everyone ignores."

See `specs/component-reference/spec.md` "Requirement: JSDoc completeness ratchet" for the full requirement set (G1 freshness, G2 completeness, G3 discoverability).

### G1 — Freshness check (cheapest, lands first)

- [ ] Add `Frontend Quality` CI step: `cd docusaurus && npm run prebuild:docs && git diff --exit-code docs/components/_generated/`. Any PR that touches a `Cn*.vue` without committing the regenerated partial fails.
- [ ] Document the failure-resolution recipe in CONTRIBUTING.md: "If this fails, run `cd docusaurus && npm run prebuild:docs` and commit the diff."

### G2 — Completeness ratchet

- [ ] Write `scripts/check-jsdoc.js`. Reuse `vue-docgen-api` (already a transitive dep via `vue-docgen-cli`). For each `src/components/Cn*/Cn*.vue`:
  - Walk every prop. Score 1 if the parsed prop has a `description` AND a `type` (either inferred or `@type`-tagged).
  - Walk every event from the parsed doc + the template `$emit` calls. Score 1 if there's an `@event` JSDoc with a description AND `@type` for the payload (or marked as no-payload).
  - Walk every named slot in the template. Score 1 if there's a `@slot` block with a description; for scoped slots, additionally score each `@binding`.
  - Emit a per-component object: `{ component, score, missing: [{kind, name, line}] }`.
- [ ] Add `scripts/.jsdoc-baselines.json` — keyed by component name, value is the current score (so the script compiles its own initial baseline at first run).
- [ ] Add `npm run jsdoc-baselines:update` (lib root) — regenerates the baseline file. Authors run this when they intentionally improve coverage.
- [ ] Add `Frontend Quality` CI step that runs `node scripts/check-jsdoc.js` and fails if any component's score is below its baseline OR if any new component (no baseline entry) scores below 100%.
- [ ] Failure message MUST cite component name, missing items, and SFC line numbers (actionable jumps).

### G3 — Discoverability

- [ ] Update `CLAUDE.md` with a "Documenting components" section showing the three canonical JSDoc shapes:
  ```vue
  /** Description text. @type {Array<MenuItem>} */
  fields: { type: Array, default: () => [] },

  /**
   * @event sort Emitted when a sortable column header is clicked.
   * @type {{ key: string|null, order: 'asc'|'desc'|null }}
   */
  this.$emit('sort', { key: newKey, order })

  <!-- @slot row-actions Per-row action menu cell. -->
  <!-- @binding {object} row The row data for this row. -->
  <slot name="row-actions" :row="row" />
  ```
- [ ] Write `scripts/new-component.js` — scaffolds a fresh `Cn*` directory with `Cn*.vue`, `Cn*.md`, and `index.js`. The SFC includes prop / event / slot JSDoc placeholders so a new component starts at 100% completeness.
- [ ] Add `npm run new-component <Name>` to the lib root.

### G3.5 — Auto-regeneration on commit (convenience layer)

- [ ] Add `husky` or `simple-git-hooks` as a devdep in the lib root.
- [ ] Pre-commit hook: when staged files include `src/components/Cn*/Cn*.vue`, run `cd docusaurus && npm run prebuild:docs` and `git add docs/components/_generated/`. Idempotent — running prebuild:docs manually first is a no-op.
- [ ] Skip the hook in CI (it's redundant there; CI enforces via diff-check).

### Acceptance

- [ ] A developer adds a prop to `CnDataTable.vue` without JSDoc → CI fails with a line-numbered message → they add a `/** description */` → CI passes.
- [ ] A developer adds a brand-new `Cn*` component → CI requires 100% JSDoc score on the new component to pass.
- [ ] A developer who's never seen the convention runs `npm run new-component CnFoo` and gets a working scaffold that scores 100%.
- [ ] Improving JSDoc on existing components is one PR per component (or batch by category) bumping baselines incrementally — no cliff.

## Phase 3 — Per-component content port

For each existing Cn* component page (~32), in order of category complexity:

- [ ] **Layout & Pages** (7): CnIndexPage, CnIndexSidebar, CnPageHeader, CnActionsBar, CnDetailPage, CnDetailCard, CnObjectSidebar.
- [ ] **Data Display** (10): CnDataTable, CnCellRenderer, CnObjectCard, CnCardGrid, CnStatusBadge, CnKpiGrid, CnStatsBlock, CnTimelineStages, CnNotesCard, CnTasksCard.
- [ ] **Data Actions** (6): CnFilterBar, CnPagination, CnRowActions, CnMassActionBar, CnFacetSidebar, CnUserActionMenu.
- [ ] **Dialogs** (8): CnDeleteDialog, CnCopyDialog, CnFormDialog, CnAdvancedFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog.
- [ ] **Dashboard** (6): CnDashboardPage, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget, CnChartWidget.
- [ ] **Settings** (5): CnSettingsCard, CnSettingsSection, CnConfigurationCard, CnVersionInfoCard, CnRegisterMapping.
- [ ] **UI Elements** (2): CnIcon, registerIcons.

For each component:
1. Confirm SFC has up-to-date JSDoc on props / events / slots; backfill if thin.
2. Run `npm run prebuild:docs` and commit the generated partial.
3. Update the existing `<name>.md` to: keep narrative on top, add `<Playground component="X" />`, add `<GeneratedRef />`. Remove now-redundant hand-maintained prop/event/slot tables.
4. Verify build green.

Can be split into sub-PRs by category, each PR self-contained (one category's components).

## Phase 4 — Port styleguide-only content

- [ ] Create `docs/design-tokens/index.md` — landing.
- [ ] Port `styleguide/nextcloud-tokens.md` content to `docs/design-tokens/colors.md` / `spacing.md` / `typography.md` (split as fits).
- [ ] Port `styleguide/nextcloud-animations.css` reference to `docs/design-tokens/animations.md` with code examples.
- [ ] Port `styleguide/nextcloud-globals.css` reference to `docs/design-tokens/globals.md`.
- [ ] Port `styleguide/Introduction.md` content into `docs/getting-started.md` (merge or supersede — review for staleness).

## Phase 5 — Sidebar IA + redirects

- [ ] Restructure `docusaurus/sidebars.js` — top-level groups: Getting Started, Architecture, Building Apps, Components, Composables, Utilities, Design Tokens.
- [ ] Add `@docusaurus/plugin-client-redirects` to `docusaurus.config.js`. Map old `/beta/styleguide/#!/<X>` → `/docs/components/<x>` and any other historical paths.
- [ ] Update navbar to drop any explicit "Styleguide" link (it's now embedded; `/styleguide/` stays as an unlinked URL for power users).
- [ ] Add a small "View standalone playground" link in the components index page header that goes to `/styleguide/`.

## Phase 6 — Spec ratification

- [ ] Land all phases.
- [ ] Run `openspec archive unify-component-docs` to merge deltas into the canonical `specs/docs-site-infrastructure/spec.md` and `specs/component-reference/spec.md`.

## Pre-existing issues parked (track elsewhere, not in this change)

- `Frontend Quality` workflow fails on every PR to `beta` because `package-lock.json` is out of sync (missing `pinia@3.0.4` and friends). Needs a one-time `npm install` + commit on `development`.
- `development` branch is **behind** `beta`, so the standard `feature → development → beta` flow is currently blocked. Requires bringing `development` up to `beta` (or rebasing dev on beta) before regular feature work can land.
- Pre-existing broken doc link: `store/plugins/logs` → `utilities/prefix-url.md`. Non-fatal warn; clean up during Phase 3 store category.
