## ADDED Requirements

### Requirement: a stacked bar can be drawn as the compact summary box

CnStackedBarWidget MUST accept `content.compact: true` and then draw a box on the sunken ground with a 15px heading, one 8px bar of joined segments and the legend on one line with the count beside its label. Without it the widget MUST draw as before.

#### Scenario: DqZaakDocumenten
- GIVEN the review summary with `compact: true` and 2/1/1 verdicts with 3 still open
- THEN the box reads "4 van 7 beoordeeld", one thin bar, and "Openbaar 2 · Deels openbaar 1 · Niet openbaar 1 · Nog beoordelen 3" on one line
