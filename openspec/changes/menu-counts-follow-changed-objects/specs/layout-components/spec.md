# layout-components delta: menu-counts-follow-changed-objects

## ADDED Requirements

### Requirement: A filtered menu count follows changed objects

A menu entry whose `count` is `{ register, schema, filter }` MUST be read again when the app signals that objects of that register and schema changed (`cn:objects-changed`, `dispatchObjectsChanged`), without a page reload. Entries counting another register or schema MUST NOT be read again for that signal. A signal that names no register or schema MUST read every filtered count again. The shell MUST stop listening when it unmounts.

#### Scenario: The queue badge drops after a claim
- **GIVEN** a menu entry "Team queue" counting the unclaimed cases, showing 2
- **WHEN** a handler claims one of them and the app dispatches `cn:objects-changed` for that register and schema
- **THEN** the badge MUST read 1
- **AND** an entry counting another schema MUST NOT be requested again
