## ADDED Requirements

### Requirement: a board conflict card's choices are 34px outline buttons

Under the board look, each choice button of a CnConflictResolveCard MUST be 34px tall, 14px in at both sides, with a transparent background, a 1px `--cn-board-control-border` border and the main text colour at 14px/600. Without the board look the buttons MUST stay NcButton secondary.

#### Scenario: DqInspectie sync frame
- GIVEN the board look and an open conflict record
- WHEN the conflict card renders "Deze houden" and "Die van kantoor"
- THEN both are 34px outline buttons without a fill

#### Scenario: Nextcloud look
- GIVEN an app without the board look
- THEN the conflict card's buttons are NcButton secondary as before
