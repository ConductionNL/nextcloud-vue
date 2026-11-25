## ADDED Requirements

### Requirement: A dashboard page saves its controls as a view

The `saved-views` widget with `content.workspace.keys` SHALL offer "Save view" on a dashboard page. Saving MUST create an OpenRegister saved view through the views API whose `query.workspace` holds the page workspace's value for every configured key (an unset key as the empty string) and whose `query.scope` is the widget's `content.scope`. After saving, the list MUST be read again so the new view shows.

#### Scenario: Save the current filters
- **GIVEN** the page workspace holds `lens: tickets` and `priority: urgent`
- **WHEN** the reader saves the view as "Urgent tickets"
- **THEN** a view "Urgent tickets" is created with `query.workspace` `{ lens: 'tickets', priority: 'urgent' }` and the page's scope
- **AND** it appears in the list

### Requirement: A dashboard page lists its saved views with their counts

In `workspace` mode the widget SHALL list the views of the page's scope that store a workspace, and MUST NOT list views without one (an index page's views). With `content.workspace.count` each row MUST show how many items the view holds: the endpoint is read with the view's stored values for its `@workspace.<key>` tokens and the answer at `responsePath` is counted (a list's length, or a number). A failed count MUST leave only that row without a count.

#### Scenario: Rows with counts
- **GIVEN** the reader saved "Urgent tickets" and the count endpoint answers three items for it
- **WHEN** the page loads
- **THEN** the row reads "Urgent tickets (3)"

### Requirement: A dashboard page applies a saved view

Clicking a view SHALL write every stored value into the page workspace, so the page's controls and lists follow, and MUST update the address for the stored keys it already carries (an empty value removes the key).

#### Scenario: Apply a saved view
- **GIVEN** a view stores `lens: all` and `showDone: 1`
- **WHEN** the reader clicks it
- **THEN** the page workspace holds `lens: all` and `showDone: 1`, and `?lens=` in the address reads `all`

### Requirement: A dashboard page deletes a saved view after confirmation

The reader's own views SHALL carry a delete button; deleting MUST ask for confirmation first and, once confirmed, delete the view through the views API and read the list again. Views shared with the reader MUST NOT offer delete.

#### Scenario: Delete a saved view
- **GIVEN** the reader has a saved view "Urgent tickets"
- **WHEN** the reader deletes it and confirms
- **THEN** it is gone from the list
