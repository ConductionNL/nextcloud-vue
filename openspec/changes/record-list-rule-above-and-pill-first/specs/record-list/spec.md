# record-list Delta

## ADDED Requirements

### Requirement: A record list can rule above its first row

With `ruleAbove: true` a `rows` record list SHALL draw its row separator above the first row as well. Without it the
first row SHALL have no rule above it, as before.

#### Scenario: DqZaakDocumenten "Weigeringsgronden tot nu toe"

- **GIVEN** the grounds card with `ruleAbove: true`
- **THEN** a hairline separates the card header from the first ground

### Requirement: A row's pill can come first

With `pillAt: "start"` a `rows` record list SHALL draw a row's pill before its title, and not again at the end. Badges,
due dates and trailing text SHALL stay at the end.

#### Scenario: a ground's code before its name

- **GIVEN** the grounds card with `pill: { field: "code" }` and `pillAt: "start"`
- **THEN** each row starts with its code ("5.1.2e"), then the ground's name and the documents citing it
