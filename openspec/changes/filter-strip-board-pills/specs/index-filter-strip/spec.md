# index-filter-strip Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [filter-strip-board-pills](../../)

## ADDED Requirements

### Requirement: The filter strip stands under the toolbar in the board's pills

The filter strip SHALL stand between the toolbar and the list, also on a page with a side panel. Its pills SHALL be
34px, radius 17, outlined, 14px at 600, the active one in ink, also where the server's plain button rule applies.

#### Scenario: PqWachtrij channel strip

- **GIVEN** the queue with `filterStrip` on `channel` and the "Team vandaag" side panel
- **THEN** "Alle", "Telefoon", "E-mail" and "Balie" stand under the quick filters as outlined 17px pills, not under the
  list as tonal 8px buttons
