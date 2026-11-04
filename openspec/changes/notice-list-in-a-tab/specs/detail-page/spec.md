# detail-page Delta: notice-list-in-a-tab

## ADDED Requirements

### Requirement: The board look draws the primary button last

In the board look a detail page's primary button SHALL stand at the end of the header row, after the quick actions, Edit, the buildiq square and the Actions menu. It SHALL stay first in the reading and tab order. The Nextcloud look SHALL be unchanged.

#### Scenario: the portal page on its notices tab
- GIVEN the portal page with the quick action Website bekijken and the primary action Nieuwe mededeling
- WHEN the notices tab is open in the board look
- THEN the header reads Website bekijken, Bewerken, the buildiq square, Meer, Nieuwe mededeling
