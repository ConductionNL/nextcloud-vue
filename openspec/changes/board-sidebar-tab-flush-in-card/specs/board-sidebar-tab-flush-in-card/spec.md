## ADDED Requirements

### Requirement: A sidebar tab in a page card adds no padding of its own

In the board look, a sidebar tab rendered by CnDetailWidgetHost SHALL have no
padding, so its content starts at the card's padding.

#### Scenario: the Files tab on the case page
- GIVEN the board look and the case Files tab in its card
- THEN the files toolbar and table start at the card's 22px inset
