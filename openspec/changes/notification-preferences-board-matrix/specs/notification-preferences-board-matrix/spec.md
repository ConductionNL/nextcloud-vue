# notification-preferences-board-matrix Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: The board look draws notification preferences as a matrix

In the board look CnNotificationPreferences SHALL draw CnNotificationMatrix: one row per notification, grouped by
schema, one column per channel the platform declares ("In Nextcloud", "By email"), and SHALL write a changed cell as
the row's channels. The Nextcloud look keeps the switch tiles.

#### Scenario: pipelinq's personal settings

- **GIVEN** the board look and OpenRegister answering lead, ticket and task notifications with two channels
- **THEN** the Meldingen section shows a table with In Nextcloud and Per e-mail columns
