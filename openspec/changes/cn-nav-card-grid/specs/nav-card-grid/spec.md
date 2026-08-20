## Purpose

Renders a responsive grid of navigation-link cards from manifest-declared
`navCardEntry` data, giving ADR-044 §4 cards-collapse landing pages a
built-in, manifest-only implementation with no per-app Vue file required.

## ADDED Requirements

### Requirement: CnNavCardGrid renders entry label, description, and icon

`CnNavCardGrid` SHALL render one card per item in `props.entries`, each card
displaying the entry's `label`, its `description` when present, and its
`icon` when present.

#### Scenario: Label always renders
- **GIVEN** a `CnNavCardGrid` with `entries: [{ id: 'levels', label: 'Levels' }]`
- **WHEN** the component renders
- **THEN** a card displays the text "Levels"

#### Scenario: Description renders when present
- **GIVEN** an entry with `description: 'Track XP and level progression'`
- **WHEN** the component renders
- **THEN** the card displays that description text

#### Scenario: Description omitted when absent
- **GIVEN** an entry with no `description` field
- **WHEN** the component renders
- **THEN** the card renders without a description element

#### Scenario: Icon renders when present
- **GIVEN** an entry with `icon: 'ChartLine'`
- **WHEN** the component renders
- **THEN** the card displays the corresponding icon

### Requirement: route and href are mutually exclusive navigation targets

A `CnNavCardGrid` card SHALL navigate via `route` (an internal vue-router
navigation) when `route` is set, or via `href` (opened per the entry's
target) when `href` is set. An entry never has both (enforced upstream by
the `navCardEntry` schema); the component renders a `<router-link>` for a
`route` entry and a plain `<a>` for an `href` entry.

#### Scenario: route entry renders a router-link
- **GIVEN** an entry with `route: 'Levels'` and no `href`
- **WHEN** the component renders
- **THEN** the card is a `<router-link>` targeting the `Levels` route

#### Scenario: href entry renders an anchor
- **GIVEN** an entry with `href: 'https://example.org'` and no `route`
- **WHEN** the component renders
- **THEN** the card is an `<a>` with `href="https://example.org"`

### Requirement: count "auto" resolves via injected cnMenuCounts

When an entry declares `count: "auto"`, `CnNavCardGrid` SHALL resolve the
displayed count by injecting `cnMenuCounts` (provided by `CnAppRoot`) and
`cnManifest`, looking up the entry's `route` in `cnManifest.pages` to find
that page's `config.register` / `config.schema`, then reading
`cnMenuCounts[register][schema]`. The component SHALL NOT perform any network
fetch of its own.

#### Scenario: Auto count resolves from cnMenuCounts
- **GIVEN** an entry `{ route: 'Levels', count: 'auto' }`, a manifest page
  `Levels` with `config: { register: 'game', schema: 'level' }`, and
  `cnMenuCounts.game.level === 42`
- **WHEN** the component renders
- **THEN** the card displays a count badge showing `42`

#### Scenario: Integer count renders as-is
- **GIVEN** an entry `{ count: 7 }`
- **WHEN** the component renders
- **THEN** the card displays a count badge showing `7`, without consulting
  `cnMenuCounts`

#### Scenario: Unresolved auto count shows no badge
- **GIVEN** an entry `{ route: 'Levels', count: 'auto' }` where
  `cnMenuCounts.game.level` is undefined
- **WHEN** the component renders
- **THEN** the card renders without a count badge (no error, no "0" shown as
  if it were a real zero)

### Requirement: An unresolvable route renders the card disabled, never hidden

When an entry's `route` does not match any page in the injected
`cnManifest.pages`, `CnNavCardGrid` SHALL render that card in a disabled,
visibly flagged state (non-navigating, `aria-disabled="true"`) rather than
omitting it, and SHALL emit exactly one `console.warn` naming the entry id
and the unresolved route per component mount.

