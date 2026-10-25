# index-page Delta: users-source-header-filters

## ADDED Requirements

### Requirement: The users source filters from its table heads

The `users` index source SHALL declare `headerFilters: true` and `searchFields` for `displayname[like]` (`nameLike`, name or function), `roles[like]` (`rolesLike`), `email[like]` (`emailLike`) and `today` (`today`, the picked values). A load with any of them SHALL narrow the members already read for the group without a new request; the total SHALL count what matches.

#### Scenario: Rollen contains "teamleider"
- GIVEN the Vergunningen members are read
- WHEN the Rollen head filters on "teamleider"
- THEN only Lars de Koning is listed, and no member is read again
