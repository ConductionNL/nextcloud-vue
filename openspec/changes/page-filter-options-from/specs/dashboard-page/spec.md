# dashboard-page Delta: page-filter-options-from

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [page-filter-options-from](../../)

## Purpose

Let a page filter read its options, so a reporting dashboard's case-type filter is configuration.

## ADDED Requirements

### Requirement: A page filter can read its options

A page filter with `optionsFrom` and no `options` SHALL read its options from `{ register, schema, filter? }` (OpenRegister objects) or `{ url, params?, responsePath? }` (an app endpoint), taking each option's value from `valueField` (default the id) and label from `labelField` (default `title`, else `name`), dropping rows without a value. With `clearable: true` the select SHALL offer a clear that writes `null` to the workspace key, SHALL show `placeholder` while empty, and SHALL seed nothing on mount; otherwise the first option read SHALL seed the key when it has no value.

#### Scenario: Filter by case type

- **GIVEN** a dashboard page filter `caseType` with `optionsFrom: { register: "dossiq", schema: "caseType" }`, `clearable: true` and `placeholder: "All case types"`
- **WHEN** the page loads and the reader picks Bezwaar, then clears the select
- **THEN** the options are the case types, the workspace `caseType` becomes Bezwaar's id, then null
