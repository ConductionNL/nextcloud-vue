# data-table Delta: table-cell-overline

## ADDED Requirements

### Requirement: A table column can carry a muted line above its value

A CnDataTable column SHALL take `overline`, read like `secondary` (a function of the row, a template with `{field}`
placeholders, or a field key), or `overlineText`, a fixed text in the host's translation, and SHALL draw it as a muted
line above the cell's value. An overline that resolves to nothing SHALL draw no element.

#### Scenario: PtToegangsverzoeken "Gevraagde toegang"

- **GIVEN** a column `{ key: "onBehalfOf", overlineText: "Cases of" }` in a Dutch app that translates it "Zaken van"
- **THEN** the cell reads "Zaken van" in muted text above the organisation's name

#### Scenario: an overline from the row

- **GIVEN** a column `{ key: "title", overline: "{number} · {type}" }`
- **THEN** the cell reads the filled template above the title, and nothing above it for a row where both are empty
