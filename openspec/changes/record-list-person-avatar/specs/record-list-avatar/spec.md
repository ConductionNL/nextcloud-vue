# record-list-avatar: delta for record-list-person-avatar

## ADDED Requirements

### Requirement: A record-list avatar can be the record card's person chip

A record list with `avatar.size: 40` MUST draw each avatar as a 40px circle with the initials 16px bold on the grey ground, also in a detail page's side column under the board look.

#### Scenario: the main contact of an organisation

- GIVEN an organisation page whose side card lists the main contact with `avatar: { text: "{name}", size: 40 }`
- WHEN the board look draws it
- THEN Sanne de Vries shows as "SV" in a 40px grey circle, 16px bold, 12px before her name
