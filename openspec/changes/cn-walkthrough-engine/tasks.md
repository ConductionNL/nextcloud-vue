# Tasks — cn-walkthrough-engine

## 1. Manifest schema
- [x] Add the `walkthrough` block to `src/schemas/app-manifest-v2.schema.json`
      (`additionalProperties:false`; closed enums for `trigger`, `target.kind`,
      `advanceOn.type`, `placement`; unique tour + step ids).
- [x] Mirror the identical definition into `hydra/scripts/schemas/app-manifest-v2.schema.json`.
- [x] Re-vendor the schema into each consumer app's `tests/schemas/` (sync step).
- [x] Extend `validateManifest` fixtures: a well-formed walkthrough validates; an
      unknown `target.kind` / extra property fails.

## 2. CnWalkthrough component
- [x] `src/components/CnWalkthrough/CnWalkthrough.vue` — SVG-mask/clip-path dimmer
      with a rounded cutout around the target rect; pointer-events pass-through over
      the cutout; recompute on scroll/resize/route + Resize/MutationObserver.
- [x] Auto-positioned coachmark card (title/body/task/step-counter/Skip/Back/Next)
      with native flip/shift; `center` placement for anchorless info steps.
- [x] Modal-aware layering (dimmer below `NcModal`, coachmark above; cutout retargets
      inside an open modal).
- [x] a11y: focus trap, ESC dismiss, `aria-live` step announcement, reduced-motion.
- [x] `index.js` re-export + barrels (`components/index.js`, `src/index.js`).
- [x] 100% JSDoc on props/events/slots; add `CnWalkthrough: <n>` to `.jsdoc-baselines.json`.

## 3. useWalkthrough composable
- [x] `src/composables/useWalkthrough.js` — load manifest.walkthrough, per-appId cache.
- [x] Version composition (new install / upgrade delta / no-delta) via a semver helper.
- [x] advanceOn watchers: manual / click-target / route-match(+capture) /
      element-appears / object-created / delay.
- [x] Context bag + `{{var}}` interpolation across body/task/target/route.
- [x] Per-tour progress + completion persistence; `restart(tourId)`; resume token
      read on boot for cross-app hand-off.
- [x] Barrel export.

## 4. CnAppRoot integration
- [x] `walkthroughState` + `activeTour` computeds (call useWalkthrough inside computed).
- [x] Mount `CnWalkthrough` as a non-gating sibling overlay when `phase==='shell'`
      and a tour qualifies; `#walkthrough` override slot.
- [x] "Replay walkthrough" personal-settings/menu entry → `restart(tourId)`.
- [x] `onWalkthroughComplete` → persist seen version + emit `walkthrough-complete`.

## 5. Docs
- [x] `docs/components/cn-walkthrough.md` (try-it, props/events/slots, adoption recipe).
- [x] `docs/utilities/composables/use-walkthrough.md`.
- [x] `cd docusaurus && npm run prebuild:docs` — commit regenerated partials.

## 6. Tests + gates
- [x] `tests/composables/useWalkthrough.spec.js` (version composition, capture,
      interpolation, object-created advance, completion).
- [x] `tests/components/CnWalkthrough.spec.js` (cutout geometry, coachmark flip,
      enforced-step Next gating, ESC, aria-live).
- [x] `npm test` green; `npm run check:jsdoc` (no regression, CnWalkthrough 100%);
      `npm run check:docs` pass.

## 7. Validate
- [x] `openspec validate cn-walkthrough-engine --strict` passes.
