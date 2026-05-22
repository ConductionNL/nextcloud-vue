# Spec delta — index-page (page-level header actions)

## ADDED Requirements

### Requirement: Page-Level Header Actions

CnIndexPage SHALL accept an optional `headerActions: Array` prop (and the matching `pages[].config.headerActions[]` manifest key) carrying page-level action items rendered inside CnActionsBar's overflow dropdown. Each item SHALL use the same `{ id, label, icon, handler, route }` shape as the existing row-level `actions[]` so manifest authors and consumers reuse the same mental model. The `handler` string SHALL be dispatched through the same registry pattern (`navigate` / `emit` / `none` / registry name) — but with **no row context**, because the action is page-level.

Header actions SHALL render between the built-in Refresh action and the existing `#action-items` slot, after which the existing built-in mass actions and `#mass-actions` slot continue to render unchanged.

Reserved built-in ids (`refresh`, `import`, `export`, `copy`, `delete`) SHALL be silently dropped from the merged list with a `console.warn` so manifest authors cannot accidentally shadow a built-in.

#### Scenario: Renders headerActions in CnActionsBar overflow

- GIVEN CnIndexPage is mounted with `headerActions: [{ id: 'view-logs', label: 'View logs', icon: 'icon-history' }]`
- WHEN the CnActionsBar overflow dropdown opens
- THEN an `NcActionButton` labelled "View logs" is rendered AFTER the built-in Refresh item
- AND it is rendered BEFORE any `#action-items` slot content
- AND it is rendered BEFORE the mass-action items (Import / Export / Copy selected / Delete selected)

#### Scenario: handler 'navigate' pushes the configured route

- GIVEN `headerActions: [{ id: 'view-logs', label: 'View logs', handler: 'navigate', route: 'SourceLogs' }]`
- WHEN the user clicks "View logs"
- THEN `$router.push({ name: 'SourceLogs' })` is called
- AND `params.id` is NOT included on the push payload (header actions have no row context)
- AND `@header-action({ action: 'view-logs', id: 'view-logs' })` is ALSO emitted (handler-AND-emit, mirroring the row-level pattern)

#### Scenario: handler 'navigate' missing route falls back to emit-only

- GIVEN `headerActions: [{ id: 'broken', label: 'Broken', handler: 'navigate' }]` (no `route`)
- WHEN the user clicks "Broken"
- THEN a `console.warn` is logged once (per page mount) explaining that `handler:"navigate"` requires `route`
- AND `@header-action({ action: 'broken', id: 'broken' })` is emitted to the parent for fallback handling

#### Scenario: handler 'emit' emits @header-action

- GIVEN `headerActions: [{ id: 'open-bulk', label: 'Open bulk', handler: 'emit' }]`
- WHEN the user clicks "Open bulk"
- THEN `@header-action({ action: 'open-bulk', id: 'open-bulk' })` is emitted to the parent
- AND no router navigation occurs

#### Scenario: handler 'none' is silent

- GIVEN `headerActions: [{ id: 'placeholder', label: 'Placeholder', handler: 'none' }]`
- WHEN the user clicks "Placeholder"
- THEN NO `@header-action` event is emitted
- AND no router navigation occurs
- AND no `console.warn` is logged (explicit no-op is valid)

#### Scenario: handler registry name calls the customComponents function

- GIVEN the consumer's `customComponents` map contains a function `openLogsPanel`
- AND `headerActions: [{ id: 'open-logs', label: 'Open logs panel', handler: 'openLogsPanel' }]`
- WHEN the user clicks "Open logs panel"
- THEN `customComponents.openLogsPanel({ actionId: 'open-logs' })` is called
- AND `@header-action({ action: 'open-logs', id: 'open-logs' })` is ALSO emitted to the parent (matches the row-level pattern: handler runs AND event emits, so consumers can wire either)

#### Scenario: Registry name resolves to a non-function

- GIVEN `customComponents: { LogsPanel: SomeVueComponent }`
- AND `headerActions: [{ id: 'open-logs', label: 'Open logs', handler: 'LogsPanel' }]`
- WHEN the user clicks "Open logs"
- THEN a `console.warn` is logged explaining the registry value is not a function
- AND `@header-action({ action: 'open-logs', id: 'open-logs' })` is emitted as fallback

#### Scenario: Unknown registry name falls through to emit-only

- GIVEN `headerActions: [{ id: 'mystery', label: 'Mystery', handler: 'mysteryFn' }]`
- AND `customComponents` does NOT contain `mysteryFn`
- WHEN the user clicks "Mystery"
- THEN `@header-action({ action: 'mystery', id: 'mystery' })` is emitted
- AND NO `console.warn` is logged (silent fall-through matches row-level behaviour)

#### Scenario: Reserved built-in id is dropped

- GIVEN `headerActions: [{ id: 'refresh', label: 'Custom refresh' }]` (collides with built-in Refresh)
- WHEN CnIndexPage computes `mergedHeaderActions`
- THEN the entry is DROPPED from the list passed to CnActionsBar
- AND a `console.warn` is logged once per page mount explaining the reserved id
- AND only the built-in Refresh action is rendered

#### Scenario: Action without handler emits on click (back-compat with row-level)

- GIVEN `headerActions: [{ id: 'plain', label: 'Plain' }]` (no `handler`)
- WHEN the user clicks "Plain"
- THEN `@header-action({ action: 'plain', id: 'plain' })` is emitted
- AND no router navigation occurs

#### Scenario: Existing consumers without headerActions are unchanged

- GIVEN a CnIndexPage mounted WITHOUT a `headerActions` prop
- WHEN CnActionsBar renders
- THEN the overflow dropdown contains only Refresh + `#action-items` slot + (separator) + built-in mass actions + `#mass-actions` slot — identical to the pre-change rendering

#### Scenario: Manifest config.headerActions reaches CnIndexPage

- GIVEN a v2 manifest page `{ id: 'sources', type: 'index', config: { register: 'oc', schema: 'sources', headerActions: [{ id: 'view-logs', label: 'View logs', handler: 'navigate', route: 'SourceLogs' }] } }`
- WHEN CnPageRenderer mounts the page
- THEN CnIndexPage receives `headerActions` containing the manifest entry
- AND the v1 + v2 manifest validators MUST accept this manifest as valid (the new `headerActions` key is enumerated on `pages[].config` referencing the existing `action` $def)
