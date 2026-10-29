# header-field-pill Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A header field can be drawn as a soft pill

A detail page `headerFields` entry with `format: "pill"` SHALL draw its value in a 21px pill on the dark ground, 10px
in on both sides, at 13px and weight 600, without an edge, and the v2 manifest schema SHALL accept that format.

#### Scenario: DqTenant slug

- **GIVEN** `headerFields: [{ key: "slug", format: "pill" }]` on organisation Gemeente Waterland
- **THEN** the header line shows "waterland" in that pill
