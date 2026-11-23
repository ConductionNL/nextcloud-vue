# saved-views-ui Delta: saved-views-manage-and-defaults

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-views-manage-and-defaults](../../)

## Purpose

A saved view keeps the name view (Save view, nl Weergave opslaan), can be managed from one menu, and an app can
ship default views through its manifest.

## ADDED Requirements

### Requirement: The control is called Save view

The board-look button of `CnSavedViewsControl`, the default label of the header
`save-view` action and the confirm button of `CnSaveViewDialog` SHALL read
"Save view" (nl "Weergave opslaan"). The menu caption SHALL read "Saved views"
(nl "Opgeslagen weergaven").

#### Scenario: Dutch board look

- **GIVEN** the board look and the Dutch locale
- **WHEN** an index page with `allowSavedViews: true` renders
- **THEN** the button in the actions bar reads "Weergave opslaan" and no text on the page reads "Filter opslaan"
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

### Requirement: Saved views live in the filters sidebar

On an index page with `allowSavedViews`, the sidebar SHALL carry a third tab,
Filters (beside Search and Columns, board IndexZijpaneel), holding
`CnSavedViewsPanel`: a "Save view" button with the line "Keeps the current
search term, filters and sort under a name.", then My views, Shared with me
and the read-only Default views, each name applying it with its description
or who shared it beneath. The page SHALL get the sidebar even when it declared
none, unless it set `sidebar.enabled: false`. The toolbar SHALL keep only "Save
view" and, under the board look, the chips; after a save the page SHALL open
the sidebar on the Filters tab.

#### Scenario: A page without a declared sidebar

- **GIVEN** an index page with `allowSavedViews: true` and no `sidebar`
- **WHEN** it renders
- **THEN** the sidebar toggle shows and its Filters tab lists the saved views
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: Saving opens the Filters tab

- **GIVEN** the sidebar on its Search tab
- **WHEN** the user saves a view from the toolbar
- **THEN** the sidebar opens on the Filters tab with the new view listed
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

### Requirement: One manage menu per saved view

Every view in the Filters tab SHALL carry one labelled "Manage {name}" menu
(nl "Beheer {name}", board DqFilterBeheren) with, in this order and only where
the caller's access allows: Edit (owner), Update with current filters (owner,
or shared "May update"), Share (owner), Save a copy (shared, default), Add to
menu or Remove from menu (anyone, when the app has a menu), Delete (owner).
Only the owner SHALL see Edit, Share and Delete. Delete SHALL open the confirm
dialog of board DqFilterVerwijderen, naming who it was shared with, before
anything is sent. The menu SHALL offer no presentation entry; the boards draw
none.

#### Scenario: Owner

- **GIVEN** a view with `@self.access: "owner"`
- **WHEN** its menu opens
- **THEN** it shows Edit, Update with current filters, Share, Add to menu and Delete
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: Shared to use, and defaults

- **GIVEN** a view with `@self.access: "read"`, or a default view
- **WHEN** its menu opens
- **THEN** it shows Save a copy and Add to menu only
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: Delete names the audience

- **GIVEN** an own view shared with group "woo" and user "anouk"
- **WHEN** the user chooses Delete
- **THEN** the confirm says it leaves the list, the menu and the lists of woo, anouk, and nothing is sent until the user confirms
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

### Requirement: The share dialog follows board DqFilterDelen

The share dialog SHALL be titled "Share view: {name}", pick people and groups
in one `NcSelect` labelled "Share with", list them under "Shared with" with
their kind, a radio group "Rights of {name}" with "May use" and "May update",
and a "Stop sharing with {name}" button per entry, and keep existing user and
group shares when it opens.

#### Scenario: User shares survive opening the dialog

- **GIVEN** a view shared with group "woo" and user "anouk"
- **WHEN** the share dialog opens
- **THEN** both are listed with their rights, and Stop sharing on anouk leaves only woo
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

### Requirement: A saved view can be added to the app menu

