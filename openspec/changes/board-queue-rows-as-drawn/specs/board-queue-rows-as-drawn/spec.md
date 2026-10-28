# board-queue-rows-as-drawn

## ADDED Requirements

### Requirement: A board list view row wraps its title and meta as the board draws it

In the board look a list view row MUST pad 12px 18px with 14px between its cells, and its title (15px) and meta line
MUST wrap inside the title column at their normal leading instead of ending in an ellipsis.

#### Scenario: A long meta line wraps

- GIVEN the team queue in the list view in the board look
- WHEN a row's meta line is wider than the title column
- THEN the meta line continues on a second line and the row grows

### Requirement: Team today reads at the normal leading

In the board look the team workload widget MUST set each person's name and availability line at their normal leading.

#### Scenario: Six people

- GIVEN a team of six in "Team vandaag"
- WHEN the card renders in the board look
- THEN each person takes 58px including the 14px between people
