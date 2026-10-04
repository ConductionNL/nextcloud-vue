# Lane log — ncv (nextcloud-vue)

## Session notes

- 2026-09-25/26: two "machine crash" / rate-limit resume notices arrived
  mid-session. Checked disk state each time per LANE-RULES: branch
  `fix/slugify-ref-relation-resolver`, 0 commits ahead, nothing pushed,
  15 dirty files matching exactly the in-progress work described below.
  No data lost, no corruption — proceeding.

## Change 1: slugify-ref-relation-resolver

**Branch**: `fix/slugify-ref-relation-resolver` (cut from `origin/development`).
**PR**: https://github.com/ConductionNL/nextcloud-vue/pull/1263
**Status**: DONE — committed (`a87ea6eed`), pushed, PR open, `opsx-verify`
run headless → **PASS** (verdict recorded in the PR body). Not merged, not
archived (left for after merge per this repo's usual flow).

**What**: `src/utils/schemaRefSlug.js` (new helper) + three call sites routed
through it — `src/utils/schema.js` (`normalizeRef`), `CnObjectDataWidget.vue`
(`relationProp`), `src/utils/actionsDispatcher.js` (`resolveObjectOpType`).
Fixes learniq round-1 defect 7 (multi-word `$ref` schema titles 404 against
OpenRegister's kebab-case slug; `ReportCardDetail` rendered with every
relation panel blank because of it).

**OpenSpec**: `openspec/changes/slugify-ref-relation-resolver/` — new
capability `schema-ref-resolution` (REQ-SRR-1..4). `openspec validate
slugify-ref-relation-resolver --strict` → valid.

**Diff-scoped verification (all green)**:
- `npx jest tests/utils/schemaRefSlug.spec.js tests/utils/schema.spec.js tests/utils/actionsDispatcher.spec.js tests/components/CnObjectDataWidgetRelationSlug.spec.js tests/components/CnFormDialogSemanticReference.spec.js tests/components/CnFormDialogReference.spec.js tests/components/CnFormDialogRelationFilter.spec.js tests/components/CnFormDialogPrefill.spec.js tests/components/CnFormDialogDynamicFields.spec.js tests/utils/dynamicProperties.spec.js` → all passed.
- `npx eslint` on every touched/new file → clean.
- Two pre-existing `schema.spec.js` assertions and one `CnFormDialogRelationFilter.spec.js`
  fixture encoded the OLD (buggy) pass-through behaviour; updated to the
  corrected slug output (documented in the proposal and tasks.md).

**Full pre-push verification (all via `with-slot.sh`, exit 0)**:
- `npm test` (full suite): 803/803 suites, 9923/9923 tests passed.
  First run caught a THIRD pre-existing fixture with the same bug
  (`tests/components/CnStagesWidget.spec.js` asserted a dossiq
  `stagesSource: { schema: 'statusType' }` config fetched
  `/objects/dossiq/statusType` — now correctly `/objects/dossiq/status-type`;
  fixed and reran green). This is real production-shaped evidence the
  `resolveObjectOpType()` fix (REQ-SRR-4) matters beyond the `$ref` path.
- `npm run build`: succeeded, `dist/esm` + `dist/nextcloud-vue.cjs.js` built.
- `npm run lint` (full tree): exit 0, one pre-existing unrelated warning
  (see Inherited below).

**Not run**: `check:jsdoc` — requires `docusaurus/node_modules`
(`vue-docgen-api`), not installed in this rsynced lane; not part of `npm run
lint` or this repo's `package.json` `test`/`build` scripts, so not one of
this lane's three required gates. `check:docs` (not required either) was
run manually as extra diligence and is green.

**Inherited**: none touched. One pre-existing unrelated ESLint warning in
`src/components/CnMapWidget/CnMapWidget.vue:125` (`jsdoc/reject-any-type`)
surfaced in the full lint run — not on a line this change touches.

**dossiq note**: proposal.md flags that dossiq's register very likely uses
the same PascalCase title dialect and is hit the same way — not verified,
not blocking, called out for a follow-up check.

## Change 2: guardian-portal-surface-pattern

**Branch**: `feat/guardian-portal-surface-pattern` (cut from `origin/development`
directly, not stacked on change 1 — the two are independent). Was briefly
built on change 1's branch by mistake before its own commit; split cleanly
before either change was committed (verified with `git status`/`git diff`
that no change-1 file carried a change-2 edit and vice versa).
**PR**: https://github.com/ConductionNL/nextcloud-vue/pull/1264
**Status**: DONE — committed (`126e44771`), pushed, PR open, `opsx-verify`
run headless → **PASS** (verdict recorded in the PR body). Not merged, not
archived.

**What**: `src/components/CnGuardianHome/` — a layout-only guardian/parent
portal shell (children switcher via `NcCheckboxRadioSwitch` radiogroup,
feed/agenda/consent sections via `CnTabs`/`CnTab`, a "report absence"
`NcButton`, an `NcEmptyContent` no-children state). No new dependency;
`activeChildId` is `v-model`-bindable and self-defaults to the first child.
Barrel exports added to `src/components/index.js` + `src/index.js`, docs at
`docs/components/cn-guardian-home.md`.

**OpenSpec**: `openspec/changes/guardian-portal-surface-pattern/` — new
capability `guardian-portal-surface` (REQ-GPS-1..6). `openspec validate
guardian-portal-surface-pattern --strict` → valid.

**Verification (all via `with-slot.sh` for the full-tree commands, exit 0)**:
- `npx eslint` on every touched/new file → clean.
- `npx jest tests/components/CnGuardianHome.spec.js` → 12/12 passed.
- `node scripts/check-docs.js` → all 271 component docs (incl. this one)
  cover their props and slots.
- `npm run lint` (full tree): exit 0, same one pre-existing unrelated warning
  as change 1 (`CnMapWidget.vue:125`).
- `npm test` (full suite): 801/801 suites, 9902/9902 tests passed (801 = 803
  from change 1's branch minus its 2 extra new spec files, plus this
  change's 1 new spec file — consistent with the two branches' independent
  diffs).
- `npm run build`: succeeded.

**A caution for anyone resuming this lane**: mid-session, `nohup <cmd> &`
launched directly in a Bash tool call proved UNRELIABLE for the long
`npm test`/`npm run build` runs — the log files ended up with stale,
wrong-project content (`vitest`/`vite`/`webpack` output, not this repo's
`jest`/`rollup`) even though `npm run lint` launched the same way worked
fine. Root cause not fully pinned down (suspected: the sandbox does not
keep a plain shell-backgrounded job alive/attached to its own file
descriptors past the tool call's own return, unlike a job started with the
Bash tool's own `run_in_background: true`). Fix: always use the tool's
`run_in_background: true` parameter for anything long-running, never raw
`nohup ... &`, and print `pwd -P` as the first line of the command so a
misdirected run is obvious immediately rather than discovered later.

**Not run**: `check:jsdoc` (requires `docusaurus/node_modules`, not
installed in this lane; not one of the three required gates). JSDoc is
written by hand to 100% coverage on every prop/event/slot as a best-effort
substitute.

**Inherited**: none touched (same one pre-existing `CnMapWidget.vue`
warning as change 1).

## CI fix pass (2026-09-26, per CI-READ-2026-09-26.md)

**#1263**: CI flagged a real, reproducible `Playwright (e2e)` failure —
`stages-widget.e2e.js:315` "the status tile renders its label and colour as
a badge". Reproduced locally first (`with-slot.sh npx playwright test
e2e/stages-widget.e2e.js --project=chromium`, confirmed red). Root cause: a
FOURTH real production-shaped instance of defect 7 — the status badge
tile's `resolve.schema` is authored `'statusType'` in
`e2e/harness/StagesHarness.vue` (mirroring a real manifest), and
`resolveObjectOpType()` now correctly slugifies that to `status-type`
before the objects-API call; the Playwright `page.route()` stub in
`stubStatus()` still matched the old raw `statusType` path and silently
stopped intercepting, so the badge never resolved. Fixed the route pattern
to `status-type` (did NOT touch the harness's realistic `statusType`
config — that PascalCase shape is exactly what this change exists to make
work). `npx eslint e2e/stages-widget.e2e.js` clean;
`npx playwright test e2e/stages-widget.e2e.js --project=chromium` (via
`with-slot.sh`) → 11/11 passed, both badge tests included. Committed
(`d03b6898a`), pushed, PR body updated with the full root-cause writeup.
The CI read also named a second failure in this suite,
`flow-ports-and-lines.e2e.js:364`, explicitly as flaky (failed once, passed
on retry) — left untouched per instructions (not a real regression, not
counted).

**#1264**: checked `gh pr checks 1264` against the same CI read — every
check `pass`, nothing new to fix. The PHP/Nextcloud-matrix/Hydra-gates
entries show `skipping`, expected for a pure-JS library PR.
