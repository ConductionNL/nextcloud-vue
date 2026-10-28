## ADDED Requirements

### Requirement: A toggle can draw as a checkbox

A workspace-filter toggle with `control: "checkbox"` SHALL draw a checkbox instead of a switch and write the same on and off values.

#### Scenario: PqMijnWerk "Toon afgerond"
- GIVEN the lens bar declares the show-completed toggle with `control: "checkbox"`
- THEN it draws a checkbox, and checking it writes true to `showDone`

#### Scenario: Default
- GIVEN a toggle without `control`
- THEN it draws a switch
