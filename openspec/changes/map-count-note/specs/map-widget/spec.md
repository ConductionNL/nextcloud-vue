## ADDED Requirements

### Requirement: A map card can put its count at the right of the title row

The map widget SHALL report `content.headerNote` (`{ one, other }` or one string, with `{total}`, translated) as the card
header's note once the marker source answered with at least one marker, and nothing otherwise.

#### Scenario: one location on a case
- **GIVEN** a case with one location and `headerNote` `{ one: "{total} location", other: "{total} locations" }`
- **THEN** the Locaties card's title row ends with "1 locatie"
