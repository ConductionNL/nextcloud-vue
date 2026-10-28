## ADDED Requirements

### Requirement: A caption token can take the tile's own number format

A stat caption token written `{path|tile}` SHALL be replaced by the value at `path` in the endpoint payload, formatted with the tile's `content.format`, and by nothing when the payload holds no value there.

#### Scenario: A comparison tile names the previous period's rate
- **GIVEN** a stat tile with `format: { style: "percent", decimals: 1 }`, an endpoint payload `{ rate: 11.1, previousPeriod: { rate: 21.5 } }` and `caption: "was {previousPeriod.rate|tile} in the period before"`
- **WHEN** the reader's locale is nl-NL
- **THEN** the caption SHALL read "was 21,5% in the period before"

#### Scenario: A missing value leaves the token empty
- **GIVEN** the same tile with `caption: "was {previousPeriod.missing|tile}"`
- **THEN** the caption SHALL read "was"

@e2e exclude A formatting rule; the unit test mounts the tile with the locale mocked.
