## ADDED Requirements

### Requirement: A toned footnote can be compact

A record list with `footnoteVariant` and `footnoteCompact: true` SHALL draw the footnote box without its icon, in small text. Without `footnoteCompact` the box SHALL keep its icon.

#### Scenario: DqZaakTaken
- GIVEN the "Wat hierna komt" card with an info footnote and `footnoteCompact: true`
- WHEN the card has rows
- THEN the note shows in a toned box with no icon
