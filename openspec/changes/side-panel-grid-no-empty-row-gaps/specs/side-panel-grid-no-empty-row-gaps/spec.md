## ADDED Requirements

### Requirement: An absent part adds no space

In the board look an index page with a side panel SHALL put one section gap between its header and its toolbar when it
has no below-header, stat row or chip row, and no more.

#### Scenario: Search results
- GIVEN /search?q=Lindelaan with a side panel and the chips inside the toolbar
- THEN the toolbar starts one section gap under the header, level with the side panel
