## ADDED Requirements

### Requirement: A term reads in words with its extension

A data widget field or a facts entry with `format: 'duration'` SHALL show a one-unit ISO-8601 period in words, reading a whole number of weeks given in days as weeks. With `extendBy`, an extension period the object holds SHALL follow as "{term}, extendable by {extension}", with the extension's unit left out when it matches the term's. A value that is not a one-unit period SHALL be shown as stored.

#### Scenario: a Woo term
- **GIVEN** a case with statutoryTerm `P28D` and statutoryExtension `P14D`
- **THEN** the row reads "4 weken, te verdagen met 2"

#### Scenario: no extension
- **THEN** the row reads "4 weken"