#### Scenario: Unresolvable route disables the card
- **GIVEN** an entry `{ id: 'levels', route: 'Levels' }` and no page with
  id `Levels` in `cnManifest.pages`
- **WHEN** the component renders
- **THEN** the card is present in the DOM, marked `aria-disabled="true"`,
  and does not navigate when activated

#### Scenario: Unresolvable route warns once
- **GIVEN** the same unresolvable entry as above
- **WHEN** the component mounts
- **THEN** `console.warn` is called exactly once, and the message names both
  the entry id `levels` and the route `Levels`

#### Scenario: Resolvable route is not disabled
- **GIVEN** an entry `{ route: 'Levels' }` and a page with id `Levels` in
  `cnManifest.pages`
- **WHEN** the component renders
- **THEN** the card is not marked disabled and navigates normally when
  activated

### Requirement: Cards are keyboard-operable via native elements

`CnNavCardGrid` cards SHALL be native `<router-link>` or `<a>` elements with
no custom roving-tabindex or key-handling logic, and SHALL NOT set an
`aria-label` on the card (the accessible name comes from its rendered
content; `description`, when present, is associated via `aria-describedby`
rather than replacing the name).

#### Scenario: Tab reaches a card
- **GIVEN** a `CnNavCardGrid` with at least one enabled entry
- **WHEN** the user presses Tab from the preceding focusable element
- **THEN** focus lands on the card element

#### Scenario: Enter activates a focused card
- **GIVEN** a card element has focus
- **WHEN** the user presses Enter
- **THEN** the associated navigation (route or href) is triggered

#### Scenario: No aria-label present
- **GIVEN** any rendered card
- **WHEN** inspecting its accessible name computation
- **THEN** the card element has no `aria-label` attribute

### Requirement: Registered as the built-in nav-card-grid widget key

`src/components/CnWidgetGrid/builtInWidgets.js` SHALL register
`CnNavCardGrid` under the key `'nav-card-grid'` in `BUILT_IN_WIDGETS`, so a
v2 manifest widget entry with `widgetKey: "nav-card-grid"` renders without
any consumer-supplied `cnRegistry` entry.

#### Scenario: Manifest-only render, no consumer Vue file
- **GIVEN** a v2 manifest declaring a `type: "dashboard"` page with a single
  `widgetKey: "nav-card-grid"` widget entry carrying `props.entries`, and no
  consumer `cnRegistry` override for that key
- **WHEN** the manifest is rendered through the normal `CnWidgetGrid`
  resolution path
- **THEN** the widget renders as `CnNavCardGrid` with the manifest's entries,
  using only library code — no app-authored Vue component

### Requirement: count:auto hydration includes nav-card-grid entries

`CnAppRoot._hydrateMenuCounts()` SHALL collect `(register, schema)` targets
not only from `manifest.menu` (existing behavior) but also from every
`pages[].widgets[]` entry where `widgetKey === "nav-card-grid"`, for each
`navCardEntry` in that widget's `props.entries` that declares `count: "auto"`
and a `route` resolving to an index page with `config.register` and
`config.schema`.

#### Scenario: nav-card-grid entries are hydrated
- **GIVEN** a manifest with a `nav-card-grid` widget whose `props.entries`
  includes `{ route: 'Levels', count: 'auto' }`, and a page `Levels` with
  `type: 'index'`, `config: { register: 'game', schema: 'level' }`
- **WHEN** `CnAppRoot` mounts and calls `_hydrateMenuCounts()`
- **THEN** `cnMenuCounts.game.level` is populated from the same batched-counts
  request the existing `manifest.menu` walk uses (no separate request per
  nav-card-grid entry)

#### Scenario: Existing menu.count auto hydration is unchanged
- **GIVEN** a manifest with `menu[].count === 'auto'` entries and no
  `nav-card-grid` widgets at all
- **WHEN** `CnAppRoot` mounts
- **THEN** `cnMenuCounts` hydrates exactly as it did before this change
