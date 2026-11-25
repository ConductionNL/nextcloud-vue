# index-list-board-look Delta: footer-note-in-the-default-look

## ADDED Requirements

### Requirement: The default look shows its footer note

An index page in the default look SHALL show its footer note in the footer: after the page info while the list is
paged, and alone while a non-empty list needs no pager (one page, no more rows than `minItemsToShow`). Without a
note, the default look's footer SHALL be drawn as before.

#### Scenario: A one-page list in the default look

- **GIVEN** an index page in the default look with `footerNote` "A feed is declared by its app in lib/Settings/feeds.json." and four rows
- **WHEN** the page opens
- **THEN** the footer shows that note
- **AND** no page info and no page-size select are drawn

#### Scenario: A paged list in the default look

- **GIVEN** an index page in the default look with a footer note and three pages
- **WHEN** the page opens
- **THEN** the footer shows the page info, the note, the page links and the page-size select
