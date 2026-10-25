## ADDED Requirements

### Requirement: The second line shows the file's date

A `secondLine` or `nameSecondary` field `modified` with a date format SHALL
show the file's modification date.

#### Scenario: type, size and date
- GIVEN `secondLine: ["type", "modified|longdate:year"]`
- THEN a PDF modified in 2026 reads "PDF · <day> <month> 2026"
