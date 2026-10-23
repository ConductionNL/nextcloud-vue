# facts-widget Delta: facts-from-object

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-from-object](../../)

## Purpose

Let one facts card mix the object it shows with the page's own object.

## ADDED Requirements

### Requirement: An entry can read the page object on a sourced card

A facts entry with `from: "object"` SHALL read its value from the page's object (`objectData`) even when the card
shows a `source` object. Entries without it SHALL read the shown object, as before.

#### Scenario: A client card with the ticket's channel

- **GIVEN** a ticket with channel "Telefoon" whose client has channel "Mijn Zuiddrecht", and a card with the client as source
- **WHEN** one entry reads `channel` with `from: "object"` and another reads `channel` without it
- **THEN** the first shows "Telefoon" and the second "Mijn Zuiddrecht"

#### Scenario: The source finds nothing

- **GIVEN** a facts card with a `source` filtered on the page object, and an entry with `from: "object"`
- **WHEN** the source finds no record
- **THEN** the `from: "object"` entry still shows and the source's entries are left out (DqTenant's Status card for an organisation without a subscription)

