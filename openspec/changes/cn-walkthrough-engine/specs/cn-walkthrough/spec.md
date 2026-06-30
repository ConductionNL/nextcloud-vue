# cn-walkthrough Specification

**Status:** proposed
**Scope:** nextcloud-vue
**Tier:** V1
**Depends on:** the `manifest-walkthrough` schema; `CnAppRoot`; vue-router; `useObjectStore`; hydra ADR-043; ADR-030 (`data-testid` instrumentation).

## Purpose

Provide the abstract walkthrough engine — the `CnWalkthrough` spotlight component,
the `useWalkthrough` composable, and the `CnAppRoot` auto-start + restart entry —
that together render a manifest `walkthrough` block as a versioned, gray-dimmed,
spotlighted product tour driving the real app.

## ADDED Requirements

### Requirement: REQ-WALK-NV-001 — CnWalkthrough Renders A Dimmer With A Spotlight Cutout

`CnWalkthrough` SHALL render a full-viewport gray-transparent dimmer (matching the
NC modal backdrop) with a cutout punched around the active target's bounding rect,
implemented with an SVG mask or `clip-path` (NOT by promoting the target's
`z-index`). The page SHALL be click-blocked everywhere except inside the cutout,
where pointer events SHALL reach the real target element. The cutout geometry SHALL
recompute on scroll, resize, and route change.

#### Scenario: One element is interactive in front of the dimmer

- **GIVEN** a step targeting a visible button
- **WHEN** the walkthrough renders
- **THEN** the button SHALL be clickable and the rest of the viewport SHALL be dimmed and non-interactive

#### Scenario: The cutout never relies on z-index promotion

- **GIVEN** a target nested inside an `overflow:hidden` / transformed ancestor
- **WHEN** the walkthrough spotlights it
- **THEN** the cutout SHALL still align to the target's bounding rect (no z-index change on the target)

### Requirement: REQ-WALK-NV-002 — CnWalkthrough Shows An Auto-Positioned Coachmark

`CnWalkthrough` SHALL render a coachmark card anchored to the target showing the
step title, body (with `{{var}}` interpolation applied), an optional task line, a
step counter, and Skip / Back / Next controls. The card SHALL flip/shift to stay
within the viewport, scroll the target into view before showing, and render
centered with no anchor when `placement` is `center`. On an enforced action step
(`task` + non-`manual` `advanceOn`) the Next control SHALL be hidden or disabled
until the step's `advanceOn` fires, unless `allowManualNext` is set.

#### Scenario: Next is gated on an enforced action step

- **GIVEN** a step with a task and `advanceOn: { type: "click-target" }` and no `allowManualNext`
- **WHEN** the step is active and the target has not been clicked
- **THEN** Next SHALL be hidden/disabled; **WHEN** the target is clicked, the tour SHALL advance

#### Scenario: A deviating user can still proceed

- **GIVEN** an enforced step with `allowManualNext: true`
- **WHEN** the user does not perform the action
- **THEN** a muted manual Next escape hatch SHALL be available

### Requirement: REQ-WALK-NV-003 — CnWalkthrough Is Keyboard And Screen-Reader Accessible

`CnWalkthrough` SHALL move focus to the spotlit element (or the coachmark for
`center` steps), trap focus within {target, coachmark controls}, dismiss on ESC,
announce each step via an `aria-live="polite"` region ("step N of M: <title>"), and
honor `prefers-reduced-motion`.

#### Scenario: Keyboard operation

- **GIVEN** the walkthrough is active
- **WHEN** the user presses Tab
- **THEN** focus SHALL stay within the target + coachmark controls; **WHEN** the user presses ESC, the walkthrough SHALL dismiss

### Requirement: REQ-WALK-NV-004 — useWalkthrough Composes The Tour By Version

`useWalkthrough(appId, manifest)` SHALL read `manifest.walkthrough`, the running
`manifest.version`, and the per-user `completionConfigKey` value, and compose the
active tour's steps for that user: a fresh user SHALL receive all steps
`<= manifest.version`; an upgraded user SHALL receive only steps with `sinceVersion`
greater than their last-seen version and `<= manifest.version`. A `version-bump`
tour SHALL NOT auto-start when that delta is empty. State SHALL be cached per appId.

#### Scenario: Upgrade surfaces only the new steps

- **GIVEN** last-seen `1.0.0`, manifest `1.1.0`, and one step with `sinceVersion: "1.1.0"`
- **WHEN** the version-bump tour is composed
- **THEN** it SHALL contain exactly that one step

### Requirement: REQ-WALK-NV-005 — useWalkthrough Drives Advancement And Captures IDs

`useWalkthrough` SHALL install the `advanceOn` watcher for the active step
(`manual`, `click-target`, `route-match`, `element-appears`, `object-created`,
`delay`), advance when it fires, run any `capture` into the tour context, and
interpolate `{{var}}` tokens into subsequent steps. An `optional` step whose target
or condition is absent SHALL be skipped without dead-ending.

#### Scenario: Route-match advances and captures the id

- **GIVEN** an active step `advanceOn: { type: "route-match", route: "leads-detail", capture: { leadId: ":id" } }`
- **WHEN** the router lands on `leads-detail` with param `id = "7"`
- **THEN** the tour SHALL advance and `leadId = "7"` SHALL be available for interpolation

#### Scenario: Object-created advances on a new store object

- **GIVEN** an active step `advanceOn: { type: "object-created", register: "crm", schema: "lead" }`
- **WHEN** the OR object store emits a newly created `lead`
- **THEN** the tour SHALL advance and capture the new object's id

### Requirement: REQ-WALK-NV-006 — CnAppRoot Auto-Starts And Exposes A Restart Entry

`CnAppRoot` SHALL, when `phase === 'shell'`, `manifest.walkthrough.enabled`, and a
tour qualifies for the user/version/trigger, mount `CnWalkthrough` as a non-gating
sibling overlay (the shell renders underneath), overridable via a `#walkthrough`
slot. CnAppRoot SHALL expose a "Replay walkthrough" personal-settings/menu entry
that lists the app's tours and restarts the chosen one, and SHALL persist the
seen version + per-tour completion on finish, emitting `walkthrough-complete`.

#### Scenario: First visit auto-starts the getting-started tour

- **GIVEN** a fresh user, a manifest with a `first-visit` tour, and the shell rendered
- **WHEN** CnAppRoot reaches the shell phase
- **THEN** `CnWalkthrough` SHALL mount over the shell without gating it

#### Scenario: Restart from settings

- **GIVEN** a user who completed the tour
- **WHEN** they activate the "Replay walkthrough" entry for a tour
- **THEN** that tour SHALL restart from its first step

### Requirement: REQ-WALK-NV-007 — Tours Resume After Refresh And Across Apps

`useWalkthrough` SHALL persist per-tour progress so a page refresh resumes the
active step rather than restarting, and SHALL read a `cn_resume_tour` /
`cn_resume_step` resume token on boot so a tour that deep-links from one Conduction
app to another continues in the destination app.

#### Scenario: Refresh resumes mid-tour

- **GIVEN** a user on step 3 of a tour
- **WHEN** they reload the page
- **THEN** the tour SHALL resume at step 3, not step 1

#### Scenario: Cross-app hand-off resumes

- **GIVEN** a step that deep-links to another app with a resume token
- **WHEN** the destination app boots with `cn_resume_tour` / `cn_resume_step`
- **THEN** its `useWalkthrough` SHALL resume that tour at that step
