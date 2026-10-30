# board-team-today-header-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-team-today-header-gap](../../)

## ADDED Requirements

### Requirement: A side panel note keeps the title row as tall as the title

In the board look, the note in a side panel card's header (`.cn-index-page-widgets__note`) SHALL be set at 13px and normal leading.

#### Scenario: DqTeamwachtrij Team vandaag note

- GIVEN the queue page in the board look
- THEN the "Team vandaag" title row is as tall as its title, with "6 van 6 aanwezig" on it

### Requirement: Team members start 14px under the header

In the board look, a side panel card holding a team workload list (`.cn-team-workload`) SHALL start its content 14px under the header.

#### Scenario: DqTeamwachtrij Team vandaag members

- GIVEN the queue page in the board look
- THEN the first member's row starts 32px under the top of the "Team vandaag" title
