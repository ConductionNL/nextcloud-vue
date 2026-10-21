# timeline-widget

## ADDED Requirements

### Requirement: A timeline can read an app endpoint with type chips

A timeline's `endpointSource` SHALL read its endpoint for the record, a page at a time, and show each item as an event with its label, its detail cut at 120 characters, and a meta line of its type label and author. "Load more" SHALL read the next page while there is one. With `typeChips`, All and one chip per type SHALL be drawn as pressed toggles; a chip SHALL send its type and read from the first page. A failed read SHALL say that the activities could not load.

#### Scenario: Only the tasks
- **WHEN** the user presses the Tasks chip
- **THEN** the endpoint is read with `types[]=task` from page 1
