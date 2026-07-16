command-palette
---
status: draft
---
# Command palette

## Purpose

Anchor a Ctrl/Cmd+K, keyboard-first command palette once in
`@conduction/nextcloud-vue` — aggregating navigation, app-registered
actions, and live OpenRegister object search into one ranked, sectioned,
accessible result list — so every consuming app inherits it instead of
each app hand-rolling (or never building) one.

## ADDED Requirements

### Requirement: The library MUST export `CnCommandPalette`, `useCommandPalette`, and `createObjectSearchSource`

`@conduction/nextcloud-vue`'s `src/index.js` MUST export the
`CnCommandPalette` component, the `useCommandPalette` composable, and the
`createObjectSearchSource` utility.

#### Scenario: Public exports resolve
- GIVEN a consumer app
- WHEN it runs `import { CnCommandPalette, useCommandPalette, createObjectSearchSource } from '@conduction/nextcloud-vue'`
- THEN all three MUST resolve — `CnCommandPalette` a Vue component, `useCommandPalette` and `createObjectSearchSource` functions

### Requirement: The palette MUST open on Ctrl/Cmd+shortcut and close on Escape

`CnCommandPalette` MUST attach a `document`-level `keydown` listener
(unless `disableShortcut` is set) that toggles the palette open when the
configured `shortcut` prop (default `"k"`) is pressed together with
`Ctrl` (Windows/Linux) or `Cmd`/`metaKey` (macOS), and MUST close on
`Escape` while open.

#### Scenario: Ctrl+K opens and toggles the palette
- GIVEN `CnCommandPalette` is mounted with default props
- WHEN `Ctrl+K` is dispatched on `document`
- THEN the palette MUST open
- WHEN `Ctrl+K` is dispatched again
- THEN the palette MUST close

#### Scenario: Cmd+K opens the palette on macOS
- GIVEN `CnCommandPalette` is mounted with default props
- WHEN a `keydown` with `key: 'k', metaKey: true` is dispatched
- THEN the palette MUST open

#### Scenario: The shortcut key alone does not open the palette
- GIVEN `CnCommandPalette` is mounted with default props
- WHEN a `keydown` with `key: 'k'` and no modifier is dispatched
- THEN the palette MUST remain closed

#### Scenario: disableShortcut suppresses the global listener
- GIVEN `CnCommandPalette` is mounted with `disable-shortcut="true"`
- WHEN `Ctrl+K` is dispatched on `document`
- THEN the palette MUST remain closed

#### Scenario: Escape closes the open palette
- GIVEN the palette is open
- WHEN `Escape` is pressed while the input is focused
- THEN the palette MUST close

### Requirement: Keyboard navigation MUST use aria-activedescendant, never moving DOM focus off the input

While open, `ArrowDown`/`ArrowUp` MUST move the active result (clamped,
not wrapping) and `Enter` MUST activate it, while DOM focus remains on
the text input the entire time — tracked via `aria-activedescendant`
pointing at the active `role="option"` element's id.

#### Scenario: ArrowDown/ArrowUp move the active option without wrapping
- GIVEN the palette is open with two or more ranked results
- WHEN `ArrowDown` is pressed repeatedly past the last result
- THEN the active result MUST clamp at the last result, not wrap to the first
- WHEN `ArrowUp` is pressed repeatedly past the first result
- THEN the active result MUST clamp at the first result

#### Scenario: Enter activates the active result and closes the palette
- GIVEN the palette is open with an active result
- WHEN `Enter` is pressed
- THEN the active result's `run()` MUST be invoked and the palette MUST close

#### Scenario: Focus never leaves the input during keyboard navigation
- GIVEN the palette is open
- WHEN `ArrowDown`/`ArrowUp` change the active result
- THEN the document's active element MUST remain the palette's text input

### Requirement: Opening the palette MUST capture and restore focus

Opening the palette MUST record the currently focused element and move
focus into the palette's input; closing the palette (via Escape, a result
activation, or a backdrop click) MUST restore focus to the originally
focused element when it is still attached to the document.

#### Scenario: Focus restores to the trigger element on close
- GIVEN an element has focus
- WHEN the palette opens and is then closed without activating a result
- THEN focus MUST return to the originally focused element

### Requirement: Navigation results MUST be built from `manifest.menu` with zero app wiring

When the `manifest` prop is set, `CnCommandPalette` MUST derive navigation
results from `manifest.menu`, flattened one level into `children`,
excluding `type: 'caption'` entries, with no additional app code required.

#### Scenario: Menu entries become navigation results
- GIVEN a manifest with `menu` entries carrying `route` and/or `href`
- WHEN the palette computes its navigation source
- THEN each non-caption entry (including one level of `children`) MUST appear as a navigation result

#### Scenario: Caption entries are excluded
- GIVEN a manifest `menu` entry with `type: 'caption'`
- WHEN the palette computes its navigation source
- THEN that entry MUST NOT appear as a navigation result

#### Scenario: Route entries navigate via the router; href entries open a new tab
- GIVEN a navigation result with a `route` field and the `router` prop set
- WHEN the result is activated
- THEN `router.push({ name: route, query })` MUST be called
- GIVEN a navigation result with an `href` field
- WHEN the result is activated
- THEN `window.open(href, '_blank', 'noopener')` MUST be called

### Requirement: Apps MUST be able to register actions declaratively via `useCommandPalette()`

`useCommandPalette().register(entry)` MUST add a command (upserting on a
duplicate `id`) to the shared, app-wide command list every
`CnCommandPalette` instance (using the default registry) reads;
`unregister(id)` MUST remove it.

