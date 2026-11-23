## ADDED Requirements

### Requirement: A plain log's prose cell runs at line height 1.45

In the board look, a wrapping cell in a plain-log table SHALL have line-height 1.45.

#### Scenario: the contact summary
- GIVEN DqZaakContact's contact moments with a two-line summary
- THEN the row is about 61.6px high

### Requirement: A short wrapped value keeps the normal line height

In the board look, a wrapping plain-log cell that also carries `cn-cell--leading-normal` SHALL keep the table's normal
line height, for short values such as a question or a model name that wrap over two lines.

#### Scenario: the AI log
- GIVEN DqZaakAssistent's AI log with the question and model columns as `cn-cell--wrap cn-cell--leading-normal`
- THEN a row whose question wraps over two lines is 57px high
