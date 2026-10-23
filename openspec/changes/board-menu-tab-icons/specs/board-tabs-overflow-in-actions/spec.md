## ADDED Requirements

### Requirement: Board menu tabs show their icon

A tab listed in the board-look Actions menu SHALL show its icon (the tab's
`icon`, else its widget's `icon`) in front of its label. A tab without an icon
SHALL show its label alone.

#### Scenario: Notities in the case Actions menu
- GIVEN a board-look tabs widget whose overflow tab Notes declares `icon: "NoteTextOutline"`
- WHEN the Actions menu lists it
- THEN the item draws the NoteTextOutline icon before "Notes"
