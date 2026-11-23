# board-settings-empty-state Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A board settings empty state is 104px

In the board look an NcEmptyContent on a settings card SHALL draw a 48px icon in the control colour and its name on
a 24px line, 8px apart, with 12px above and below.

#### Scenario: dossiq's StUF audit log without messages

- **GIVEN** no StUF message matches the filters, in the board look
- **THEN** the empty state is about 104px high
