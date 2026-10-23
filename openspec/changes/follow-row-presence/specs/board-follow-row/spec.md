# board-follow-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [follow-row-presence](../../)

## ADDED Requirements

### Requirement: The follow row can say who else is looking

A detail page with `followRow.presence: true` SHALL subscribe to the record's presence and, in the board look's follow
row, SHALL draw the initials of the others who have the record open and one sentence naming the first by display name
and counting the rest, before the Follow control; it SHALL draw nothing while nobody else is there. With
`followRow.count: false` the Follow control SHALL show no follower count. Without `followRow` the page SHALL not
subscribe to presence for the row.

#### Scenario: DqZaak

- **GIVEN** Anouk Bakker has the case open
- **WHEN** Pieter opens it
- **THEN** the follow row reads "AB Anouk Bakker kijkt nu ook naar deze zaak · Volgen" and shows no follower count
