# object-list-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-subtitle-and-list-export](../../)

## ADDED Requirements

### Requirement: A list can offer its rows as an export

An `object-list` with `content.export` SHALL offer a header action that downloads the list, as filtered on the page,
through OpenRegister's export endpoint, in CSV unless `format` says `excel`. With `group`, the action SHALL be shown to
members of that group only. OpenRegister SHALL still decide which rows anyone may read.

#### Scenario: DqZaakAssistent

- **GIVEN** the activity list exports for the group `ai-oversight`
- **WHEN** a member of that group opens the tab
- **THEN** the card header offers "Downloaden", which downloads this case's rows
- **AND** a handler outside the group sees no such button
