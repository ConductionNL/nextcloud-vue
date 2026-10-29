# footer-note-per-view

## ADDED Requirements

### Requirement: The footer note can differ per view

An index page MUST read the open view's entry in `footerNoteByView` as its footer note when it has one, and MUST keep
`footerNote` for a view the map does not name. A saved view or query preset that sets its own `footerNote` MUST show it
in every view.

#### Scenario: Cards and table

- GIVEN `footerNote: "click a column header to sort · 20 per page"` and `footerNoteByView.cards: "sorted by deadline,
  ascending · sort in the side panel · 20 per page"`
- WHEN the reader switches from the table to the cards
- THEN the footer reads the cards note

#### Scenario: A saved view's own note

- GIVEN a saved view that sets `footerNote: "sorted by urgency"`
- WHEN it is applied in the cards view
- THEN the footer reads "sorted by urgency"
