# index-lenses-in-list-card Delta

## ADDED Requirements

### Requirement: The quick filters can sit in the list card

An index page MAY declare `quickFilterPlacement: "card"`. The quick filters SHALL then render as a segmented control
with their counts at the top of the list card, followed by `quickFilterCaption` when declared, and the `filterStrip`
SHALL render in the same card under them. The lenses SHALL stay when the active lens has no rows. Other placements
SHALL be unchanged.

#### Scenario: Board PqWachtrij

- **WHEN** the queue declares `quickFilterPlacement: "card"`, `quickFilterCaption: "Kind, then channel"` and a
  `filterStrip` on channel
- **THEN** the list card opens with the segmented control "Alle 12 · Verzoeken 6 · Klachten 1 · Contactmomenten 5" and
  "Soort, dan kanaal" beside it
- **AND** the channel strip is under it, in the same card
- **AND** no lens pills are drawn above the card or in the toolbar
