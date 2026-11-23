# saved-views-ui Delta: saved-views-shared-by-role

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-views-shared-by-role](../../)

## Purpose

A saved view can be shared with a group, read-only or editable, and the
receiving user sees it in `CnSavedViewsControl` with its columns and label.
Competitor row B07 of the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: Shared views listed beside own views

When `allowSavedViews` is `true`, `CnSavedViewsControl` SHALL render two groups
in its dropdown: the caller's own views (`@self.access` `owner`) and the views
shared with the caller (`@self.access` `write` or `read`, or a public view
owned by someone else). A view without `@self.access` SHALL count as own when
its `owner` is the current user. Applying a shared view SHALL write its query, sort and columns
to the route exactly as applying an own view does.

#### Scenario: Two groups from one response

- **GIVEN** the views API returns one view with `@self.access: "owner"` and one with `@self.access: "read"` and `sharedWith: [{ group: "desk", mode: "read" }]`
- **WHEN** the dropdown opens
- **THEN** "My views" lists the own view and "Shared with me" lists the shared view with a "desk" chip

#### Scenario: A shared view applies its columns

- **GIVEN** a shared view carrying `columns: ["identifier", "status", "assignee"]`
- **WHEN** the user applies it
- **THEN** the route query carries the view's filters and sort and the index page shows those three columns

#### Scenario: No sharing data, no change

- **GIVEN** a views API response where every view has `@self.access: "owner"`
- **WHEN** the dropdown opens
- **THEN** only "My views" renders and no request other than the existing views listing is made

@e2e include Mount CnIndexPage with `allowSavedViews: true` against a views fixture with one shared view; open the dropdown; assert both groups; apply the shared view; assert route query and visible columns.

### Requirement: Share a view with a group

`CnSaveViewDialog` and the edit form of an own view in `CnSavedViewsControl`
SHALL offer a group multiselect (`NcSelect` with `inputLabel`, searching
Nextcloud's sharee API for groups) and a read or write mode per selected
group. `CnSaveViewDialog` SHALL emit `confirm({ name, isPublic, sharedWith })`
with `sharedWith` `[]` when no group is picked. The saved payload SHALL carry
`sharedWith: [{ group, mode }]`. The section SHALL be absent when the sharee
API answers no groups for the caller.

#### Scenario: Share read-only with a department from the save dialog

- **GIVEN** a dossiq case list, `CnSaveViewDialog` open, and the sharee API listing the group "desk"
- **WHEN** the user names the view, selects "desk" with mode read and saves
- **THEN** `confirm` is emitted with `sharedWith: [{ group: "desk", mode: "read" }]`
- **AND** the request body the page sends carries that `sharedWith`

#### Scenario: An existing consumer keeps working

- **GIVEN** a consumer that reads only `name` and `isPublic` from `confirm`
- **WHEN** the user saves without picking a group
- **THEN** `confirm` carries `sharedWith: []` and the consumer's save is unchanged

#### Scenario: Server refuses the share

- **GIVEN** the save request answers 403 with a message
- **WHEN** the response arrives
- **THEN** the form stays open and shows the server message inline

#### Scenario: No groups, no section

- **GIVEN** the sharee API answers no groups for the caller
- **WHEN** the save dialog opens
- **THEN** no sharing fields render

@e2e include Open the save form of an own view; select a group; save; assert the PUT body carries `sharedWith`; reopen and assert the chip.

### Requirement: A received view follows its mode

A view with `@self.access: read` SHALL hide edit and delete and SHALL offer
"Save as my view", which stores a personal copy. A view with
`@self.access: write` SHALL allow saving changes to its query, sort, columns
and presentation, SHALL hide delete, and its save body SHALL NOT carry
`sharedWith` or `owner`.

#### Scenario: Read-only view copied

- **GIVEN** a shared view with `@self.access: "read"`
- **WHEN** the user chooses "Save as my view"
- **THEN** a new personal view with the same query, sort, columns and name is created and the original is untouched

#### Scenario: Editable view saved

- **GIVEN** a shared view with `@self.access: "write"` and the user changes its sort
- **WHEN** the user saves
- **THEN** the PUT body carries the new sort and no `sharedWith` or `owner` key
- **AND** the view's audience is unchanged when read back

@e2e include Apply a read-only shared view; assert edit and delete absent; choose Save as my view; assert a new own view appears.
