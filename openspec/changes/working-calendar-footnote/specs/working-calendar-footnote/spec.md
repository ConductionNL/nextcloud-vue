# working-calendar-footnote Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A working calendar can end with a footnote

CnWorkingCalendarWidget SHALL draw `content.footnote`, translated, as a muted line after the month grid, and nothing
without one.

#### Scenario: DqInstellingenAlgemeen

- **GIVEN** the Werkdagen en feestdagen card with a footnote
- **THEN** "Rood: feestdag of sluitingsdag. ..." stands under the calendar, not under the card title
