## ADDED Requirements

### Requirement: a multiple select in a board dialog is the board's 40px field

In a board dialog a multiple NcSelect MUST draw a 40px-high, 1px edge on its toggle, so its chosen chips sit inside the field, and its search MUST NOT draw a second edge. When it has focus the toggle MUST show a visible focus indication: the edge in the text colour and the outline ring.

#### Scenario: sharing a saved view with two or more people
- GIVEN the share dialog of a saved view in the board look with three chosen sharees
- THEN the three chips sit inside the field's 1px edge
- AND when the search has focus the edge turns the text colour and the ring shows
