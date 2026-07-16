manifest-actions-dispatch
---
status: draft
---
# Manifest `actions[].handler` dispatch

## Purpose

Extend the manifest's `action` $def with a `handler` field so
`pages[].config.actions[]` items can dispatch to consumer-provided
functions registered in the `customComponents` registry. Closes the
adoption gap where 11 opencatalogi routes (#547) and 2 pipelinq
queue routes (#330) keep `type: "custom"` because the manifest
can't express their per-action side effects.

## ADDED Requirements

### Requirement: REQ-MAD-1 The `action` $def MUST accept a `handler` field

The `action` $def in `src/schemas/app-manifest.schema.json` MUST add an optional `handler` field, type `string`, pattern `^(navigate|emit|none|[A-Za-z][A-Za-z0-9_]*)$`. The schema's `version` MUST bump from `1.2.0` to `1.3.0`. v1.2 manifests (no `handler` field) MUST keep validating without changes.

#### Scenario: Action with handler validates
- GIVEN an action `{ id: "process", label: "Process", handler: "queueProcessHandler" }`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Action with reserved keyword `navigate` + `route` validates
- GIVEN an action `{ id: "view", label: "View", handler: "navigate", route: "QueueDetail" }`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Action with handler containing a hyphen rejects
- GIVEN an action `{ id: "x", label: "X", handler: "my-handler" }`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: false }` AND error MUST include the action's path + `handler:` + a hint about the allowed pattern

#### Scenario: v1.2 manifest still validates against v1.3 schema
- GIVEN a manifest using actions without `handler` (the v1.2 shape)
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }` — no new error from the schema bump

### Requirement: REQ-MAD-2 `handler: "navigate"` MUST require `route`

When `action.handler === "navigate"`, `validateManifest()` MUST require `action.route` to be a non-empty string. Other values of `handler` MUST NOT require `route`.

#### Scenario: navigate without route rejects
- GIVEN an action `{ id: "view", label: "View", handler: "navigate" }`
- WHEN `validateManifest()` runs
- THEN errors MUST include the action's path + `route: required when handler is "navigate"`

#### Scenario: emit without route validates
- GIVEN an action `{ id: "x", label: "X", handler: "emit" }`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }` — `route` is not required for non-`navigate` keywords

### Requirement: REQ-MAD-3 `CnIndexPage` MUST resolve manifest `handler` via the customComponents registry

`CnIndexPage` MUST resolve `action.handler` (when it is a string registry name) by looking it up in the `customComponents` registry passed via prop or injected from `CnAppRoot`. When the registry entry is a function, the page MUST call it with `{ actionId: action.id, item: row }` on row-action click. When the registry entry is missing, the page MUST fall back to emitting only the `@action` event (silent fallback — no warning). When the registry entry is a non-function, the page MUST emit a single `console.warn` AND still fall back to `@action`-only.

#### Scenario: Registered handler fires on click
- GIVEN a page with `actions: [{ id: "process", label: "Process", handler: "queueProcessHandler" }]`
- AND `customComponents = { queueProcessHandler: jest.fn() }`
- WHEN the user clicks the "Process" row action on row `{ id: "abc" }`
- THEN `customComponents.queueProcessHandler` MUST have been called once with `{ actionId: "process", item: { id: "abc" } }`
- AND the `@action` event MUST also fire with `{ action: "Process", row: { id: "abc" } }`

#### Scenario: Missing handler name falls back silently
- GIVEN a page with `actions: [{ id: "x", label: "X", handler: "missingHandler" }]`
- AND `customComponents = {}`
- WHEN the user clicks the "X" row action
- THEN no exception MUST be thrown
- AND only the `@action` event MUST fire
- AND the console MUST NOT contain a warning (back-compat path)

#### Scenario: Non-function handler in registry warns
- GIVEN a page with `actions: [{ id: "y", label: "Y", handler: "wrongShape" }]`
- AND `customComponents = { wrongShape: { template: '<div/>' } }` (a Vue component, not a function)
- WHEN the user clicks the "Y" row action
- THEN the console MUST contain exactly ONE warning naming `wrongShape`
- AND the `@action` event MUST still fire

### Requirement: REQ-MAD-4 `handler: "navigate"` MUST call `$router.push` with the row id

When `action.handler === "navigate"`, `CnIndexPage` MUST call `this.$router.push({ name: action.route, params: { id: row[rowKey] } })` on row-action click. The `rowKey` defaults to `id` (the page's existing prop) so the navigation targets the standard detail-route shape.

#### Scenario: Navigate dispatches to the configured route
- GIVEN a page with `rowKey: "id"` and `actions: [{ id: "view", label: "View", handler: "navigate", route: "QueueDetail" }]`
- WHEN the user clicks the "View" action on row `{ id: "abc-123", title: "Vergunning queue" }`
- THEN `$router.push` MUST have been called with `{ name: "QueueDetail", params: { id: "abc-123" } }`
- AND the consumer's `customComponents` MUST NOT be queried (reserved keyword short-circuits registry lookup)

### Requirement: REQ-MAD-5 `handler: "emit"` MUST emit `@action` only

When `action.handler === "emit"`, the page MUST skip both the registry lookup AND the navigate path; only the `@action` event fires. This makes the manifest declaration explicit (vs the unset default which behaves identically).

#### Scenario: Emit emits without registry lookup
- GIVEN a page with `actions: [{ id: "z", label: "Z", handler: "emit" }]`
- AND `customComponents = { emit: jest.fn() }` (a name collision — should NOT match the keyword)
- WHEN the user clicks the "Z" action
- THEN `customComponents.emit` MUST NOT have been called (keyword wins)
- AND the `@action` event MUST fire

### Requirement: REQ-MAD-6 `handler: "none"` MUST disable the action click

When `action.handler === "none"`, clicking the row action MUST be a no-op. No registry lookup, no navigate, no `@action` emit. This lets the manifest gate visibility without a JS-level `disabled` predicate.

#### Scenario: None blocks the click
- GIVEN a page with `actions: [{ id: "blocked", label: "Blocked", handler: "none" }]`
- WHEN the user clicks the "Blocked" action
- THEN the `@action` event MUST NOT fire
- AND no `customComponents` entries MUST be invoked

### Requirement: REQ-MAD-7 Back-compat: programmatic `handler` functions MUST keep working

When `action.handler` is itself a function (passed via the runtime `actions` prop, NOT via the manifest), `CnIndexPage` MUST call it directly on click — preserving the pre-1.3 runtime behaviour. This path is what `defaultActions` for view / edit / copy / delete already use.

#### Scenario: Programmatic function handler still fires
- GIVEN `actions: [{ label: "Edit", handler: jest.fn() }]` passed as a runtime prop
- WHEN the user clicks "Edit" on a row
- THEN the function MUST have been called once with the row object

### Requirement: REQ-MAD-8 The dispatch behaviour MUST be available to detail-page contexts via descendant `CnIndexPage` instances

CnDetailPage today exposes its action surface via slots (`#actions`, `#header-actions`) rather than an `actions[]` prop. Manifest-driven detail pages that need row-action dispatch MUST compose `CnIndexPage` instances inside the detail page (e.g. for related-objects sub-tables); those nested `CnIndexPage`s inherit the same `cnCustomComponents` inject from the surrounding `CnAppRoot` and resolve handlers identically to a top-level index page. A future change MAY extend `CnDetailPage` with its own `actions[]` prop honouring the same handler shape; that addition is out of scope for this change.

#### Scenario: Nested CnIndexPage in a detail page resolves handlers
- GIVEN a detail page that mounts a sub-`CnIndexPage` with `actions: [{ id: "x", label: "X", handler: "detailActionHandler" }]`
- AND the surrounding CnAppRoot's `customComponents = { detailActionHandler: jest.fn() }`
- WHEN the user clicks "X" on a sub-row `{ id: "sub-1" }`
- THEN `detailActionHandler` MUST have been called with `{ actionId: "x", item: { id: "sub-1" } }`
