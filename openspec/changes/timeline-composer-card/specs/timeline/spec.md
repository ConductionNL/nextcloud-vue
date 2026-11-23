## ADDED Requirements

### Requirement: The note form can be its own card

A manage timeline with `composer: "only"` SHALL draw the note form and nothing
else. A manage timeline with `composer: "separate"` SHALL draw no form, and
its "Add note" SHALL ask the form of the same object to take focus. A note
saved from a form card SHALL make the list of the same object read again.

#### Scenario: DqZaakHistorie
- GIVEN a case history tab stacking the list (`composer: "separate"`) and the form (`composer: "only"`)
- WHEN the handler writes a note in the "Notitie toevoegen" card and saves it
- THEN the note is posted once to the case's timeline
- AND the "Historie van de zaak" list reads the timeline again
