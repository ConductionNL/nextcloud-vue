# index-page Delta: groups-pane-reads-every-page

## ADDED Requirements

### Requirement: The groups pane reads every group

The groups folder source SHALL read `cloud/groups/details` page after page until a page is not full, so no group the reader may list is left out.

#### Scenario: 238 groups
- GIVEN 238 groups at 200 per page
- THEN two pages are read and all 238 groups are listed
