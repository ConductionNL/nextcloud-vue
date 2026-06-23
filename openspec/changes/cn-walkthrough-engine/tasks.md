# Tasks — cn-walkthrough-engine

## 1. Manifest schema
- [ ] Add the `walkthrough` block to `src/schemas/app-manifest-v2.schema.json`
      (`additionalProperties:false`; closed enums for `trigger`, `target.kind`,
      `advanceOn.type`, `placement`; unique tour + step ids).
- [ ] Mirror the identical definition into `hydra/scripts/schemas/app-manifest-v2.schema.json`.
- [ ] Re-vendor the schema into each consumer app's `tests/schemas/` (sync step).
- [ ] Extend `validateManifest` fixtures: a well-formed walkthrough validates; an
      unknown `target.kind` / extra property fails.

## 2. CnWalkthrough component
- [ ] `src/components/CnWalkthrough/CnWalkthrough.vue` — SVG-mask/clip-path dimmer
      with a rounded cutout around the target rect; pointer-events pass-through over
      the cutout; recompute on scroll/resize/route + Resize/MutationObserver.
- [ ] Auto-positioned coachmark card (title/body/task/step-counter/Skip/Back/Next)
      with native flip/shift; `center` placement for anchorless info steps.
- [ ] Modal-aware layering (dimmer below `NcModal`, coachmark above; cutout retargets
      inside an open modal).
- [ ] a11y: focus trap, ESC dismiss, `aria-live` step announcement, reduced-motion.
- [ ] `index.js` re-export + barrels (`components/index.js`, `src/index.js`).
- [ ] 100% JSDoc on props/events/slots; add `CnWalkthrough: <n>` to `.jsdoc-baselines.json`.

## 3. useWalkthrough composable
- [ ] `src/composables/useWalkthrough.js` — load manifest.walkthrough, per-appId cache.
- [ ] Version composition (new install / upgrade delta / no-delta) via a semver helper.
- [ ] advanceOn watchers: manual / click-target / route-match(+capture) /
      element-appears / object-created / delay.
- [ ] Context bag + `{{var}}` interpolation across body/task/target/route.
- [ ] Per-tour progress + completion persistence; `restart(tourId)`; resume token
      read on boot for cross-app hand-off.
- [ ] Barrel export.

## 4. CnAppRoot integration
- [ ] `walkthroughState` + `activeTour` computeds (call useWalkthrough inside computed).
- [ ] Mount `CnWalkthrough` as a non-gating sibling overlay when `phase==='shell'`
      and a tour qualifies; `#walkthrough` override slot.
- [ ] "Replay walkthrough" personal-settings/menu entry → `restart(tourId)`.
- [ ] `onWalkthroughComplete` → persist seen version + emit `walkthrough-complete`.

## 5. Docs
- [ ] `docs/components/cn-walkthrough.md` (try-it, props/events/slots, adoption recipe).
- [ ] `docs/utilities/composables/use-walkthrough.md`.
- [ ] `cd docusaurus && npm run prebuild:docs` — commit regenerated partials.

## 6. Tests + gates
- [ ] `tests/composables/useWalkthrough.spec.js` (version composition, capture,
      interpolation, object-created advance, completion).
- [ ] `tests/components/CnWalkthrough.spec.js` (cutout geometry, coachmark flip,
      enforced-step Next gating, ESC, aria-live).
- [ ] `npm test` green; `npm run check:jsdoc` (no regression, CnWalkthrough 100%);
      `npm run check:docs` pass.

## 7. Validate
- [ ] `openspec validate cn-walkthrough-engine --strict` passes.
