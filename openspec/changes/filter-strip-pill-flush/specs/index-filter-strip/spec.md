# index-filter-strip Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [filter-strip-pill-flush](../../)

## ADDED Requirements

### Requirement: The filter strip pills stand 8px apart

The filter strip's pills SHALL stand 8px apart, also where the server's plain button rule adds a margin, and the active
pill SHALL draw no edge.

#### Scenario: PqWachtrij channel strip

- **GIVEN** the queue with `filterStrip` on `channel`
- **THEN** "Alle", "Telefoon", "E-mail" and "Mijn Zuiddrecht" stand 8px apart and "Alle", the active one, has no edge
