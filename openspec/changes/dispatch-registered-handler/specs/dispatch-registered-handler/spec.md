# dispatch-registered-handler Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dispatch-registered-handler](../../)

## Purpose

A `handler` action names a function the app registered, wherever it is dispatched.

## ADDED Requirements

### Requirement: A handler action falls back to the registered handler

When `dispatchAction` runs a `type: "handler"` action whose name `context.handlers` does not answer with a function,
it SHALL resolve the name against `context.registry` as an index page does, and call that function with
`{ actionId, item, args }`, where `item` is `context.row`, else the action's last argument. A name neither answers
SHALL still warn and do nothing.

#### Scenario: a record-list row action

- **GIVEN** a record-list row action `{ type: "handler", handler: "claimCase" }` and an app registry entry
  `claimCase: { kind: "handler", handler: fn }`
- **WHEN** the reader presses the row's button
- **THEN** `fn` is called with `{ actionId, item: <the row> }`
