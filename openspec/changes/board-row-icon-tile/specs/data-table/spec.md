# data-table Delta

## ADDED Requirements

### Requirement: A board table's leading icon sits on a tile

In the board look a table's leading row icon SHALL be drawn as an 18px glyph on a 32px tile with radius 8, toned by
the page's `rowIconTone` (`primary` by default, `teal`, `neutral`), 12px before the next cell's content.

#### Scenario: DqOrganisaties

- **GIVEN** the organisations list with `rowIcon: "Domain"` and `rowIconTone: "teal"`
- **THEN** each row's icon sits on a teal tile and the name starts 12px after it