#### Scenario: A registered command appears in the palette's results
- GIVEN a component calls `useCommandPalette().register({id, title, run})`
- WHEN the palette is open and the query matches the command's title
- THEN the command MUST appear among the ranked results

#### Scenario: Re-registering the same id upserts instead of throwing
- GIVEN a command with id `"x"` is already registered
- WHEN `register({id: "x", ...})` is called again with different fields
- THEN the registry MUST hold exactly one entry for `"x"`, reflecting the latest registration, and MUST NOT throw

#### Scenario: Unregistering removes the command from future palette renders
- GIVEN a registered command with id `"x"`
- WHEN `unregister("x")` is called
- THEN `"x"` MUST NOT appear in subsequent ranked results

### Requirement: The objects source MUST be debounced and MUST discard stale responses

When the `objectSearch` prop is set, the palette MUST debounce calls to it
by `objectSearchDebounce` ms after the query stops changing, and MUST
discard a response that arrives after a newer query has already
superseded it. Navigation and action results MUST render immediately
regardless of the objects source's in-flight/pending state.

#### Scenario: Rapid typing produces exactly one objectSearch call
- GIVEN `objectSearchDebounce` is 200ms
- WHEN the query changes three times within 100ms of each other
- THEN `objectSearch` MUST be called exactly once, with the final query value, after the debounce window elapses

#### Scenario: A stale object-search response is discarded
- GIVEN an `objectSearch` call for query "first" is still pending
- WHEN the query changes to "second" and its `objectSearch` call resolves first
- THEN the palette's object results MUST reflect only "second"'s response
- WHEN "first"'s call resolves afterward
- THEN its results MUST be discarded, not merged in

#### Scenario: Navigation/action results are not blocked by a pending object search
- GIVEN a query matches both a navigation entry and an in-flight (unresolved) object search
- WHEN the palette re-renders
- THEN the navigation result MUST already be visible, independent of the object search's resolution

### Requirement: Results MUST rank by match tier and group by section

Ranked results MUST order exact-prefix matches above word-prefix matches
above fuzzy-subsequence matches; a candidate matching none of the tiers
MUST be excluded UNLESS the source opts into `includeNonMatching`
(pre-filtered sources, e.g. objects). Results MUST render grouped by
`section`, each section labelled.

#### Scenario: Exact beats word-prefix beats fuzzy
- GIVEN three candidates matching the same query at EXACT, WORD_PREFIX, and FUZZY tier respectively
- WHEN results are ranked
- THEN they MUST appear in that tier order

#### Scenario: A non-matching candidate is excluded by default
- GIVEN a candidate whose title and keywords share no characters, in order, with the query
- WHEN results are ranked without `includeNonMatching`
- THEN that candidate MUST NOT appear in the ranked output

#### Scenario: Results render grouped under their section label
- GIVEN ranked results spanning two sections
- WHEN the palette renders its result list
- THEN each section's entries MUST render together under that section's label, in rank order within the section

### Requirement: `CnAppRoot` MUST mount the palette opt-in, off by default

`CnAppRoot` MUST expose a `commandPalette` prop (`Boolean | Object`,
default `false`). `false`/omitted MUST NOT mount `CnCommandPalette`.
`true` MUST mount it wired to `manifest`, `$router`, and `appId`. An
object value MUST mount it with those same defaults, overridden by the
object's own fields (e.g. `objectSearch`).

#### Scenario: Default (unset) does not mount the palette
- GIVEN `CnAppRoot` is mounted without the `commandPalette` prop
- WHEN the shell renders
- THEN `CnCommandPalette` MUST NOT be present in the rendered tree

#### Scenario: commandPalette=false does not mount the palette
- GIVEN `CnAppRoot` is mounted with `:command-palette="false"`
- WHEN the shell renders
- THEN `CnCommandPalette` MUST NOT be present in the rendered tree

#### Scenario: commandPalette=true mounts the palette wired to manifest and appId
- GIVEN `CnAppRoot` is mounted with `:command-palette="true"`, a `manifest`, and an `app-id`
- WHEN the shell renders
- THEN `CnCommandPalette` MUST be present, receiving that `manifest` and `app-id` as props

#### Scenario: An object value overrides individual CnCommandPalette props
- GIVEN `CnAppRoot` is mounted with `:command-palette="{ objectSearch: fn, shortcut: 'p' }"`
- WHEN the shell renders
- THEN the mounted `CnCommandPalette` MUST receive that `objectSearch` and `shortcut`, alongside the auto-wired `manifest`/`app-id`

### Requirement: The palette MUST pass WCAG 2.1 AA in both its idle and results states

`CnCommandPalette` MUST expose correct combobox/listbox ARIA (`role`,
`aria-expanded`, `aria-activedescendant`, `aria-controls`) and an
`aria-live` result-count announcement, and MUST have zero WCAG 2.1 AA
violations (per `expectAccessible()`) when open with an empty query and
when open with ranked results.

#### Scenario: No WCAG 2.1 AA violations in the open, empty-query state
- GIVEN the palette is open with no query entered
- WHEN `expectAccessible(wrapper)` is awaited
- THEN it MUST resolve with zero violations

#### Scenario: No WCAG 2.1 AA violations with ranked, sectioned results
- GIVEN the palette is open with a query that matches results across multiple sections
- WHEN `expectAccessible(wrapper)` is awaited
- THEN it MUST resolve with zero violations
