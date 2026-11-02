## MODIFIED Requirements

### Requirement: A title column's secondary line runs at a normal line height

Under the board look, the secondary line of a table's title column SHALL run at a normal line height, 2px under the title, whether or not the column is marked to wrap.

#### Scenario: a narrow title column
- **GIVEN** the case list beside the open sidebar, its title column 82px wide
- **WHEN** "2026-4837 · Linda Bakker" wraps over three lines
- **THEN** each line is 16.8px and the line starts 2px under the title

#### Scenario: one line
- **GIVEN** a title column wide enough for its secondary line
- **THEN** the line takes 18.8px, as it did at 1.35