Add to menu SHALL store `{ id, page, name }` in the user's preferences
(`cn_saved_view_menu`, through the app's preferences endpoint) without
changing the view, so a recipient can add a view shared with them. The
views SHALL appear as a "My views" group in the menu (board DqFilterInMenu),
after the last entry that opens the view's page and before the next caption,
linking to the page with `?savedView=<id>`, which applies it. Remove from menu SHALL take it out. When the page lists its views
and one in the menu is gone or no longer shared, its entry SHALL drop out; an
empty list SHALL never empty the menu. Only an app with a page offering saved
views SHALL read the list.

#### Scenario: Add and remove

- **GIVEN** the Cases page and an own view "Mine, overdue" with id 7
- **WHEN** the user chooses Add to menu, then Remove from menu
- **THEN** the menu shows "Mine, overdue" under My views, linking to Cases with `savedView=7`, and then no longer
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: The link applies the view

- **GIVEN** the address `/cases?savedView=7`
- **WHEN** the page has loaded its views
- **THEN** view 7 is applied and the address still names it, so its menu entry is marked active
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: A deleted view leaves the menu

- **GIVEN** view 8 in the menu and no longer listed for this user
- **WHEN** the Cases page loads its views
- **THEN** the menu entry for 8 is removed and the stored list is written
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

### Requirement: An owner can edit a saved view

Edit SHALL open `CnSavedViewEditDialog` (board DqFilterBewerken), titled "Edit
view: {name}", with the name filled in and a Criteria choice between "Keep
what is saved" (the default) and "Replace with the current search term, filters
and sort".
Confirming SHALL send `PATCH /api/views/{id}` carrying `name`, and `query` only
when the switch is on. A refusal SHALL keep the dialog open with the server's
message.

#### Scenario: Rename only

- **GIVEN** an own view "Te laat" and the current list filtered on something else
- **WHEN** the user renames it to "Te laat, van mij", keeps the criteria and confirms
- **THEN** the PATCH body is `{ name: "Te laat, van mij" }` and the row shows the new name
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: Rename and replace criteria

- **GIVEN** an own view and the list filtered on `assignee=@me`
- **WHEN** the user chooses Replace and confirms
- **THEN** the PATCH body carries `name` and a `query` whose filters are the current ones
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

### Requirement: An app ships default views

An index page SHALL accept `config.defaultSavedViews`, a list of
`{ slug, name, filters, search?, sort?, label? }`. The page SHALL list them in
`CnSavedViewsControl`, in a "Default views" section above the user's own,
without storing them. A default SHALL be applicable and copyable, and SHALL NOT
offer Edit, Share, Update or Delete. Applying a default SHALL resolve `@`-tokens
(`@me`, `@today`, `@today+7d`) in its filters at apply time. Save a copy SHALL
store a personal view whose query keeps the tokens unresolved.

#### Scenario: Defaults render first and read-only

- **GIVEN** `defaultSavedViews: [{ slug: "overdue-mine", name: "Te laat, van mij", filters: { "assignee": "@me", "deadline[lt]": "@today" } }]`
- **WHEN** the menu opens
- **THEN** "Te laat, van mij" is listed under "Default views" before the user's own views, and its menu shows Save a copy and Add to menu only
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: Tokens resolve on apply

- **GIVEN** the default above and today is 2026-10-19 and the user is `pieter`
- **WHEN** the user applies it
- **THEN** the list fetch carries `assignee=pieter` and `deadline[lt]=2026-10-19`
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: A copy keeps the tokens

- **GIVEN** the default above
- **WHEN** the user chooses Save a copy
- **THEN** the POST body's `query.filters` is `{ "assignee": "@me", "deadline[lt]": "@today" }` and the copy lists under the user's own views with every manage entry of an owner
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

#### Scenario: Invalid declaration is refused

- **GIVEN** a `defaultSavedViews` entry without `slug` or with a slug outside `^[a-z0-9][a-z0-9-]*$`
- **WHEN** the manifest is validated
- **THEN** validation fails naming the entry
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}

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
- @e2e exclude {component behaviour, covered by tests/components/CnSavedViewsManage.spec.js}
