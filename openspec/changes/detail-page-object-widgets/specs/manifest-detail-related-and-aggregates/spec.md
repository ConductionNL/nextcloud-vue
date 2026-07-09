# manifest-detail-related-and-aggregates

## ADDED Requirements

### Requirement: Detail-page files widget MUST bind to the current object's folder

A `files` widget placed on a manifest `detail` page MUST list, upload, and delete
files against the **current object's** OpenRegister file folder
(`/apps/openregister/api/objects/{register}/{schema}/{id}/files`), deriving the
object context from the loaded object (`object-data['@self']`). Uploading a file
(including drag-drop) MUST attach it to that object. The placement-based
dashboard files widget MUST remain unchanged for dashboard use.

#### Scenario: Drop a file on an object's detail page
- GIVEN a pet detail page with a `files` widget
- WHEN the user uploads a photo
- THEN the file is attached to that pet's object folder
- AND it appears in the widget's list
- AND it is returned by `GET /api/objects/{register}/{schema}/{id}/files`

#### Scenario: Dashboard files widget is unaffected
- GIVEN a `files` widget on a dashboard page
- WHEN it renders
- THEN it continues to use the placement-folder endpoints, not the object-files endpoint

### Requirement: Related widget MUST render an object's non-empty relation groups

`CnRelatedObjectsWidget` on a manifest detail page MUST resolve the object's
register/schema/id (from props or `object-data['@self']`) and fetch `/uses`,
`/used`, and `/relations`. It MUST render every group that has at least one item
— `objects` (the union of `/uses` and `/used`), `files`, and the leaf groups
returned by `/relations` (mails, events, contacts, notes, tasks, deck). Groups
that are genuinely empty MAY stay hidden.

#### Scenario: Reverse relations show up
- GIVEN a pet object referenced by two visits and one order
- WHEN its detail page renders the related widget
- THEN an "objects" group lists those visits and the order

#### Scenario: Linked calendar events show up
- GIVEN a visit object with a linked calendar event (`/relations` events group has one item)
- WHEN its detail page renders the related widget
- THEN an events group lists that appointment
