# index-page Delta: board-count-line-show-count

## ADDED Requirements

### Requirement: A board page can leave out its count line

In the board look, when `showCount` is false and the page sets neither countText nor countSubtitle, the header description SHALL be the page description without the default count line.

#### Scenario: Afdelingen
- WHEN dossiq's departments page sets showCount false
- THEN no "5 van 5" line shows under the title
