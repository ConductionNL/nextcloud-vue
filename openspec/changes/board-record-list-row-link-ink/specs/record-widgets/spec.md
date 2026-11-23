# record-widgets Delta: board-record-list-row-link-ink

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-record-list-row-link-ink](../../)

## ADDED Requirements

### Requirement: A board list row that is a link draws no link ink

In the board look, a record-list row that opens its record SHALL draw its title in the main text colour and its meta
muted, without an underline, also under a theme that styles every link; hovering or focusing the row SHALL underline
its title.

#### Scenario: DqContact "Zaken"

- **GIVEN** Sanne de Vries's contact page under the nldesign theme
- **THEN** the row "Verlichting fietspad Lindelaan / 2026-0110 · Woo-verzoek" shows its title in the main ink and its
  meta muted, neither underlined
