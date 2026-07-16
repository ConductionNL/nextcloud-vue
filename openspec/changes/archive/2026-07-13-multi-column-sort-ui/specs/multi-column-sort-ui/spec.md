# multi-column-sort-ui

CnDataTable and CnIndexPage support multi-key ("shift+click") sort, translating an ordered priority list of columns into OpenRegister's native `_order` query-param format and persisting it in the route.

## ADDED Requirements

### Requirement: Plain click preserves existing single-sort behavior

Clicking a sortable header without a modifier key SHALL behave exactly as before this change: if the clicked column is the sole active sort key, its direction cycles asc → desc → cleared; otherwise the clicked column becomes the sole ascending sort key, replacing any other active keys (including a prior multi-key sort).

#### Scenario: Plain click on an unsorted table

- **GIVEN** a `CnDataTable` with no active sort
- **WHEN** the user clicks a sortable header "Name"
- **THEN** "Name" becomes the sole sort key, ascending
- **AND** the emitted `sort` event payload is `{ key: 'name', order: 'asc', keys: [{ key: 'name', order: 'asc' }] }`

#### Scenario: Plain click cycles the sole active key

- **GIVEN** "Name" is the sole active sort key, ascending
- **WHEN** the user plain-clicks "Name" again
- **THEN** the sort becomes "Name" descending
- **AND** clicking "Name" a third time clears the sort entirely (`keys: []`, `key: null`, `order: null`)

#### Scenario: Plain click on a different column collapses a multi-sort

- **GIVEN** an active multi-sort of `[{key:'name',order:'asc'},{key:'createdAt',order:'desc'}]`
- **WHEN** the user plain-clicks a third sortable header "Status"
- **THEN** the sort becomes the sole ascending key `[{ key: 'status', order: 'asc' }]`, dropping "name" and "createdAt"

@e2e include Mount CnDataTable with 3+ sortable columns; drive plain clicks; assert emitted payload and rendered arrow/badge state at each step.

### Requirement: Shift+click appends a secondary/tertiary sort key

Shift+clicking a sortable header that is not already part of the active sort SHALL append it to the end of the ordered sort-key list, ascending, without disturbing the existing keys — up to a maximum of 3 active keys. A 4th shift+click on a new column when 3 keys are already active SHALL be a no-op (the existing 3-key state is unchanged).

#### Scenario: Shift+click appends a second key

- **GIVEN** "Name" is the sole active sort key, ascending
- **WHEN** the user shift+clicks sortable header "Created"
- **THEN** the active sort becomes `[{key:'name',order:'asc'},{key:'created',order:'asc'}]`
- **AND** "Name" shows no priority badge is required for a single key, but once 2 keys are active both "Name" and "Created" show numbered badges "1" and "2"

#### Scenario: Shift+click caps at 3 keys

- **GIVEN** an active sort of 3 keys (`name`, `created`, `status`)
- **WHEN** the user shift+clicks a 4th sortable header "Owner"
- **THEN** the active sort is unchanged (still exactly the same 3 keys in the same order)

@e2e include Mount CnDataTable with 4 sortable columns; shift+click through to 3 keys, then shift+click a 4th; assert state unchanged and badges read 1/2/3.

### Requirement: Shift+click on an already-active key cycles its own direction

Shift+clicking a column that is already part of the active multi-sort SHALL cycle only that key's direction (asc → desc → removed from the list), preserving the relative order and direction of the other active keys. Removing the primary key promotes the next key to primary.

#### Scenario: Shift+click cycles a secondary key's direction

- **GIVEN** an active sort `[{key:'name',order:'asc'},{key:'created',order:'asc'}]`
- **WHEN** the user shift+clicks "Created" twice (asc → desc → removed)
- **THEN** after the first shift+click the sort is `[{key:'name',order:'asc'},{key:'created',order:'desc'}]`
- **AND** after the second shift+click the sort is `[{key:'name',order:'asc'}]` ("Created" removed, "Name" untouched)

#### Scenario: Removing the primary key promotes the next key

- **GIVEN** an active sort `[{key:'name',order:'desc'},{key:'created',order:'asc'}]`
- **WHEN** the user shift+clicks "Name" until it is removed (desc → removed, since it does not start at asc)
- **THEN** the sort becomes `[{key:'created',order:'asc'}]` and "Created" is now the primary key (carries `aria-sort`)

@e2e include Mount CnDataTable with an active 2-key sort; shift+click each key through its full cycle; assert intermediate and final states.

### Requirement: Numbered priority badges render only for multi-key sort

`CnDataTable` SHALL render a small numbered badge (1, 2, 3) next to a sortable header's arrow indicator only when more than one sort key is active. A single active sort key SHALL render exactly as before (arrow only, no badge).

#### Scenario: No badge for single-key sort

- **GIVEN** a sole active sort key "Name"
- **THEN** the "Name" header shows the sort arrow and no numbered badge

#### Scenario: Badges appear once a second key is added

- **GIVEN** an active 2-key sort `[{key:'name'},{key:'created'}]`
- **THEN** "Name"'s header shows a "1" badge and "Created"'s header shows a "2" badge, each beside its own arrow

