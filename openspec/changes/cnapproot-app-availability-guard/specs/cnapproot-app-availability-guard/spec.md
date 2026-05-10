---
status: draft
---
# CnAppRoot app-availability guard

## Purpose

Centralise the "OpenRegister is required" empty-state on
`CnAppRoot` so every fleet app gains a consistent missing-app
screen without each duplicating its own wrapper. The guard is
configurable via a `requiresApps` prop that defaults to
`['openregister']` (the convention for the entire fleet) and
opts out via `:requires-apps="[]"`.

## ADDED Requirements

### Requirement: REQ-OR-1 — `requiresApps` defaults to `['openregister']`

`CnAppRoot` MUST expose a `requiresApps` prop with default value
`['openregister']`. The prop MUST be of type `Array<string>`.
Each entry is a Nextcloud app id that is checked against the
capabilities API on mount.

#### Scenario: default fleet behaviour

- **GIVEN** a Conduction app mounts `<CnAppRoot :manifest="…" app-id="…">`
  WITHOUT supplying `:requires-apps`
- **WHEN** `getCapabilities()` returns a payload that does NOT
  include an `openregister` key
- **THEN** CnAppRoot MUST render the missing-app empty-state
  rather than the renderer

#### Scenario: opt-out via empty array

- **GIVEN** a Conduction app mounts `<CnAppRoot :requires-apps="[]" …>`
- **WHEN** the component mounts
- **THEN** CnAppRoot MUST NOT call `getCapabilities()` and MUST
  render the renderer immediately (no loading state, no
  empty-state branch)

### Requirement: REQ-OR-2 — Capabilities-API detection on mount

`CnAppRoot` MUST detect missing apps by calling
`getCapabilities()` from `@nextcloud/capabilities` exactly once
during the `mounted()` lifecycle hook (when `requiresApps.length
> 0`). The result MUST be stored on the component instance — no
module-level cache, no second request per route change.

#### Scenario: single round-trip

- **GIVEN** `requiresApps = ['openregister']`
- **WHEN** the component mounts and the capabilities check
  resolves
- **THEN** `getCapabilities()` MUST have been called exactly once
- **AND** subsequent route changes within the same component
  instance MUST NOT trigger a second call

#### Scenario: multi-app check

- **GIVEN** `requiresApps = ['openregister', 'openconnector']`
- **AND** `getCapabilities()` returns `{ openregister: {} }` (no
  `openconnector` key)
- **WHEN** the component mounts
- **THEN** `missingApps` MUST equal `['openconnector']`
- **AND** the empty-state MUST render

### Requirement: REQ-OR-3 — Empty state rendered when any required app is missing

When `missingApps.length > 0` after the capabilities check,
`CnAppRoot` MUST render an empty-state surface containing:

- The OpenRegister app icon (or an equivalent missing-app icon).
- A title sourced from `translate('app-availability.title')`.
- A description sourced from
  `translate('app-availability.description')`.
- A primary action linking to
  `/index.php/settings/apps/integration/openregister` with the
  label `translate('app-availability.action')`.

The empty-state MUST take precedence over the existing
`phase === 'loading'` and `phase === 'dependency-missing'` branches.

#### Scenario: missing-app empty state

- **GIVEN** `requiresApps = ['openregister']`
- **AND** `getCapabilities()` returns `{}`
- **WHEN** the capabilities check resolves
- **THEN** CnAppRoot MUST render `<NcEmptyContent>` with the
  i18n title and description
- **AND** the renderer (`<router-view>` slot) MUST NOT render
- **AND** the action link MUST point to
  `/index.php/settings/apps/integration/openregister`

### Requirement: REQ-OR-4 — `#or-missing` slot escape hatch

`CnAppRoot` MUST expose a scoped slot named `or-missing` that
receives `{ missingApps }`. When a consumer supplies the slot,
the slot content MUST replace the default empty-state entirely.

#### Scenario: consumer override wins

- **GIVEN** the consumer provides
  `<template #or-missing="{ missingApps }">…</template>`
- **AND** `missingApps.length > 0`
- **WHEN** the empty-state phase activates
- **THEN** the consumer's slot content MUST render
- **AND** the default `<NcEmptyContent>` MUST NOT render

### Requirement: REQ-OR-5 — `:requires-apps="[]"` opt-out

When `requiresApps` is the empty array, `CnAppRoot` MUST
short-circuit the entire guard:

- It MUST NOT call `getCapabilities()`.
- It MUST NOT render the loading state.
- It MUST NOT render the empty-state.
- It MUST proceed directly to the existing phase machine
  (loading → dependency-missing → shell).

#### Scenario: docs / styleguide opt-out

- **GIVEN** a styleguide app declares `:requires-apps="[]"`
- **WHEN** the component mounts
- **THEN** the renderer MUST mount immediately
- **AND** no spinner MUST flash on initial render

### Requirement: REQ-OR-6 — Loading state during the check

While the capabilities check is in flight (after `mounted()` has
fired but before the promise / synchronous return resolves),
`CnAppRoot` MUST render a thin spinner surface so the renderer
does not flash before being replaced by the empty-state on slow
connections.

The default loading affordance MUST be a centered
`<NcLoadingIcon :size="32" />` inside the `NcContent` wrapper.

#### Scenario: spinner during in-flight check

- **GIVEN** `requiresApps = ['openregister']`
- **AND** `capabilitiesLoading` is `true`
- **WHEN** the component is rendered
- **THEN** `<NcLoadingIcon>` MUST be visible
- **AND** the renderer MUST NOT be visible
- **AND** the empty-state MUST NOT be visible

### Requirement: REQ-OR-7 — Network failure falls through

When `getCapabilities()` throws or returns a value that cannot
be inspected, `CnAppRoot` MUST:

- Log the error via `console.warn`.
- Set `missingApps` to the empty array.
- Set `capabilitiesLoading` to `false`.
- Fall through to the existing phase machine — the renderer
  mounts as if the guard was opted out.

The guard MUST NOT block the app on a transient capabilities-API
failure.

#### Scenario: capabilities API rejects

- **GIVEN** `getCapabilities()` throws an error on mount
- **WHEN** the catch branch fires
- **THEN** a `console.warn` MUST be logged
- **AND** the renderer (`<router-view>` slot) MUST mount
- **AND** the empty-state MUST NOT render

#### Scenario: capabilities API returns null

- **GIVEN** `getCapabilities()` returns `null` or `undefined`
- **WHEN** the component mounts
- **THEN** CnAppRoot MUST NOT crash
- **AND** every required app MUST be treated as missing (the
  payload contains no capability keys), surfacing the
  empty-state. This differs from the explicit-rejection
  scenario where falling through is the safer default — a
  successful round-trip that returns a null payload is a real
  Nextcloud signal that no apps are advertising capabilities,
  which on a Conduction host means OpenRegister is not active.
