# board-report-card-rhythm Delta

## ADDED Requirements

### Requirement: A board workspace filter label sits 6px over its field

Under the board look, a workspace filter field SHALL set its label at the
font's normal line height, 6px over its input.

#### Scenario: The quarter form

- **GIVEN** the DqTermijnen quarter form under the board look
- **WHEN** it renders
- **THEN** the label and the 40px field together are 63px tall

### Requirement: A stacked list in plain sections is spaced by the sections gap

Under the board look, a stacked record list in plain sections on a dashboard
SHALL add no bottom padding of its own.

#### Scenario: The quarterly summary line

- **GIVEN** the quarterly report card with `gap: 12` and a stacked summary list
- **WHEN** it renders
- **THEN** the summary line sits 12px under the table and the card's padding follows it directly

### Requirement: A stat in plain sections is a figure of its card

Under the board look, a stacked board stat in plain sections on a dashboard
SHALL draw no tile padding, frame or ground, its label 4px over its number at
the font's normal line height.

#### Scenario: The data warnings figure

- **GIVEN** the annual audit card's data-warnings stat
- **WHEN** it renders
- **THEN** it starts at the card's inset and is as tall as its label, 4px and its number
