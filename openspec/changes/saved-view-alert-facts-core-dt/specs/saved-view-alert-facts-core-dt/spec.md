## ADDED Requirements

### Requirement: The saved search facts sit at the card edge

The saved view alert widget SHALL draw its Name and Now facts start-aligned at the card's content edge, with no padding,
margin or fixed width from Nextcloud core's `dt`/`dd` rules.

#### Scenario: Inside Nextcloud
- GIVEN the widget in an index page's side panel on a Nextcloud server
- THEN "Name" starts at the card's inner edge and its value follows after a 16px gap
