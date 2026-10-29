# audit-trail Delta

## ADDED Requirements

### Requirement: A stacked audit card can draw compact rows

`CnAuditTrailCard` SHALL accept `density`. With `compact`, each row SHALL carry `cn-audit-card__row--compact`; in the
board look a compact stacked row SHALL be padded 10px above and below, and a detail card whose list opens on one SHALL
start it 10px under the title. Without `density` the rows SHALL be drawn as before. The audit-trail widget SHALL pass
`content.density` to the card.

#### Scenario: DqZaaktype Historie

- **GIVEN** an audit-trail widget with `content.layout: "stacked"` and `content.density: "compact"` in the board look
- **WHEN** it shows "Versie 4 gepubliceerd" with "Lars de Koning · 2 okt" under it
- **THEN** the row is 56px high and its action sits 21px under the card title

#### Scenario: DqTaak Historie keeps its rows

- **GIVEN** an audit-trail widget with `content.layout: "stacked"` and no density
- **WHEN** it is drawn in the board look
- **THEN** its rows are padded 12px, as before
