# Dashboard date-range header

## ADDED Requirements

### Requirement: CnDashboardPage SHALL accept an optional `dateRange` prop that renders a header date-range picker

When `props.dateRange.enabled === true`, `CnDashboardPage` SHALL render
a `CnDateRangePicker` row between the page header and the widget grid.
When `props.dateRange` is `null` (the default), `false`, or
`{ enabled: false }`, the date-range row SHALL NOT render and the
existing dashboard layout SHALL be byte-identical to the previous
release.

#### Scenario: dateRange prop omitted → unchanged layout
- **GIVEN** an existing dashboard mounted without a `dateRange` prop
- **WHEN** the page renders
- **THEN** no date-range header row SHALL be present in the DOM
- **AND** the rendered HTML structure of the page SHALL match the
  pre-change behaviour (header → grid)

#### Scenario: dateRange.enabled true → picker rendered
- **GIVEN** a dashboard mounted with
  `dateRange: { enabled: true }`
- **WHEN** the page renders
- **THEN** a `CnDateRangePicker` SHALL appear above the widget grid
- **AND** its initial value SHALL be the `last-7` preset
  (`from = now − 7d`, `to = now`)

### Requirement: `last-7` SHALL be the default preset when no explicit default is supplied

When `dateRange.enabled === true` and no `dateRange.default` is set
and no persisted state exists in `localStorage`, the picker SHALL
initialise to `{ preset: 'last-7', from: <now - 7d>, to: <now> }`
expressed as ISO-8601 UTC strings with midnight boundaries.

#### Scenario: Default preset resolution
- **GIVEN** `dateRange: { enabled: true }` with no `default`
- **WHEN** the page mounts
- **THEN** the picker's emitted initial value SHALL have
  `preset === 'last-7'`
- **AND** `from` SHALL be 7 days before `now`, rounded to UTC midnight
- **AND** `to` SHALL be the end-of-day UTC of `now`

### Requirement: CnDashboardPage SHALL emit `date-range-change` on every range change

Whenever the user picks a different preset, types in a custom range,
or rehydration completes from `localStorage`, `CnDashboardPage` SHALL
emit `@date-range-change` with the new `{ from, to, preset }` payload.

#### Scenario: Preset change emits event
- **GIVEN** a mounted dashboard with the picker on `last-7`
- **WHEN** the user selects `last-30` from the preset dropdown
- **THEN** the component SHALL emit `date-range-change` exactly once
- **AND** the payload SHALL be `{ from, to, preset: 'last-30' }`

### Requirement: CnDashboardPage SHALL persist the selection when `persistKey` is set

When `dateRange.persistKey` is a non-empty string, the page SHALL:
- on mount, read `localStorage.getItem(persistKey)` and rehydrate
  the picker if the stored value parses as `{ from, to, preset? }`
- on every range change, write the serialised state via
  `localStorage.setItem(persistKey, JSON.stringify(state))`

Storage errors (private windows, quota exceeded) SHALL be caught and
ignored; the picker SHALL continue to work in-memory.

#### Scenario: Rehydrate from localStorage
- **GIVEN** `localStorage` contains
  `{"from":"2026-04-01T00:00:00.000Z","to":"2026-04-30T23:59:59.999Z","preset":"custom"}`
  under key `decidesk.dashboard.range`
- **WHEN** the dashboard mounts with `persistKey:
  'decidesk.dashboard.range'`
- **THEN** the picker SHALL render the custom range from the storage
  value
- **AND** the page SHALL emit `date-range-change` with that payload
  on mount

#### Scenario: Storage failure is non-fatal
- **GIVEN** `localStorage.setItem` throws (e.g. quota exhausted)
- **WHEN** the user changes the range
- **THEN** the picker SHALL still update its visible state
- **AND** the error SHALL be swallowed (no uncaught exception)

### Requirement: CnDashboardPage SHALL provide a reactive `cnDashboardDateRange` injection

`CnDashboardPage.setup()` SHALL provide an injection key
`cnDashboardDateRange` containing a Vue `ref`. The ref's value SHALL
either be `null` (when the date-range feature is disabled) or
`{ from, to, preset }` matching the currently selected range. The
ref SHALL be the same object across all descendants — every change
SHALL propagate without re-mount.

#### Scenario: Disabled feature still provides ref(null)
- **GIVEN** a dashboard mounted without `dateRange` or with
  `dateRange: { enabled: false }`
- **WHEN** a descendant calls `inject('cnDashboardDateRange')`
- **THEN** the inject SHALL resolve to a `ref` (not `undefined`)
- **AND** `ref.value` SHALL be `null`

#### Scenario: Enabled feature provides reactive range
- **GIVEN** a dashboard with `dateRange: { enabled: true }`
- **WHEN** the user changes the preset to `last-30`
- **THEN** the provided ref's `.value.preset` SHALL update to
  `'last-30'`
- **AND** the ref SHALL be the same `ref` instance as before the
  change

## ADDED Requirements

### Requirement: CnDateRangePicker SHALL be exported as a public component

`@conduction/nextcloud-vue` SHALL export `CnDateRangePicker` from its
root barrel. The component SHALL accept `value`, `presets`, and
`disabled` props and SHALL emit `input` with `{ from, to, preset }`.
The component SHALL wrap two `NcDateTimePicker` instances + a preset
`NcSelect`; consumers SHALL NOT have to compose those primitives
themselves.

#### Scenario: Two-way binding via v-model
- **GIVEN** a parent template
  `<CnDateRangePicker v-model="range" :presets="presets" />`
- **WHEN** the user selects `last-30` from the preset dropdown
- **THEN** the parent's `range` SHALL update to
  `{ from, to, preset: 'last-30' }`
- **AND** both date inputs SHALL reflect the resolved range

#### Scenario: Selecting `custom` enables manual edit
- **GIVEN** the picker is on `last-7`
- **WHEN** the user selects `custom` from the preset dropdown
- **THEN** the date inputs SHALL remain enabled
- **AND** typing in either input SHALL emit `input` with
  `preset: 'custom'` and the new value

#### Scenario: Disabled prop disables both pickers and the preset select
- **GIVEN** `disabled === true`
- **WHEN** the picker renders
- **THEN** both `NcDateTimePicker`s SHALL receive `disabled`
- **AND** the preset `NcSelect` SHALL receive `disabled`
