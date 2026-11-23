## ADDED Requirements

### Requirement: A plain title's secondary line runs at a normal line height

In the board look the 13px secondary line under a `rowTitle: "plain"` title SHALL run at line-height normal, 2px under the title, as the boards draw it. Nextcloud's default look and the link and text titles are unchanged.

#### Scenario: Pipelinq tasks
- GIVEN PqTaken, whose title column is plain with the client as its secondary line
- THEN the secondary line is 13px at a normal line height, not the table's 1.35 (17.55px)
- AND the row is 2.5px lower, as the board draws it

#### Scenario: Dossiq tables do not move
- GIVEN a dossiq table, which never sets `rowTitle: "plain"`
- THEN its rows keep their height
