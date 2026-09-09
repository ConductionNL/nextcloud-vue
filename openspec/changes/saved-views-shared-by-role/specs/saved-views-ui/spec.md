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
in its dropdown: the caller's own views and the views shared with one of the
caller's groups. A view whose `sharedWith` is empty or absent SHALL list only
under own views. Applying a shared view SHALL write its query, sort and columns
to the route exactly as applying an own view does.

#### Scenario: Two groups from one response

- **GIVEN** the views API returns one own view and one view with `sharedWith: [{ group: "desk", mode: "read" }]`
- **WHEN** the dropdown opens
- **THEN** "My views" lists the own view and "Shared with me" lists the shared view with a "desk" chip

#### Scenario: A shared view applies its columns

- **GIVEN** a shared view carrying `columns: ["identifier", "status", "assignee"]`
- **WHEN** the user applies it
- **THEN** the route query carries the view's filters and sort and the index page shows those three columns

#### Scenario: No sharing data, no change

- **GIVEN** a views API response where no view has `sharedWith`
- **WHEN** the dropdown opens
- **THEN** only "My views" renders and no request other than the existing views listing is made

@e2e include Mount CnIndexPage with `allowSavedViews: true` against a views fixture with one shared view; open the dropdown; assert both groups; apply the shared view; assert route query and visible columns.

### Requirement: Share a view with a group

The save and edit form of an own view SHALL offer a group multiselect and a
read or write mode per selected group. The saved payload SHALL carry
`sharedWith: [{ group, mode }]`. The section SHALL be absent when the API
returns no groups for the caller.

#### Scenario: Share read-only with a department

- **GIVEN** the save form of an own view and the API lists the group "desk"
- **WHEN** the user selects "desk" with mode read and saves
- **THEN** the request body carries `sharedWith: [{ group: "desk", mode: "read" }]`

#### Scenario: Server refuses the share

- **GIVEN** the save request answers 403 with a message
- **WHEN** the response arrives
- **THEN** the form stays open and shows the server message inline

#### Scenario: No groups, no section

- **GIVEN** the API returns no groups for the caller
- **WHEN** the save form opens
- **THEN** no sharing fields render

@e2e include Open the save form of an own view; select a group; save; assert the PUT body carries `sharedWith`; reopen and assert the chip.

### Requirement: A received view follows its mode

A view received with `mode: read` SHALL hide edit and delete and SHALL offer
"Save as my view", which stores a personal copy. A view received with
`mode: write` SHALL allow saving changes and SHALL keep its owner and
`sharedWith` unchanged.

#### Scenario: Read-only view copied

- **GIVEN** a shared view with `mode: read`
- **WHEN** the user chooses "Save as my view"
- **THEN** a new personal view with the same query, sort, columns and name is created and the original is untouched

#### Scenario: Editable view saved

- **GIVEN** a shared view with `mode: write` and the user changes its sort
- **WHEN** the user saves
- **THEN** the PUT body carries the new sort, the original owner and the original `sharedWith`

@e2e include Apply a read-only shared view; assert edit and delete absent; choose Save as my view; assert a new own view appears.
