# settings-section-opened-from-row Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A settings card can be opened from a row

A settings card with `openedFrom` SHALL be drawn only while the page's hash is `#<its id>`, SHALL follow later hash
changes, and SHALL read "Opened from the row {row}" under its title instead of its description. A card without
`openedFrom` SHALL always be drawn.

#### Scenario: DqInstellingen

- **GIVEN** the integrations tab with the Kadaster card opened from its row
- **WHEN** the row "Kadaster (BRK) en WOZ" is followed to `#section-kadaster`
- **THEN** the card shows with "Geopend vanuit de rij Kadaster (BRK) en WOZ"; before that, and after another row is followed, it does not