@e2e include Mount CnDataTable with a 2-key and 3-key sort fixture; snapshot/assert badge text and positions.

### Requirement: Headers are keyboard-operable

Sortable table headers SHALL be focusable (`tabindex="0"`, `role="columnheader"` retained) and respond to `Enter` as a plain click and `Shift+Enter` as a shift+click, invoking the identical state transition as the corresponding mouse interaction.

#### Scenario: Enter sorts, Shift+Enter appends

- **GIVEN** a sortable header "Name" is focused with no active sort
- **WHEN** the user presses `Enter`
- **THEN** "Name" becomes the sole ascending sort key (same result as a plain click)
- **WHEN** the user then focuses "Created" and presses `Shift+Enter`
- **THEN** "Created" is appended as the second sort key (same result as shift+click)

@e2e include Mount CnDataTable; focus a header and dispatch `keydown.enter` and `shift+keydown.enter`; assert emitted payloads match the mouse-click equivalents.

### Requirement: aria-sort is maintained on the primary key only

Only the header for the primary (first) active sort key SHALL carry `aria-sort` (`ascending` / `descending`); secondary/tertiary sorted headers SHALL NOT carry `aria-sort` (they carry the visible numbered badge instead, per WCAG guidance that `aria-sort` describes single-column table sort state).

#### Scenario: aria-sort follows the primary key only

- **GIVEN** an active sort `[{key:'name',order:'desc'},{key:'created',order:'asc'}]`
- **THEN** the "Name" header has `aria-sort="descending"`
- **AND** the "Created" header has no `aria-sort` attribute

@e2e include Mount CnDataTable with a 2-key sort; assert `aria-sort` presence/value per header.

### Requirement: A pure sort-state-transition helper is exposed from src/utils

`src/utils/multiColumnSort.js` SHALL export a pure function (`nextSortState(sortKeys, key, { append })`) implementing the click/shift-click transitions above, independent of any Vue component, so the state machine is unit-testable in isolation and reusable by any future host.

#### Scenario: Pure function covers every transition

- **GIVEN** the exported `nextSortState` function
- **THEN** unit tests cover: empty → single click, single → cycle → clear, shift-append up to and beyond the 3-key cap, shift-cycle of a non-primary key, shift-cycle removing the primary key (promotion), and plain-click collapse of an existing multi-sort

@e2e exclude Pure function; fully covered by unit tests, no DOM/e2e surface.

### Requirement: CnIndexPage translates multi-sort state into OpenRegister's `_order` format

When `CnIndexPage` operates in self-fetch mode (register + schema, no external `objects`/`rows`), the active multi-sort key list SHALL be translated into the `_order` fetch parameter as an object whose key insertion order matches the sort-priority order and whose values are `'asc'`/`'desc'` — the exact shape OpenRegister's `ObjectsController::normalizeOrderParameter` / `MagicMapper` ordering loop consume (`{"field1":"asc","field2":"desc"}`, JSON-encoded by the existing `buildQueryString` object-serialization path). A single active key SHALL produce byte-identical `_order` output to the pre-change single-sort behavior.

#### Scenario: Multi-sort becomes a priority-ordered _order object

- **GIVEN** a self-fetch `CnIndexPage` with an active sort `[{key:'status',order:'asc'},{key:'createdAt',order:'desc'}]`
- **WHEN** the list fetches
- **THEN** the fetch params include `_order: { status: 'asc', createdAt: 'desc' }` (in that key order)

#### Scenario: Single-key sort is unchanged

- **GIVEN** a self-fetch `CnIndexPage` with a single active sort key `{key:'name',order:'asc'}`
- **WHEN** the list fetches
- **THEN** the fetch params include `_order: { name: 'asc' }`, identical to pre-change behavior

@e2e include Drive a self-fetch CnIndexPage through single- and multi-column sort; inspect the network request's `_order` param.

### Requirement: Multi-sort state is persisted in the route query

`CnIndexPage` (self-fetch mode) SHALL write the active sort-key list to `$route.query._order` (JSON-encoded array of `{key, order}`) on every sort change, and SHALL read it back on mount to restore the sort — so a page reload or a shared/bookmarked deep link reproduces the same multi-column sort. Clearing the sort SHALL remove `_order` from the route query.

#### Scenario: Reload restores a multi-column sort

- **GIVEN** a self-fetch `CnIndexPage` at a route with `?_order=%5B%7B%22key%22%3A%22status%22%2C%22order%22%3A%22asc%22%7D%2C%7B%22key%22%3A%22createdAt%22%2C%22order%22%3A%22desc%22%7D%5D`
- **WHEN** the page mounts
- **THEN** the initial sort state is `[{key:'status',order:'asc'},{key:'createdAt',order:'desc'}]` and the corresponding headers render their arrows/badges accordingly

#### Scenario: Clearing the sort removes the query param

- **GIVEN** a route with an active `_order` query param
- **WHEN** the user clears the sort (plain-clicks the sole active key until removed)
- **THEN** `$route.query._order` is removed

@e2e include Navigate to a deep-linked multi-sort URL; assert restored state; clear the sort; assert the query param is gone.
