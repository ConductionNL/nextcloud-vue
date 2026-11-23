# page-names-its-menu-entry

## ADDED Requirements

### Requirement: A page without a menu entry marks the entry it names

A page MAY declare `menuEntry`, the id of a menu entry. While that page is open and no menu entry matches the route by the route, query and params rules or as the parent of a page below a list, CnAppNav SHALL mark the named entry as current, and no other. A page that names no entry SHALL leave the menu as before.

#### Scenario: The Mailbox marks Team queue

- **GIVEN** a page `Postvak` with `menuEntry: "Queue"` and a menu entry `Queue` that links the Cases list with a saved view
- **WHEN** the reader opens `/postvak`
- **THEN** Team queue is marked as current, and no other entry
