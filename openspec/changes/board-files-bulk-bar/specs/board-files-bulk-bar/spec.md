## ADDED Requirements

### Requirement: the files bulk bar is the board's selection band

In the board look CnFilesBrowser's bulk bar MUST have 10px 14px of padding and a 10px radius, its count bold (700) in the primary light ink, and its buttons 34px high with 0 12px of padding and no icon. The Nextcloud look MUST keep its own bar.

#### Scenario: DqDocumentenBeheer two files ticked
- GIVEN two files ticked on the case's Files tab in the board look
- THEN the band reads "2 documenten geselecteerd" followed by 34px buttons with words only

#### Scenario: DqDocumentenBeheer band spacing

- **GIVEN** two files ticked in a board file list
- **THEN** the band stands 10px under the bar and 14px over the list
