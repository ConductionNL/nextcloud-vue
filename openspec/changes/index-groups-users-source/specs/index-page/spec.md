# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-groups-users-source](../../)

## Purpose

The departments and their staff are a configured list, not a custom page.

## ADDED Requirements

### Requirement: An index page can list Nextcloud groups and their members

With `folderSidebar.source: "groups"` the folder pane SHALL list Nextcloud groups with their member counts, picked,
ordered and nested by `folderSidebar.groups` when given. With `entitySource: "users"` the list SHALL show the members of
the selected group with function, roles, e-mail and today: an out-of-office period that runs now as "Absent until
<date>", else the user status message, else present or away.

#### Scenario: Vergunningen

- **GIVEN** groups Fysiek domein (96) and Vergunningen (18) nested under it, and Vergunningen selected
- **THEN** the tree shows both with their counts
- **AND** Sanne, out of office until 14 October, reads "Absent until 14 Oct"; Jamal, away with the message "Buiten",
  reads "Buiten"; Lars, online, reads "Present"
