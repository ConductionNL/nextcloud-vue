# description-period-from-filter Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [description-period-from-filter](../../)

## Purpose

A dashboard's description names the period its filter picked.

## ADDED Requirements

### Requirement: A dashboard description reads the active period of a page filter

A dashboard `description` SHALL replace `{filter.<key>}` with the active choice of the page filter `<key>`, read as a
period: an option with `months: N` as the N months ending with the current one ("{from} through {to}", the year
written once when both months share it), a `YYYY-Qn` value as the quarter's months, a `YYYY` value as that year, and
any other option as its translated label. A change of the filter SHALL change the text.

#### Scenario: DqProcesanalyse

- **GIVEN** the description "Closed cases {filter.period}" and the period filter on `{ value: "12m", months: 12 }`
- **WHEN** it is October 2026
- **THEN** the line reads "Afgehandelde zaken november 2025 tot en met oktober 2026"
