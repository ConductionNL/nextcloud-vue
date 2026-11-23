# Proposal: index-groups-users-source

## Why

DqAfdelingen lists the municipality's departments and their staff: Nextcloud groups as a tree with member counts, and per
member their function, roles, e-mail and whether they are in today ("Aanwezig", "Buiten", "Afwezig tot 14 okt"). That
is Nextcloud's own directory, not OpenRegister data, so the page needed a custom component.

## What changes

- `folderSidebar.source: "groups"`: the folder pane lists Nextcloud groups (OCS `cloud/groups/details`) with their member
  counts. `folderSidebar.groups: [{ id, parent? }]` picks, orders and nests them; without it every group shows by name.
- A named index source `users`: the members of the selected group (OCS `cloud/groups/{id}/users/details`), with the
  profile `headline` as function and `role` as roles (or `functionField` / `rolesField`), e-mail, and today.
- Today is the dav app's out-of-office period when one runs now (`apps/dav/api/v1/outOfOffice/{user}/now`, Nextcloud 28+:
  "Absent until <date>"), else the user status (`apps/user_status/api/v1/statuses`): its message ("Buiten"), else present
  or away.
- Pair them with `folderSidebar.filterField: "group"`; the source declares `group` as its search field. Listing a group
  needs an admin or the group's sub-admin, which fits a settings page; a refused request leaves the list empty.
- No manifest schema change.
