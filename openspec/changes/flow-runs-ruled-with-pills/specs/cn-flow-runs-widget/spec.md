## ADDED Requirements

### Requirement: Flow runs can read as a ruled list with status pills

With `statusPill`, each run SHALL show its status as a pill, its rows ruled on top, and the meta line without the status. `statusLabels` and `triggerLabels` SHALL name a status and a trigger in words. `age: 'datetime'` SHALL show when a run started. `historyTitle: false` and `quietLineWithHistory: false` SHALL leave out the "Earlier runs" heading and the "nothing running" line. Without these options the widget SHALL look as before.

#### Scenario: a case's flows
- **GIVEN** a case with a completed run started by its creation
- **THEN** the row reads "Ontvangstbevestiging versturen", "Gestart bij het aanmaken van de zaak", a "Gelukt" pill and "3 okt, 14:32", with no heading and no "nothing running" line
