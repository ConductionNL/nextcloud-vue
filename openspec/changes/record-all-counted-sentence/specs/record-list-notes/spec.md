# record-list-notes Delta

## ADDED Requirements

### Requirement: The record-all sentence can count the notes filled in

A notes list's `recordAll.text` SHALL take a plain sentence or count forms `{ zero?, one?, other }` in which `{count}`
is the number of rows with a note filled in and not yet recorded; the form follows that number as it changes. With
`recordAll.placement.sentence: true` the list SHALL draw the sentence in the placed card, above the ruled band with the
button pair.

#### Scenario: Two notes filled in

- **GIVEN** "Klaar voor vandaag?" with the placed sentence and two of three rows filled in
- **THEN** the card reads "De knop legt de 2 ingevulde notities en hun uren vast op hun zaak." above Annuleren and Dag afsluiten

#### Scenario: The placed sentence replaces the card's own text

- **GIVEN** "Klaar voor vandaag?" is a text card whose text widget sets its display in its style attribute
- **WHEN** the list places its sentence in that card
- **THEN** only the placed sentence shows; the card's own text is hidden, so the card is as tall as drawn (DqDagAfsluiten r44: 247 vs 183 with both texts)
