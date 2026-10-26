## ADDED Requirements

### Requirement: A record list avatar can be the small circle

A record list SHALL draw its avatar as a 32px circle 12px from the title when `avatar.size` is 32, and as the 36px circle otherwise.

#### Scenario: the advice requests on a case
- **GIVEN** a list with `avatar: { text: "{advisor}", size: 32 }`
- **WHEN** it draws a request from Mobiliteit en verkeer
- **THEN** the row SHALL lead with a 32px "MV" circle 12px before the title
