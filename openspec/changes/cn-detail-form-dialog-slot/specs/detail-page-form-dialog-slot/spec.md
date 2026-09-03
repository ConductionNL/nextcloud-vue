---
status: draft
---
# CnDetailPage form-dialog slot

## Purpose

Give `CnDetailPage` the same `form-dialog` seam `CnIndexPage` has, so an app
can replace the built-in create/edit dialog or transform the schema that drives
it, without forking the component.

## ADDED Requirements

### Requirement: `CnDetailPage` MUST expose a `form-dialog` scoped slot

`CnDetailPage` MUST expose a scoped slot named `form-dialog` whose scope is
exactly `{ show, item, schema, confirm, close }` — the same name and the same
five keys as `CnIndexPage`'s `form-dialog`, so one replacement component serves
both pages.

#### Scenario: the slot scope matches the index page's

- **GIVEN** a consumer provides `#form-dialog="slotProps"`
- **WHEN** the page renders
- **THEN** `slotProps` has exactly the keys `show`, `item`, `schema`,
  `confirm`, `close`
- **AND** `confirm` and `close` are functions

#### Scenario: the slot covers both built-in dialogs

- **GIVEN** a page in create mode (schema-bound, no object id)
- **WHEN** the slot renders
- **THEN** `show` is `true` and `item` is the route-derived prefill, or `null`
  when nothing prefills
- **AND GIVEN** a page with an object id whose edit form has been opened
- **THEN** `show` is `true` and `item` is the loaded record

### Requirement: `show` MUST mirror the built-in dialogs' visibility conditions

`show` MUST be `true` under exactly the conditions that render a built-in
dialog, so a replacement binding `v-if="show"` inherits the page's own guards
rather than reimplementing them.

#### Scenario: no schema

- **GIVEN** the store has no schema for the page's register/schema pair
- **THEN** `show` is `false`

#### Scenario: the record has not loaded yet

- **GIVEN** a page with an object store and an object id whose record has not
  been fetched
- **WHEN** the edit form is opened
- **THEN** `show` is `false`
- **AND** no form renders, because a form opened before the fetch lands shows
  blanks whose Save would overwrite the record

### Requirement: `show` and `confirm` MUST be bound as props

`show` and `confirm` MUST be bound into the slot scope as props rather than
left as listeners on the default children.

`CnPageRenderer` mounts a manifest-declared replacement as
`<component :is="…" v-bind="slotProps" />`, which binds props only. A listener
is unreachable from a manifest even in principle, which is what made the same
slot on `CnIndexPage` decorative until openconnector#1150.

#### Scenario: a manifest-shaped replacement can save

- **GIVEN** a replacement declaring `props: ['show','item','schema','confirm','close']`
- **AND** mounted with the slot scope spread as props, with no listeners
- **WHEN** it calls `confirm(formData)`
- **THEN** the page persists through its own save path and emits `created` or
  `edited`

### Requirement: `confirm` MUST run the page's own persistence path

`confirm` MUST dispatch on create mode to the same handlers the built-in
dialogs use, so a create or edit made in a replacement behaves exactly like one
made in the built-in dialog: the same duplicate-id refusal, the same
store-then-axios fallback, the same events, the same lifecycle reload.

#### Scenario: an edit saves through the store with the id merged in

- **GIVEN** a page editing record `d-1`
- **WHEN** a replacement calls `confirm({ title: 'x' })`
- **THEN** the store's `saveObject` is called with the payload plus `id: 'd-1'`
- **AND** the page emits `edited`

#### Scenario: a create POSTs

- **GIVEN** a page in create mode
- **WHEN** a replacement calls `confirm(formData)`
- **THEN** the object is POSTed and the page emits `created`

### Requirement: `confirm` MUST resolve to the save outcome

`confirm` MUST resolve to `{ success: true, data }` on success and `{ error }`
on failure.

`CnFormDialog` sets its `loading` flag on submit and only `setResult` clears
it, and `no-close` is bound to `loading`. A replacement holds no ref the host
can reach, so without a returned result a replacement rendering its own
`CnFormDialog` would lock its modal open on both success and failure.

#### Scenario: success

- **WHEN** the save succeeds
- **THEN** `confirm` resolves to an object with `success: true`

#### Scenario: failure

- **GIVEN** the store's `saveObject` returns null and `getError` reports a message
- **WHEN** a replacement calls `confirm(formData)`
- **THEN** `confirm` resolves to `{ error: '<that message>' }`

### Requirement: transforming the schema MUST reach the rendered form

The `schema` in the slot scope MUST be the schema the built-in dialog would
have used, so a replacement can render `CnFormDialog` with a transformed copy
and have the transform take effect in the rendered form.

#### Scenario: a runtime vocabulary is spliced into an empty enum

- **GIVEN** a schema whose `decisionType` property carries an empty `enum`
- **WHEN** a replacement renders the form with a copy whose `enum` holds the
  app's runtime vocabulary
- **THEN** the rendered form offers those options
- **AND** the store's schema is not mutated, so other surfaces are unaffected

### Requirement: the default path MUST be unchanged

A page that passes no `form-dialog` slot MUST render and behave exactly as it
did before the slot existed.

#### Scenario: no slot passed

- **GIVEN** a consumer passes no `form-dialog` slot
- **WHEN** the create or edit dialog opens
- **THEN** the built-in `CnFormDialog` renders as the slot's fallback content
- **AND** it receives the store's schema, untransformed
- **AND** it still wires its own `@confirm` / `@close` directly
