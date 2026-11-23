## ADDED Requirements

### Requirement: a placement can start below every earlier row

A dashboard placement with `clear: true` MUST start below the lowest card that starts on an earlier layout row, in any column, after the cards are measured to their content, and MUST stay there outside edit mode.

#### Scenario: DqMijnWerk
- GIVEN My tasks and Recent activity on the side track reaching lower than Verder werken on the main track
- THEN "Zaken die u volgt" and "Mijn archiefbeoordelingen" both start under Recent activity

#### Scenario: DqMijnTeam
- GIVEN Wachtrij van uw team taller than Vastgelopen zaken beside it
- THEN "Zaken per status" and "Zaken per type" both start under Wachtrij van uw team
