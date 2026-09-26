# Guardian portal surface — Spec

## Purpose

Specifies `CnGuardianHome`, a shared, layout-only guardian/parent portal
shell composed entirely from existing library primitives. It gives every
Conduction app a common "guardian home" pattern (children switcher, feed,
agenda, consent settings, absence entry point) instead of each app
building one ad hoc, matching how `CnAdminSettingsShell` already does this
for settings pages.

**Files**: `src/components/CnGuardianHome/CnGuardianHome.vue`.

**Cross-references**: `component-reference` (general component
conventions), `CnTabs`/`CnTab` (the section strip), `CnWorkspaceFilterWidget`
(the `NcCheckboxRadioSwitch` radiogroup switcher pattern this reuses).

## ADDED Requirements

### Requirement: REQ-GPS-1 — CnGuardianHome renders a children switcher and falls back sensibly when empty

`CnGuardianHome` SHALL accept a `children` prop (array of `{ id, name,
avatarUrl? }`) and render a `role="radiogroup"` switcher with one item per
child. When `children` is empty, it SHALL render its `empty` slot
(defaulting to an `NcEmptyContent` "no children linked yet" state) instead
of the switcher and sections.

#### Scenario: Renders one switcher item per child

- **GIVEN** `children = [{ id: 'c1', name: 'Amira' }, { id: 'c2', name: 'Bram' }]`
- **WHEN** `CnGuardianHome` mounts
- **THEN** the switcher renders two items, labelled "Amira" and "Bram"

#### Scenario: No children renders the empty state

- **GIVEN** `children = []`
- **WHEN** `CnGuardianHome` mounts
- **THEN** it renders the `empty` slot's content (an `NcEmptyContent` by default)
- **AND** no switcher and no sections render

#### Scenario: An `empty` slot override replaces the default empty state

- **GIVEN** `children = []` and a host-supplied `empty` slot
- **WHEN** `CnGuardianHome` mounts
- **THEN** the host's slot content renders instead of `NcEmptyContent`

### Requirement: REQ-GPS-2 — Child selection is v-model-bindable and self-defaults

`activeChildId` SHALL be `v-model`-bindable. When it is unset, or names a
child no longer present in `children`, `CnGuardianHome` SHALL emit
`update:activeChildId` with the first child's `id`. This SHALL
re-evaluate whenever the `children` prop changes, so a `children` array
that arrives after an async fetch still resolves to a real selection.

#### Scenario: Auto-selects the first child when unset

- **GIVEN** `children` is non-empty and `activeChildId` is unset
- **WHEN** `CnGuardianHome` mounts
- **THEN** it emits `update:activeChildId` with `children[0].id`

#### Scenario: Falls back when activeChildId names an absent child

- **GIVEN** `children = [{ id: 'c1' }, { id: 'c2' }]` and `activeChildId = 'ghost'`
- **WHEN** `CnGuardianHome` mounts
- **THEN** it emits `update:activeChildId` with `'c1'`

#### Scenario: Picking a switcher item emits the new selection

- **GIVEN** `CnGuardianHome` with `activeChildId = 'c1'`
- **WHEN** the guardian picks the switcher item for `c2`
- **THEN** it emits `update:activeChildId` with `'c2'`

### Requirement: REQ-GPS-3 — Report-absence entry point

`CnGuardianHome` SHALL render a "report absence" button in its header when
`showAbsenceAction` is `true` (the default). Clicking it SHALL emit
`report-absence` with the full active child object (not only its id).

#### Scenario: Clicking report-absence emits the active child object

- **GIVEN** `CnGuardianHome` with `activeChildId = 'c2'` and
  `children = [{ id: 'c1', name: 'Amira' }, { id: 'c2', name: 'Bram' }]`
- **WHEN** the guardian clicks "report absence"
- **THEN** it emits `report-absence` with `{ id: 'c2', name: 'Bram' }`

#### Scenario: showAbsenceAction hides the button

- **GIVEN** `CnGuardianHome` with `showAbsenceAction = false`
- **WHEN** it mounts
- **THEN** no "report absence" button renders

### Requirement: REQ-GPS-4 — Feed, agenda, and consent sections are scoped slots over the active child

`CnGuardianHome` SHALL render three sections — feed, agenda, and consent
settings — as `CnTab` panels inside a `CnTabs` strip. Each SHALL expose a
scoped slot (`feed`, `agenda`, `consent` respectively) bound to `{ child:
activeChild }`, so a host's section content always reflects whichever
child is currently selected. A section the host leaves unfilled SHALL
render a generic "not configured yet" placeholder rather than blank space.

#### Scenario: Scoped slots receive the active child

- **GIVEN** `CnGuardianHome` with `activeChildId = 'c2'` and a host `feed`
  slot template referencing `child.name`
- **WHEN** it renders
- **THEN** the feed slot content shows the active child's name ("Bram")

#### Scenario: An unfilled section shows a placeholder, not blank space

- **GIVEN** `CnGuardianHome` with no `feed`/`agenda`/`consent` slots supplied
- **WHEN** it renders
- **THEN** each of the three sections shows a "not configured yet" placeholder

### Requirement: REQ-GPS-5 — Sections stay mounted across a tab switch

Because sections are built on `CnTab`, an inactive section's content SHALL
remain in the DOM (hidden, not destroyed) when the guardian switches
sections, so a host widget's own `mounted()`-time fetch is never re-fired
by a tab switch.

#### Scenario: Switching sections does not remount a widget

- **GIVEN** a host `agenda` slot component that fetches once in `mounted()`
- **WHEN** the guardian switches from the feed section to the agenda
  section and back
- **THEN** the agenda widget's `mounted()` fetch fires exactly once, not
  once per switch

### Requirement: REQ-GPS-6 — No new dependency, layout-only

`CnGuardianHome` SHALL be composed only from components already available
in this library (`NcCheckboxRadioSwitch`, `NcButton`, `NcEmptyContent`,
`CnTabs`, `CnTab`) and SHALL NOT introduce a new runtime dependency. It
SHALL fetch no data itself — `children` and every section's content are
supplied by the host.

#### Scenario: No network calls originate from CnGuardianHome itself

- **GIVEN** `CnGuardianHome` mounted with any `children` value
- **WHEN** it renders and the guardian interacts with the switcher, the
  absence button, and the section tabs
- **THEN** no HTTP request is made by `CnGuardianHome`'s own code (only a
  host-supplied slot component may make one)
