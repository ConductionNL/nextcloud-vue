# saved-views-ui Delta: saved-filters-manage-and-defaults

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-filters-manage-and-defaults](../../)

## Purpose

A saved filter is called a filter, can be managed from one menu, and an app can
ship default filters through its manifest.

## ADDED Requirements

### Requirement: The control is called Save filter

The board-look button of `CnSavedViewsControl`, the default label of the header
`save-view` action and the confirm button of `CnSaveViewDialog` SHALL read
"Save filter" (nl "Filter opslaan"). The menu caption SHALL read "Saved filters"
(nl "Opgeslagen filters").

#### Scenario: Dutch board look

- **GIVEN** the board look and the Dutch locale
- **WHEN** an index page with `allowSavedViews: true` renders
- **THEN** the button in the actions bar reads "Filter opslaan" and no text on the page reads "Weergave opslaan"
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

### Requirement: One manage menu per saved filter

Every row of `CnSavedViewsControl` SHALL carry one labelled "Manage {name}"
button. Choosing it SHALL replace the list in the open menu with that filter's
entries, each a labelled menu item shown only when the caller's access allows
it: Edit (owner), Share (owner), Presentation (owner, write), Update with
current filters (owner, write), Save a copy (read, default), Delete (owner),
and Back. Delete SHALL open a confirm dialog before anything is sent.

#### Scenario: Owner sees every entry

- **GIVEN** a view with `@self.access: "owner"`
- **WHEN** the user chooses Manage on its row
- **THEN** the menu shows Back, Edit, Share, Presentation, Update with current filters and Delete, and not Save a copy
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

#### Scenario: Read-only shared filter

- **GIVEN** a view with `@self.access: "read"`
- **WHEN** the user chooses Manage on its row
- **THEN** the menu shows Back and Save a copy only
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

#### Scenario: Delete asks first

- **GIVEN** an own filter in the manage menu
- **WHEN** the user chooses Delete
- **THEN** a confirm dialog names the filter and no DELETE request is sent until the user confirms
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

#### Scenario: Back returns to the list

- **GIVEN** the manage menu of a filter
- **WHEN** the user chooses Back, or closes and reopens the menu
- **THEN** the list of filters shows again
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

### Requirement: An owner can edit a saved filter

Edit SHALL open `CnSavedViewEditDialog` with the filter's name filled in and a
switch "Also replace the criteria with the current filters" (off by default).
Confirming SHALL send `PATCH /api/views/{id}` carrying `name`, and `query` only
when the switch is on. A refusal SHALL keep the dialog open with the server's
message.

#### Scenario: Rename only

- **GIVEN** an own filter "Te laat" and the current list filtered on something else
- **WHEN** the user renames it to "Te laat, van mij" with the switch off and confirms
- **THEN** the PATCH body is `{ name: "Te laat, van mij" }` and the row shows the new name
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

#### Scenario: Rename and replace criteria

- **GIVEN** an own filter and the list filtered on `assignee=@me`
- **WHEN** the user turns the switch on and confirms
- **THEN** the PATCH body carries `name` and a `query` whose filters are the current ones
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

### Requirement: An app ships default filters

An index page SHALL accept `config.defaultSavedFilters`, a list of
`{ slug, name, filters, search?, sort?, label? }`. The page SHALL list them in
`CnSavedViewsControl`, in a "Default filters" section above the user's own,
without storing them. A default SHALL be applicable and copyable, and SHALL NOT
offer Edit, Share, Update or Delete. Applying a default SHALL resolve `@`-tokens
(`@me`, `@today`, `@today+7d`) in its filters at apply time. Save a copy SHALL
store a personal view whose query keeps the tokens unresolved.

#### Scenario: Defaults render first and read-only

- **GIVEN** `defaultSavedFilters: [{ slug: "overdue-mine", name: "Te laat, van mij", filters: { "assignee": "@me", "deadline[lt]": "@today" } }]`
- **WHEN** the menu opens
- **THEN** "Te laat, van mij" is listed under "Default filters" before the user's own views, and its manage menu shows Back and Save a copy only
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

#### Scenario: Tokens resolve on apply

- **GIVEN** the default above and today is 2026-10-19 and the user is `pieter`
- **WHEN** the user applies it
- **THEN** the list fetch carries `assignee=pieter` and `deadline[lt]=2026-10-19`
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

#### Scenario: A copy keeps the tokens

- **GIVEN** the default above
- **WHEN** the user chooses Save a copy
- **THEN** the POST body's `query.filters` is `{ "assignee": "@me", "deadline[lt]": "@today" }` and the copy lists under the user's own filters with every manage entry of an owner
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

#### Scenario: Invalid declaration is refused

- **GIVEN** a `defaultSavedFilters` entry without `slug` or with a slug outside `^[a-z0-9][a-z0-9-]*$`
- **WHEN** the manifest is validated
- **THEN** validation fails naming the entry
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}

### Requirement: Share with users and groups

`CnSavedViewShareFields` SHALL offer users and groups in one `NcSelect` with
`inputLabel` "Share with people and groups", searched through Nextcloud's sharee
API within the instance's sharing settings, and emit
`[{ user, mode } | { group, mode }]`. OpenRegister stores user shares through
its `saved-view-user-shares` change.

#### Scenario: A user and a group

- **GIVEN** OpenRegister accepts user shares
- **WHEN** the owner picks user "fatma" in read mode and group "vergunningen" in write mode
- **THEN** the PATCH body carries `sharedWith: [{ user: "fatma", mode: "read" }, { group: "vergunningen", mode: "write" }]`
- @e2e exclude {component behaviour, covered by tests/components/CnSavedFiltersManage.spec.js}
