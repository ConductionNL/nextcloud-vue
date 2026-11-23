# map-missing-title-names-the-rows

## ADDED Requirements

### Requirement: The missing-address card can name what it counts

The map list's missing-address card MUST read `mapConfig.list.missingTitle` when the app declares it, in the singular
or plural form for the count, and MUST keep the library's line otherwise.

#### Scenario: Eight cases without an address

- GIVEN `missingTitle: { singular: "{total} case without an address", plural: "{total} cases without an address" }`
- WHEN eight listed cases have no place
- THEN the card reads "8 cases without an address" in the app's language
