## ADDED Requirements

### Requirement: The saved views panel reads as the board

In the board look the saved-views panel SHALL draw a group heading at 15px/700 in the main ink, and a group's note and a
view's description at 13px/400 in the muted ink. The Dutch name of the shared group SHALL be "Gedeeld met mij".

#### Scenario: Pieter opens Weergaven on Cases
- GIVEN the board look
- THEN "Mijn weergaven" is 15px/700, "Bewaart de zoekterm ..." and "Mijn zaken, termijn binnen 7 dagen" are 13px muted
- AND the shared group is headed "Gedeeld met mij"
