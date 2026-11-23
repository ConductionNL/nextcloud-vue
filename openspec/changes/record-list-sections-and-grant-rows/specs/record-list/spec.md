## ADDED Requirements

### Requirement: A record list card can draw several sources as sections

A record list with `sections` SHALL draw one record list per entry, in order, in
one card. Each section SHALL read its own source and show its own empty and
error text, so a section that fails leaves the others standing. A section SHALL
take the card's other keys unless it sets them itself, and the card's footnote
and footer SHALL be drawn under the last section only. Without `sections` the
list SHALL read its one source as before.

#### Scenario: the Toegang card draws links and grants
- GIVEN a card whose first section reads the case's access links and whose second reads the case's grants
- WHEN both answer
- THEN the link rows are drawn first and the grant rows after them, under the card's rule and footnote

#### Scenario: the grants section fails
- GIVEN the same card
- WHEN the grants read answers 500
- THEN the grants section shows its error text, never an empty list, and the link rows stay

### Requirement: A meta line can depend on the row

A record list `meta` written as `{ cases: [{ when, text }], text? }` SHALL show the
text of the first case whose condition holds on the row, else its own `text`.

#### Scenario: an origin line
- GIVEN a grant row with `origin` `rule` and `matchedOn` `["caseType"]`
- AND a first case `{ when: origin is rule and matchedOn contains caseType, text: "via the case type" }`
- THEN the row's meta line reads "via the case type"

### Requirement: A row avatar can show an icon by the row

A record list `avatar.icon` (`{ field, map }`) SHALL draw the mapped icon in the
avatar circle for a row whose field value maps to one, and the initials otherwise.

#### Scenario: a group and a user
- GIVEN `avatar.icon` `{ field: "principal.type", map: { group: "AccountGroup" } }`
- THEN a group's row shows the group icon and a user's row shows the user's initials

### Requirement: A record list can hide rows by a condition

A record list SHALL leave out the rows read from an `endpointSource` or from
`objectRows` for which `hideWhen` holds.

#### Scenario: the service account
- GIVEN `hideWhen` `{ field: "principal.id", op: "in", value: ["dossiq-background-service"] }`
- THEN the service account's grant row is not drawn

### Requirement: A refused section can say why in the app's words

A record list reading an `endpointSource` with `refusalText` SHALL show that text
for a 401 or 403 answer, in place of the server's message.

#### Scenario: a colleague the case is not assigned to
- GIVEN the grants section with `refusalText` "Only the people this case is assigned to can see who has access"
- WHEN the read answers 403
- THEN the section shows that text
