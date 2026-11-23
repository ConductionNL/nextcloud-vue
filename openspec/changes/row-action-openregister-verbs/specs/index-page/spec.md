# Index page: built-in row actions understand OpenRegister's permission verbs

## ADDED Requirements

### Requirement: Built-in row actions match OpenRegister permission verbs

When CnIndexPage narrows a row's actions by its availability block (`rowActionField`, default `@self.actions`), a built-in row action MUST be allowed when the block allows its id OR the permission verb that governs it: `read` for View, `update` for Edit, `read` for Copy, `delete` for Delete. A built-in whose id and verb the block both leave out MUST NOT render. The three block shapes (a list of ids, a map of id to boolean, a map or list of `{ allowed, reason }`) MUST all be read this way. An app action MUST match by its own id only, even when that id is `view`, `edit`, `copy` or `delete`. `rowActionsNotDeclared(row)` MUST NOT list a verb that governs a declared built-in.

#### Scenario: OpenRegister's block keeps all four built-ins

- **GIVEN** all built-in toggles on
- **AND** a row whose `@self.actions` is `["read", "update", "delete", "destroy", "export", "assign"]`
- **WHEN** the row's action menu renders
- **THEN** View, Edit, Copy and Delete MUST render
- **AND** `rowActionsNotDeclared(row)` MUST return `["assign", "destroy", "export"]`

#### Scenario: A refused verb hides its built-in

- **GIVEN** a row whose `@self.actions` is `{ "read": true, "update": false, "delete": true }`
- **WHEN** the row's action menu renders
- **THEN** View, Copy and Delete MUST render and Edit MUST NOT

#### Scenario: Ids still match

- **GIVEN** a row whose `@self.actions` is `["edit", "delete"]`
- **WHEN** the row's action menu renders
- **THEN** only Edit and Delete MUST render among the built-ins

#### Scenario: An app action sharing a built-in id is not mapped

- **GIVEN** `config.actions` is `[{ "id": "edit", "label": "Open editor" }]`
- **AND** a row whose `@self.actions` is `["update"]`
- **WHEN** the row's action menu renders
- **THEN** "Open editor" MUST NOT render

### Requirement: A built-in carries the refusal reason of its verb

`rowActionRefusal(row, action)` for a built-in MUST return `''` when the block allows the built-in by its id or its verb. When neither is allowed, it MUST return the reason given for the built-in's own id when there is one, else the reason given for its verb, else `''`.

#### Scenario: Verb refused with a reason

- **GIVEN** a row whose `@self.actions` is `{ "read": true, "update": { "allowed": false, "reason": "The case is closed" } }`
- **WHEN** a caller asks `rowActionRefusal(row, <built-in Edit>)`
- **THEN** it MUST return "The case is closed"

#### Scenario: Allowed by its id despite a refused verb

- **GIVEN** a row whose `@self.actions` is `{ "edit": true, "update": { "allowed": false, "reason": "The case is closed" } }`
- **WHEN** the row's action menu renders
- **THEN** Edit MUST render
- **AND** `rowActionRefusal(row, <built-in Edit>)` MUST return `''`
