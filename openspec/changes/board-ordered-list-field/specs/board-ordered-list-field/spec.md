# board-ordered-list-field

## ADDED Requirements

### Requirement: An ordered list field draws its remove button and add select as the board

In the board look a CnOrderedListField row's labelled remove button SHALL be 34px high with a 1px control border on the main background, and the field's add select SHALL take the field's full width.

#### Scenario: Weergaven in mijn menu
- GIVEN the user settings dialog in the board look with Woo-verzoeken in the menu
- THEN "Uit menu halen" is an outlined button and "Kies een opgeslagen weergave" spans the section

### Requirement: An ordered list row's text keeps the board's lines

In the board look a CnOrderedListField row's name SHALL be drawn at weight 600 on a normal line height, and its description at a 1.45 line height.

#### Scenario: a two-line description
- GIVEN "Termijn deze week" in the user settings dialog with a description that wraps to two lines
- THEN the row is about 78px high, as the board draws it
