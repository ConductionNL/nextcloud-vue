# board-queue-inks

## ADDED Requirements

### Requirement: A board queue row's deadline reads in the tag inks

In the board look a list row's trailing date cell MUST read in the status badge error ink at weight 700 when its rule
says error, and in the warning ink at weight 600 when it says warning.

#### Scenario: Four days left

- GIVEN a team queue row whose deadline rule gives error for fewer than five days left
- WHEN the deadline is four days away
- THEN "nog 4 dagen" reads in the error tag ink at 700

### Requirement: A board record list table head has no ground

In the board look a record list drawn as a table MUST NOT draw a background behind its head row.

#### Scenario: A themed instance

- GIVEN a theme that gives table heads a grey background
- WHEN the Werkvoorraad per zaaktype table renders in the board look
- THEN its head row stands on the card's white
