# saved-views-ui Delta: saved-view-tree-and-labels

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-tree-and-labels](../../)

## Purpose

Saved views get a parent, a label and a name other surfaces can call
them by, so two hundred of them stay usable. Round 4 discovery cluster 3,
candidates C-search-22, C-search-23, C-search-3, C-search-5, C-search-8,
C-search-29, C-search-32, C-search-35, C-search-41 and C-search-43.
Consumed by dossiq on `#Cases`, `#Queue` and `#Tasks`.

## ADDED Requirements

### Requirement: A saved view has a parent and inherits what it does not override

A saved view SHALL accept a parent view. A child SHALL declare, for each
of criteria, columns, sorting, default sort and export field set,
whether it inherits that part from its parent or overrides it. The
renderer SHALL resolve each part independently up the chain. A cycle in
the parent chain SHALL be refused with a message naming both views. A
chain deeper than the declared `maxDepth` SHALL be refused with a message
naming the view. A view whose parent the user may not read SHALL render
at the root with its inherited parts noted.

#### Scenario: A child narrows the criteria and keeps the parent's columns

- **GIVEN** a view "Vergunningen" with six columns and a view "Vergunningen, in behandeling" that overrides only the criteria
- **WHEN** a user opens the child
- **THEN** the list shows the child's criteria and the parent's six columns, in the parent's sort order

#### Scenario: A cycle is refused

- **GIVEN** a view whose parent is set to one of its own descendants
- **WHEN** the view is saved
- **THEN** the save fails and the message names both views

#### Scenario: A parent the user may not read

- **GIVEN** a child view whose parent is shared with a group the user is not in
- **WHEN** the user opens the views control
- **THEN** the child renders at the root, resolved, and says which parts come from a view they cannot see

@e2e exclude inheritance resolution is a pure function; covered by unit tests on `resolveViewInheritance`.

### Requirement: Labels filter the list of saved views

A saved view SHALL accept labels. The views control SHALL filter the
list of views by label, and SHALL offer the labels already in use before
offering a new one. A view with no label SHALL still be reachable when no
label filter is active.

#### Scenario: Two hundred views, one label

- **GIVEN** a user with two hundred saved views, twelve of them labelled "bezwaar"
- **WHEN** they filter the views control on "bezwaar"
- **THEN** twelve views are listed, in their tree positions

#### Scenario: Existing labels come first

- **GIVEN** a user labelling a view
- **WHEN** they open the label field
- **THEN** the labels already in use are offered before the field accepts a new one

### Requirement: A view is named once and called by name

A saved view SHALL carry a slug, unique per register and schema. A
dashboard widget, an export action and an API caller SHALL be able to
resolve a view by its slug instead of restating its query. A second view
claiming a slug in use SHALL be refused with a message naming the holder.
A slug SHALL be editable only while nothing cites it. A surface naming an
unknown slug SHALL render the empty state naming the slug.

#### Scenario: A dashboard widget names a view

- **GIVEN** a saved view with slug `open-bezwaren`
- **WHEN** a dashboard widget declares that slug as its source
- **THEN** the widget renders the rows that view describes

#### Scenario: A slug in use is refused

- **GIVEN** a view already holding the slug `open-bezwaren`
- **WHEN** a second view on the same schema is saved with that slug
- **THEN** the save fails and the message names the view holding it

#### Scenario: An unknown slug says so

- **GIVEN** a widget naming a slug no view holds
- **WHEN** the page renders
- **THEN** the widget shows the empty state naming the slug, not a blank list

### Requirement: A new view starts from a template

The views control SHALL offer the view templates the host declares when
a user saves a new view. A template SHALL preset columns, sort order and
export field set, and the user SHALL be able to change each of them
before saving. A host declaring no template SHALL keep today's
behaviour, saving the list as it stands.

#### Scenario: A template presets the columns

- **GIVEN** a host declaring a "Woo-verzoek" view template with four columns and a CSV export field set
- **WHEN** a user saves a new view from it
- **THEN** the new view opens with those four columns and that export field set

#### Scenario: No template, no change

