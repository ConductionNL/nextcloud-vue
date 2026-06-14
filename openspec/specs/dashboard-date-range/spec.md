# dashboard-date-range Specification

## Purpose
TBD - created by archiving change add-dashboard-date-range-and-chart-bucket. Update Purpose after archive.
## Requirements
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

