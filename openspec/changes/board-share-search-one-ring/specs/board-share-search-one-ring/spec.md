## ADDED Requirements

### Requirement: The share field draws one focus ring

In the board look the share field's search input SHALL draw no border or outline of its own, and the field's toggle SHALL draw a 2px main-text ring while focus is inside it.

#### Scenario: DqFilterDelen
- GIVEN the share dialog of a saved view with "han" typed
- THEN the field reads one 2px ring in rgb(27, 28, 29) and no 1px primary line inside it

#### Scenario: Focused and closed
- GIVEN the share field has focus and its list is closed (Escape)
- THEN the 2px main-text ring still shows
