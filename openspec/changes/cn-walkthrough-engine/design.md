# Design — cn-walkthrough-engine

## Component & file map

```
src/schemas/app-manifest-v2.schema.json        # + walkthrough block (mirror to hydra)
src/components/CnWalkthrough/
  CnWalkthrough.vue                             # overlay + cutout + coachmark
  index.js
src/composables/useWalkthrough.js              # tour composition + advance + context bag
src/components/CnAppRoot/CnAppRoot.vue          # auto-start + #walkthrough slot + restart entry
docs/components/cn-walkthrough.md
docs/utilities/composables/use-walkthrough.md
tests/components/CnWalkthrough.spec.js
tests/composables/useWalkthrough.spec.js
scripts/.jsdoc-baselines.json                   # CnWalkthrough: 100%
```

## Spotlight cutout (the hard part)

A fixed full-viewport `<svg>` overlay with one `<rect>` covering the viewport and a
`<mask>` whose white-fills-black-punches a rounded rect at the target's
`getBoundingClientRect()` (+ padding). The masked overlay fills with the NC dimmer
color (`--color-modal-background` / a translucent black) so everything except the
target rect is dimmed and pointer-blocked; the cutout area has `pointer-events:none`
on the overlay so clicks reach the real element beneath. This works regardless of
the target's stacking context — we never touch the target's `z-index`.

Geometry recomputes on `scroll`, `resize`, route change, and via a
`ResizeObserver`/`MutationObserver` on the target so the hole tracks layout. Before
spotlighting, `target.scrollIntoView({ block: 'center' })` and wait one frame.

## Coachmark placement

A small positioning helper (native, no @floating-ui): given the target rect and the
card size, choose `placement` (or `auto`) and apply flip/shift so the card stays in
the viewport; `center` placement renders a centered card with no anchor (for `info`
/ welcome steps). Arrow points at the target.

## advanceOn watchers

`useWalkthrough` installs, per active step:

- `manual` → Next button enabled.
- `click-target` → click listener on the resolved target; advance on click.
- `route-match` → `router.afterEach` checking `to.name === route`; on match, run
  `capture` (read `to.params` for `:param` keys) into the context bag, then advance.
- `element-appears` → `MutationObserver` on `document.body` resolving the target
  selector; advance when it mounts.
- `object-created` → subscribe to the OR object store (`useObjectStore`) for a new
  object of `register`/`schema`; capture its id; advance.
- `delay` → timeout.

Enforced action step = `task` present + non-`manual` `advanceOn`: Next is hidden
(or, when `allowManualNext`, shown as a muted escape hatch). A per-step timeout
surfaces "can't find this — skip?" rather than dead-ending; `optional` steps
auto-skip when their target/condition is absent.

## Context bag & interpolation

`context` is a reactive object accumulated across steps. `capture: { productId: ":id" }`
on a `route-match` reads `to.params.id`. Later steps interpolate `{{productId}}` in
`body`, `task`, `target.ref`, `target.selector`, `advanceOn.route`, and
`advanceOn` params. Interpolation is string-replace of `{{key}}` → `String(value)`;
unknown keys leave the token (and log a dev warning) so a misauthored tour degrades
visibly, not silently.

## Version composition

`useWalkthrough` reads the running app version (`manifest.version`) and the per-user
`walkthrough_seen_version` (loadState/app-config). For each tour:

- seen version unset (new install) → all steps whose `sinceVersion <= appVersion`.
- seen `vX`, app `vY` (vX < vY) → only steps with `vX < sinceVersion <= vY`
  (the "what's new" tour); if empty, the tour does not auto-start.
- `version-bump` trigger tours auto-start only when there is a non-empty delta.

On completion, write `walkthrough_seen_version = appVersion` and per-tour
`completed`. Semver compare via a tiny internal helper (no new dep).

## CnAppRoot integration

A new computed `walkthroughState` (calls `useWalkthrough` inside the computed,
mirroring `setupState`) and `activeTour`. `phase()` is unchanged (walkthrough never
gates); instead, when `phase === 'shell'` and an `activeTour` qualifies, mount
`CnWalkthrough` as a sibling overlay. The `#walkthrough` slot overrides it. A menu/
personal-settings "Replay walkthrough" entry calls `walkthroughState.restart(tourId)`.

## Cross-app hand-off

A step with `target.kind: 'page'` + `target.app: '<otherApp>'` (or an `advanceOn`
of type `route-match` with an absolute `href`) deep-links to the other app with
`?cn_resume_tour=<tourId>&cn_resume_step=<stepId>`. Tour progress is stored in
per-user app-config keyed by a globally-unique `tourId` (e.g. `pipelinq:lead-to-bill`),
which the destination app's `useWalkthrough` reads on boot to resume. (The concrete
pipelinq→shillinq wiring lives in change 3; this change specifies the primitive.)

## a11y

Focus moves to the spotlit element (or the coachmark for `center` steps); a focus
trap keeps Tab within {target, coachmark controls}; ESC dismisses; an `aria-live`
"polite" region announces `step N of M: <title>`. Honors `prefers-reduced-motion`
(no pulse animation).

## Testing

- Composable: version composition (new vs upgrade vs no-delta), `route-match`
  capture into context, `{{}}` interpolation, `object-created` advance via a mock
  store, completion persistence.
- Component: cutout `<rect>` matches a stubbed `getBoundingClientRect`, coachmark
  flips when near a viewport edge, manual-Next hidden on an enforced step until
  advanceOn fires, ESC emits close, `aria-live` text updates per step.

## Open questions (resolved)

- Build vs lib → **native** (ADR-043).
- Spotlight → **overlay-with-cutout** (ADR-043).
- Advance/capture → **declarative conditions** (ADR-043).
