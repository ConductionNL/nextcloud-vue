# saved-view-menu-settings Delta: saved-view-summary-tokens-in-words

## ADDED Requirements

### Requirement: A saved view's summary reads tokens and ranges in words

The summary SHALL render `@me`, `@myTeam` and `@today` (with a day shift) in words, and SHALL fold a field's `[gte]`/`[gt]` and `[lt]`/`[lte]` filters into one range named in words ("within 7 days" for a range from today).

#### Scenario: Termijn deze week
- GIVEN filters assignee @me, status open, deadline[gte] @today, deadline[lt] @today+7d
- THEN the line reads "Behandelaar jij, status lopend, deadline binnen 7 dagen"
