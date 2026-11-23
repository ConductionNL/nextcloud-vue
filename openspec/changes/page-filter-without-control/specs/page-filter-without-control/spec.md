# page-filter-without-control Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A page filter can hold a value without drawing a control

A page filter with `control: "none"` SHALL seed its `default` into the workspace context and SHALL draw no control on
the description line or in the filter row. `{filter.<key>}` in the description SHALL read it as any page filter.

#### Scenario: DqDoorlooptijd

- **GIVEN** `{ key: "period", control: "none", default: "12m", options: [{ value: "12m", months: 12 }] }` and the
  description "{filter.period}"
- **WHEN** it is October 2026
- **THEN** the line reads "november 2025 tot en met oktober 2026" and no period control is drawn
