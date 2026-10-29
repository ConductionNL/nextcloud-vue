# template-date-not-shadowed

## ADDED Requirements

### Requirement: A template's own date format is not shadowed by a built-in formatter

A template token `{x|date}` or `{x|datetime}` MUST use the template's board date when the formatter under that name is
the library's built-in one, and MUST use the app's formatter when the app declares its own.

#### Scenario: A deadline this year

- GIVEN the built-in formatters on the page
- WHEN a map list renders `{deadline|date}` for 28 October of the current year
- THEN it reads "28 okt"
