## ADDED Requirements

### Requirement: A facts entry can write a moment as today's time or its date

With `format: "today-time"`, a facts entry MUST write a moment from today as its time ("10:24") and a moment on another day as its board date.

#### Scenario: A lookup this morning
- GIVEN a client verified in the BRP today at 10:24
- THEN "Bron" reads "BRP, opgezocht 10:24, vastgelegd"
