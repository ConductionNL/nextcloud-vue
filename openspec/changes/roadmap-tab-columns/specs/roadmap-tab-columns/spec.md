## ADDED Requirements

### Requirement: A roadmap can be drawn as three columns

A roadmap tab with `layout: "columns"` SHALL request open and closed issues and SHALL draw three columns with their
counts: Planned (open issues without an in-progress label), In development (open issues with one) and Available (closed
issues whose `state_reason` is `completed`). A closed issue not completed SHALL be left out. Without the layout the tab
SHALL request and draw as before.

#### Scenario: three fixture issues
- **GIVEN** one open issue, one open issue labelled "in progress" and one issue closed as completed
- **THEN** each column holds one issue and shows the count 1
