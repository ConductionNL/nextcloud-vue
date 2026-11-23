# card-layout-note Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [card-layout-note](../../)

## Purpose

A record card can carry a short toned line of its own, as the boards draw a cover note.

## ADDED Requirements

### Requirement: A record card can draw a toned note under its meta line

The card record layout SHALL accept `note`, `{ field, formatter?, formatterOptions?, tone? }`. The card SHALL read the
field through the formatter as a meta part does, draw the text as a line under the meta line, and leave the line out
while the text is empty. `tone` `purple` or `teal` SHALL ink the line in that tone's pill text colour; without a tone
the line SHALL take the soft text colour. The line SHALL be 13px at weight 600.

#### Scenario: DqAanMijToegewezen, a covered case

- GIVEN the my-work cards with `note: { field: "coveredFor", formatter: "coveredFor", tone: "purple" }`
- AND a case the reader covers for Anouk Bakker until 10 October
- THEN the card reads "Voor Anouk Bakker, tot 10 okt" under "Woo-verzoek · Stichting Kindzorg", in the purple ink

#### Scenario: The reader's own case

- GIVEN a case without `coveredFor`
- THEN the card draws no note line
