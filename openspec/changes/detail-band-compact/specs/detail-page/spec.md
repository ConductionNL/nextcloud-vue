# detail-page Delta (detail-band-compact)

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-band-compact](../../)

## Purpose

A detail page's band can draw a row of small figures as the client boards do.

## ADDED Requirements

### Requirement: A detail band can be compact

A detail page with `config.bandDensity: "compact"` SHALL, in the board look, keep 12px between band tiles and 20px
between band rows, let a band tile shrink to 120px, and draw a stacked stat in the band as a white tile with a hairline
and radius 10, padded 12px 14px, its 13px label 2px over a 20px value at the normal line height. Without
`bandDensity` the band SHALL be unchanged.

#### Scenario: PqOrganisatie's six figures

- GIVEN the client page in the board look with the contact strip and six stats in a compact band
- THEN the six figures stand in one row across a 1120px page, 12px apart, each 67px high
- AND the row stands 20px under the contact strip
