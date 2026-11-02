## ADDED Requirements

### Requirement: An action tile is drawn as the board draws it

In the board look an action tile SHALL put 10px between its icon and its label, and SHALL draw the label at 14px on a normal line height. Nextcloud's default look keeps the 12px gap and the inherited label size.

#### Scenario: Pipelinq call workspace
- GIVEN PqWerkplekKlant, whose "Snelle acties" row is an `action-tiles` widget
- THEN each tile is 97px high: 16px padding, the 36px icon, 10px, a 14px label at normal leading, 16px padding
- AND the label is 14px

#### Scenario: Nextcloud's default look
- GIVEN a page outside the board look
- THEN the tile keeps its 12px gap and the label its inherited size
