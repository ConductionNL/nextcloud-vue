# saved-view-kept-in-route Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-kept-in-route](../../)

## Purpose

An index page applied from a saved view's address keeps naming that view while it shows it.

## ADDED Requirements

### Requirement: The address keeps naming the applied view

`savedView` in the address SHALL NOT be read as a record filter. While the address names the applied saved view, a
route write that does not name a view SHALL keep `savedView` as long as the filters are the view's; a write after the
filters changed SHALL drop it. Applying a view from a control that did not come from the address SHALL NOT add it.

#### Scenario: My work stays applied

- **GIVEN** `/cases?savedView=default:my-work`, a view with `overrides.sortOption`
- **WHEN** the saved views load and the view is applied with its sort option
- **THEN** every route write keeps `savedView=default:my-work` and the list stays on the view

#### Scenario: A filter change leaves the view

- **GIVEN** the view applied from its address
- **WHEN** the reader clears the assignee filter
- **THEN** the address no longer names the view
