## ADDED Requirements

### Requirement: A mail tab in a page card reads as the card

In the board look, a CnMailTab rendered by CnDetailWidgetHost SHALL have no
padding, a 12px gap between its parts, its heading at 17px weight 700 and its
description at 14px.

#### Scenario: the case E-mail tab
- GIVEN the board look and the case page's E-mail card
- THEN "E-mail" starts at the card's 22px/20px inset at 17px/700
