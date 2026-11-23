# pl4-work-queue Delta: pl4-work-queue

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-work-queue](../../)

## Purpose

A work queue reads an endpoint that answers one flat list of mixed records.

## ADDED Requirements

### Requirement: A queue can read one flat list

CnWorkQueue with `content.itemsPath` SHALL read the list at that path as one group without a heading, and SHALL open
an item with a `routeName` at `{ name: routeName, params: { id } }`. `dueField`, `lateField`, `subField` and `kind`
SHALL read the due text, the late mark, a sub line and the translated kind from the item. With `totalPath` and
`viewAll`, a "View all ({count})" link SHALL show while the total exceeds the items shown. An empty list SHALL show the
empty text; a failed read SHALL show the error with a retry, never the empty text or a count of 0.

#### Scenario: My work on the operational dashboard

- **GIVEN** the worklist answers two items (a lead past its date and a request) and `total: 7`
- **THEN** the lead row reads "Lead", its stage and its date, and is marked late
- **AND** clicking the request opens `TicketDetail` with its id
- **AND** "View all (7)" links to the My work page
