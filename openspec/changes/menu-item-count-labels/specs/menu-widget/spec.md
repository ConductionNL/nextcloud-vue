## ADDED Requirements

### Requirement: A menu item can name its count in its label

A menu item with `countFrom` and `countLabel` SHALL show the translated `countLabel` with `{count}` filled in as its
label once the count is read, choosing `one` for a count of 1 and `other` otherwise, and SHALL NOT draw the count
badge. A `countFrom` filter SHALL resolve `@objectId` and the other filter tokens against the detail page's object
context; while a token is unresolved, no count is asked and the declared label shows.

#### Scenario: Newsletters of one campaign

- **GIVEN** a campaign page with an item `countFrom { register: pipelinq, schema: blast, filter: { campaign: '@objectId' } }` and `countLabel { one: '{count} newsletter', other: '{count} newsletters' }`
- **WHEN** the campaign has two newsletters
- **THEN** the item SHALL read "2 nieuwsbrieven" in Dutch, with no badge
