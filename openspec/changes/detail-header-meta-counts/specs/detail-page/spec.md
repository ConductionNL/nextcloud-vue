# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-header-meta-counts](../../)

## ADDED Requirements

### Requirement: A record page header line can count a list

With `headerMetaCounts` CnDetailPage SHALL count each named list, a register list as one list total and a named source by
its rows, and SHALL fill `{count:<name>}` in `headerMeta` with it. While a count is missing it SHALL leave the line out.

#### Scenario: DqTenant

- **GIVEN** `headerMeta: "one of {count:organisations} organisations on this environment"` and `headerMetaCounts: { organisations: { entitySource: "organisations" } }`
- **AND** six organisations
- **THEN** the line reads "een van 6 organisaties op deze omgeving"
