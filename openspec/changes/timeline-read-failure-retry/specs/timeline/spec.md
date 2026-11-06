## ADDED Requirements

### Requirement: A failed timeline read can be tried again

A manage timeline whose read fails SHALL say so and SHALL offer Try again, which SHALL read the timeline again. With `errorTitle` or `errorText` set it SHALL use those words instead of the library's sentence. A failed save SHALL NOT offer Try again.

#### Scenario: DqZaakHistorie
- GIVEN a case history whose read fails
- WHEN the handler presses Try again and OpenRegister answers
- THEN the failure is gone and the history shows
