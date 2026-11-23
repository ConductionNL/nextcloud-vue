# manifest-actions Delta: screens-action-resolve

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-action-resolve](../../)

## Purpose

Actions that act on a record the page looks up, not the one it shows.

## ADDED Requirements

### Requirement: An action can name a looked-up record

An `api-call` or `navigate` action with `resolve: { register, schema, filter }` SHALL look up the first OpenRegister
object of that register and schema matching the filter (its values resolved by the action token grammar) when the
action renders and again when it runs, and SHALL expose it as `@resolved.<path>` in `url`, `target` and `payload`.
Without a match the action SHALL render disabled with `reason` as its title, or not render with
`unresolved: "hide"`, and a dispatch SHALL not call and SHALL show `reason` as an error.

#### Scenario: Close the open cycle

- GIVEN a programme with an open cycle `c-7` and an action resolving `{ programme: "@objectId", status: "open" }`
- WHEN the reader presses it
- THEN the action posts to `/apps/pipelinq/api/cycles/c-7/close`

#### Scenario: No open cycle

- GIVEN a programme without an open cycle
- WHEN the actions render
- THEN the button is disabled with the reason as its title
