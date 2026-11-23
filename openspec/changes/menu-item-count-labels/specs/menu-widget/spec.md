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

### Requirement: A menu item can depend on the record

A menu item's `visibleIf` SHALL be evaluated against `{ object }`, the detail page's record, and the item SHALL be left
out while it fails or while no record is known.

#### Scenario: A campaign without page content

- **GIVEN** an item with `visibleIf { "object.articleBody": { truthy: true } }`
- **WHEN** the campaign's `articleBody` is empty
- **THEN** the item SHALL NOT render

### Requirement: A menu widget in a detail page's side column reads the record and carries its card title

The menu widget SHALL take the detail page's `objectId` and `objectData` props, as the side column passes them to every
renderer, for `@objectId` in a `countFrom` filter and an item's `visibleIf` on `object.<field>`, ahead of an injected
object context. It SHALL show the card `title` the host passes it as a heading above the items.

#### Scenario: In deze campagne

- **GIVEN** the campaign page's side card "In deze campagne" as a menu widget
- **WHEN** the page renders campaign camp-2
- **THEN** the counts SHALL be asked for campaign camp-2 and the card SHALL be titled "In deze campagne"
