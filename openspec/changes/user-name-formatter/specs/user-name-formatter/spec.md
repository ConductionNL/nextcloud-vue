# user-name-formatter Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [user-name-formatter](../../)

## ADDED Requirements

### Requirement: A user id can read as its display name

The built-in formatter `userName` SHALL read a Nextcloud user id as the user's display name, and SHALL read the id while the name is looked up and when no user answers. An empty value SHALL read as empty.

#### Scenario: DqWerkbord

- GIVEN a board card whose owner field holds "pieter" and the formatter userName
- THEN the owner reads "Pieter Jansen" and its initials "PJ"
