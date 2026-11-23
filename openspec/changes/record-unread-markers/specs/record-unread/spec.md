# record-unread Specification

## Purpose

A user sees which records changed since they last looked, in lists and on
the record's tabs, and the record counts as read once they have seen it.
State and lens: OpenRegister `object-read-state`.

## ADDED Requirements

### Requirement: Lists mark unread records and filter on them

`CnIndexPage` SHALL render `CnUnreadMarker` in the first cell of every row
whose `@self.unread` is true and SHALL draw that row's title in bold, with a
visually hidden "Unread" label before it. `personalLenses` SHALL accept
`unread`, which appends the quick filter Unread `{_unread: true}`, combined
with every other filter. A row without `@self.unread` SHALL render as today.

#### Scenario: Only what changed

- **GIVEN** an index page with `personalLenses: ["unread"]` over 40 records of which 6 have `@self.unread: true`
- **WHEN** the user turns on Unread
- **THEN** the list query SHALL carry `_unread=true` and each returned row SHALL be bold with the marker

#### Scenario: A read row is plain

- **GIVEN** a row with `@self.unread: false`
- **WHEN** the list renders
- **THEN** no marker SHALL render and the title SHALL NOT be bold

@e2e include Change a record as one user; open the list as another; assert the row is bold with the marker; open the record; return; assert the row is plain.

### Requirement: Opening a record marks it read

`CnDetailPage` SHALL send `PUT /apps/openregister/api/objects/{register}/{schema}/{id}/read-state`
once per page load after the object's data has rendered, when the object
carries `@self.unread` and the page config does not set `markRead: false`.
It SHALL NOT send it when the object failed to load. It SHALL offer "Mark as
unread" in the Actions menu, which sends `DELETE .../read-state` and emits
`marked-unread`.

#### Scenario: An opened record is no longer unread

- **GIVEN** a record with `@self.unread: true`
- **WHEN** its detail page renders the object
- **THEN** exactly one `PUT .../read-state` SHALL be sent

#### Scenario: A page that fails to load marks nothing

- **GIVEN** a detail page whose object read answers 500
- **WHEN** the page settles
- **THEN** no `PUT .../read-state` SHALL be sent

#### Scenario: Mark as unread

- **GIVEN** a rendered detail page whose object carries `@self.unread`
- **WHEN** the user chooses Mark as unread
- **THEN** `DELETE .../read-state` SHALL be sent and `marked-unread` SHALL be emitted

#### Scenario: Turned off

- **GIVEN** a detail page config with `markRead: false`
- **WHEN** the page renders an unread object
- **THEN** no read-state call SHALL be sent

### Requirement: Tabs show what is new on them

`CnDetailPage` SHALL set a tab's count from `@self.unreadCounts[<unreadKey>]`,
where `unreadKey` defaults to the tab id, when the value is greater than 0
and the tab declares no count of its own. A key absent from the map, or 0,
SHALL show no badge.

#### Scenario: The files tab shows two new files

- **GIVEN** an object with `@self.unreadCounts: {files: 2}` and a tab with id `files`
- **WHEN** the page renders
- **THEN** the Files tab SHALL show the count 2

#### Scenario: A mapped tab

- **GIVEN** a tab with id `documents`, `unreadKey: "files"`, and `@self.unreadCounts: {files: 1}`
- **WHEN** the page renders
- **THEN** the Documents tab SHALL show the count 1

#### Scenario: Nothing new

- **GIVEN** `@self.unreadCounts: {notes: 0}`
- **WHEN** the page renders
- **THEN** the Notes tab SHALL show no badge
