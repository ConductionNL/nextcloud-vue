## ADDED Requirements

### Requirement: A board dialog's checkbox is the native box

In a board dialog, a checkbox that is not a button variant SHALL be drawn as an 18px square with a 2px corner: a grey 1px edge while open, and a primary fill with a white tick once checked. The component's glyph SHALL stay in place but be hidden.

#### Scenario: an open checkbox in a board dialog
- GIVEN a CnDialog in the board look with an unchecked NcCheckboxRadioSwitch
- WHEN it renders
- THEN the box is 18px with a grey 1px edge and the glyph is not visible

#### Scenario: a checked checkbox in a board dialog
- GIVEN the same checkbox, checked
- WHEN it renders
- THEN the box is filled in the primary colour with a white tick