- **GIVEN** a page declaring no view template
- **WHEN** a user saves a new view
- **THEN** the current list is saved exactly as it is today

### Requirement: An administrator sets the view and the columns a role opens on

The host SHALL be able to declare, per role, which saved view a user
lands on and which column set they see. A user's own last choice SHALL
win over the administered one, and the page SHALL offer a reset to the
administered view. A change to a role's landing view SHALL apply on the
next arrival at the page and SHALL NOT move a user off the list they are
reading. Per-role columns SHALL narrow the scope rules of
`index-columns-per-scope` rather than replace them.

#### Scenario: A new handler lands on their team's list

- **GIVEN** a user in the role "behandelaar vergunningen" with no personal view choice
- **WHEN** they open the case list
- **THEN** the view their role declares renders

#### Scenario: A personal choice wins, and can be undone

- **GIVEN** a user who has chosen a different view
- **WHEN** they open the case list, then choose Reset to the standard view
- **THEN** their own view renders first, and the administered view renders after the reset

#### Scenario: An administered change does not move a reading user

- **GIVEN** a user working on a list while an administrator changes the role's landing view
- **WHEN** the administrator saves
- **THEN** the user's list is untouched, and the new landing view applies the next time they arrive

### Requirement: The list groups by one field, with a count per group

An index page SHALL be able to group its rows by one field and show a
count per group. Grouping SHALL run over the rows the list already holds
and SHALL NOT issue a second fetch. A paged list SHALL state that the
counts cover the page it holds.

#### Scenario: Bezwaren per afdeling, without leaving the list

- **GIVEN** a case list of ninety rows with an `afdeling` field
- **WHEN** a user groups by `afdeling`
- **THEN** the rows render under one header per afdeling, each carrying its count

#### Scenario: A paged list says what it counted

- **GIVEN** a grouped list showing the first page of four hundred rows
- **WHEN** the groups render
- **THEN** the page states that the counts cover the rows loaded, not the whole result

### Requirement: A saved view is handed over as a link

A saved view SHALL offer a copy link that yields its route from
`saved-view-as-a-place`, reopening the same list for any user allowed to
read it. A list a user has filtered by hand and not saved SHALL offer
Save and share instead of a URL carrying the filter.

#### Scenario: A colleague opens the list from a mail

- **GIVEN** a saved view shared with a colleague's group
- **WHEN** the colleague opens the copied link
- **THEN** the same list renders for them

#### Scenario: An unsaved filter offers Save and share

- **GIVEN** a user who has filtered the list by hand without saving it
- **WHEN** they ask to share it
- **THEN** they are offered Save and share, and the link appears after the view is saved

### Requirement: Seeded views ship with the app and cannot be deleted

The host SHALL be able to declare views that ship with the app. Seeded
views SHALL render as their own group at the top of the tree, SHALL NOT
offer delete, and SHALL offer duplicate. A duplicate SHALL be an
ordinary personal view the user owns.

#### Scenario: The three lists a handler opens all day

- **GIVEN** an app declaring three seeded views
- **WHEN** a user with no saved views of their own opens the views control
- **THEN** the three render as a group at the top, with no delete offered

#### Scenario: A seeded view is copied, not edited away

- **GIVEN** a seeded view
- **WHEN** a user duplicates it and changes the columns
- **THEN** the copy is theirs, and the seeded view is unchanged

### Requirement: A view declares the actions it offers

A saved view SHALL be able to declare which row actions and bulk actions
it offers. The renderer SHALL intersect the declared list with the
actions the user may run on the object, so a view SHALL only remove an
action and SHALL never add one. A view declaring no actions SHALL offer
the page's actions.

#### Scenario: A triage view offers three actions

- **GIVEN** a view declaring assign, reject and close
- **WHEN** a user opens a row menu in that view
- **THEN** only those three of the page's actions are offered, and only those the user may run

#### Scenario: A view cannot widen a permission

- **GIVEN** a view declaring an action the user may not run on the object
- **WHEN** the row menu renders
- **THEN** the action is absent

@e2e exclude the intersection is an authorization read already covered by the permission tests; unit-tested on the renderer.
