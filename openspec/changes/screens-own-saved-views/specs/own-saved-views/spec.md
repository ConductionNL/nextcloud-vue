# own-saved-views Delta: screens-own-saved-views

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-own-saved-views](../../)

## Purpose

Let a dashboard list the signed-in user's own saved views with a link into the index page that applies each.

## ADDED Requirements

### Requirement: A dashboard lists the reader's own saved views

A `saved-views` widget SHALL list the signed-in user's saved views that belong to its configured source (`register`
and `schema`, or `scope`), newest first, up to `limit`. With `own: false` it SHALL also list views shared with the user.
Each entry SHALL link to the configured `route` with the view's filters, search and sort as the route query. With no
views it SHALL say so, and when the views cannot be read it SHALL say that.

#### Scenario: Van mij

- **GIVEN** the user has "Van mij, alle statussen" over tickets and a colleague has a view over tickets
- **WHEN** the widget renders with `route: "Tickets"`
- **THEN** only the user's view is listed, linking to Tickets with its filters in the query

### Requirement: A view can show how many records it matches

With `showCounts: true` each entry SHALL show the total its filters match, read with one list request; an entry whose
count failed SHALL show its name only.

#### Scenario: Count

- **GIVEN** `showCounts: true` and a view that matches 9 tickets
- **THEN** the entry reads "Van mij, alle statussen (9)"
