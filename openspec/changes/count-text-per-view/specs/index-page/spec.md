# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [count-text-per-view](../../)

## Purpose

The count line under an index page's title can say what the open view shows.

## ADDED Requirements

### Requirement: The count line can differ per view

CnIndexPage SHALL take `countTextByView`, an object keyed by view (`table`, `cards`, `list`, `board`, `map`) whose
values are count line templates as `countText`. In the board look the count line SHALL use the open view's template when
it names one, else `countText`. A scope's own `countText` SHALL be used before it. A query preset or a saved view that
sets `countText` SHALL set the page's `countTextByView` aside.

#### Scenario: DqWerkbord

- GIVEN the cases page with `countText` "{shown} of {total} open cases in your teams, sorted by deadline" and
  `countTextByView.board` "{shown} of {total} open cases in your teams · board view by status"
- WHEN the board view is open
- THEN the line reads "8 van 48 lopende zaken in uw teams · bordweergave per status"

#### Scenario: DqZaken

- GIVEN the same page with the table open
- THEN the line reads "8 van 48 lopende zaken in uw teams · gesorteerd op termijn"

#### Scenario: A saved view with its own line

- GIVEN the team queue view, whose overrides set `countText`
- WHEN its board view is open
- THEN the line is the view's `countText`, not the page's board line
