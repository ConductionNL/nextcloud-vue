## ADDED Requirements

### Requirement: a file side card's facts are not drawn by core's dl rules

CnFilesBrowser's side facts MUST set their `dt` and `dd` as blocks with no fixed width, start-aligned text, no padding and normal wrapping, so core's apps.css cannot right-align the labels.

#### Scenario: DqDocumentenBeheer "Controlegetal"
- GIVEN a ticked file's checksum card
- THEN "SHA-256" stands at the start of its column, the value beside it
