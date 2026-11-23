## ADDED Requirements

### Requirement: The flow board header draws the board's switch and icons

The flow board header MUST draw Active as an accessible switch at the board's size with its label beside it, put a check
icon on Save, and an icon on the test button.

#### Scenario: Pausing a flow
- GIVEN an active flow
- WHEN the user presses the Active switch
- THEN the switch reads unchecked, the label reads "Paused" and the flow is marked changed
