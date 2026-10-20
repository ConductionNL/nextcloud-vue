# record-list-notes Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-notes](../../)

## Purpose

A day-closing page is manifest config: a list collects and records a note per row, says why it is empty, and the header
names the day.

## ADDED Requirements

### Requirement: A record list can collect and record a note per row

A record list with `presentation: "notes"` and a `noteAction` SHALL draw per row its pill, title (a link to the route
named by `rowRouteField` or `rowRoute`), meta and due text, a field for the note, the `rowLeaf` integration leaf when it
is registered (or its `unavailableText` when its app is installed and the leaf is not), and a button that POSTs the note
to the row's notes URL. A typed note SHALL be kept in session storage until it is recorded and SHALL count toward the
"ready to record" figure the list shows. `recordAll` SHALL record every row with a note. After a recorded note the
page's endpoint widgets SHALL refetch; a note that fails to record SHALL be kept and the list SHALL say it failed.

#### Scenario: DqDagAfsluiten

- **GIVEN** the rows the reader opened today without a note
- **WHEN** the reader types a note on two rows, reloads, and presses "Dag afsluiten"
- **THEN** both notes are still there after the reload, the figure reads 2, and both are recorded on their own case or task

### Requirement: A record list can say why it is empty

A record list with `emptyTexts` SHALL, while it has no rows, show the text of the first entry whose `when` condition
holds, and `emptyText` when none holds.

#### Scenario: Nothing opened today

- **GIVEN** the reader opened nothing today
- **THEN** the list reads "You have not opened anything today." rather than "Everything you opened today has a note."

### Requirement: A dashboard header meta can name today

A dashboard's `headerMeta` SHALL have `{today}` replaced by today's date written out in the reader's locale.

#### Scenario: DqDagAfsluiten crumb

- **GIVEN** `headerMeta: "Close out your day, {today}"` on a Wednesday 7 October
- **THEN** the crumb's meta reads "Close out your day, Wednesday 7 October" in the reader's language
