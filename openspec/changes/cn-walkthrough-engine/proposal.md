# cn-walkthrough-engine — abstract, manifest-driven product walkthrough

## Why

A new user in an empty Conduction app sees a working shell but has no idea what
journey to follow. We already made *configuration* declarative + gating with the
first-time setup wizard (ADR-042). The walkthrough is its sibling: after the shell
is live, teach the user how to *use* the app by spotlighting real UI elements and
asking them to perform real actions against their (empty) environment — for
pipelinq: product → contact → lead → pipeline → quote → contract → bill in
shillinq.

Every app should get this from `@conduction/nextcloud-vue` as manifest data, not
bespoke code (procest/launchpad each rolled their own onboarding). This change
delivers the **abstract engine**: the manifest `walkthrough` block, the
`CnWalkthrough` spotlight component, the `useWalkthrough` composable, CnAppRoot
auto-start + a restart entry, and the versioning that surfaces only *new* steps on
an upgrade. See hydra ADR-043.

The OpenBuild visual editor (change 2) and the concrete pipelinq journey tour
(change 3) build on this contract.

## What changes

1. **Manifest `walkthrough` block (v2 schema)** — new optional top-level object
   `{ enabled, version, completionConfigKey, tours[] }`; each tour
   `{ id, title, trigger, minAppVersion, steps[] }`; each step
   `{ id, title, body, task?, sinceVersion, target, placement, advanceOn,
   capture?, optional?, allowManualNext? }`. Defined identically in
   `src/schemas/app-manifest-v2.schema.json` and the canonical
   `hydra/scripts/schemas/app-manifest-v2.schema.json`. `additionalProperties:false`
   throughout; closed enums for `trigger`, `target.kind`, `advanceOn.type`,
   `placement`.

2. **New component `CnWalkthrough`** (`src/components/CnWalkthrough/`) — full-viewport
   gray dimmer with an SVG-mask/`clip-path` cutout around the active target's
   bounding rect (the real element stays interactive in place — never z-index
   promotion); an auto-positioned coachmark card (title, body, optional task line,
   step counter, Skip/Back/Next); scroll-into-view + recompute on scroll/resize/route
   change; focus trap, ESC to dismiss, `aria-live` step announcements; modal-aware
   layering (cutout retargets inside an open `NcModal`/`NcDialog`).

3. **New composable `useWalkthrough(appId, manifest)`** (`src/composables/`) —
   loads `manifest.walkthrough`; composes the active tour **by version** (new
   install → full tour; upgrade vX→vY → only steps with `sinceVersion` in
   `(vX, vY]`); installs `advanceOn` watchers (vue-router guard, `MutationObserver`,
   OR object-store subscription); owns the **context bag** (capture route params /
   created object ids, `{{var}}` interpolation into later steps); persists per-tour
   progress + completion (resume after refresh / cross-app hand-off).

4. **CnAppRoot integration** — after the setup phase clears, auto-start a
   `first-visit` / `version-bump` tour as a **non-gating** overlay (shell renders
   underneath). New `#walkthrough` slot to override. A "Replay walkthrough"
   personal-settings/menu entry lists tours and restarts the chosen one.

5. **Targeting convention** — `data-walkthrough-id` attribute (falling back to the
   `data-testid` journeydoc/ADR-030 already adds) resolves `target.kind: element`;
   `nav-item`/`widget`/`action`/`page` resolve from stable manifest identifiers;
   `selector` is the raw-CSS last resort.

6. **Cross-app hand-off primitive** — a step may deep-link to another Conduction
   app with a resume token; progress lives in per-user app-config under a tour id
   both apps read (the mechanism pipelinq→shillinq uses in change 3).

7. **i18n / docs / tests / baselines** — tour copy is translation keys; docs page
   `docs/components/cn-walkthrough.md` + `docs/utilities/composables/use-walkthrough.md`;
   jest specs for the composable (version composition, advance watchers, capture +
   interpolation) and the component (cutout geometry, coachmark placement, a11y,
   manual-Next escape hatch); JSDoc baselines at 100% for the new component.

## Non-goals

- The OpenBuild visual tour editor — change 2 (`openbuild-walkthrough-editor`).
- Any concrete app tour content — change 3 (`pipelinq-getting-started-tour`).
- Fleet rollout — apps adopt `walkthrough` blocks per-app afterwards.
- Replacing journeydoc (ADR-030) — they are complementary and share
  `data-testid` instrumentation.

## Consumer impact

Backward compatible: `walkthrough` is optional; apps without it are unchanged.
CnAppRoot only mounts CnWalkthrough when `manifest.walkthrough.enabled` and a tour
qualifies for the current user/version. Affects all 5 consumer apps as an opt-in.
