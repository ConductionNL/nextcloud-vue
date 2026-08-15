# version-diff-viewer

`computeObjectDiff` generic nested diff utility, `foldAuditTrailEntries` audit-trail range folding, and the `CnVersionHistory` component + `version-history` integration descriptor for viewing an OpenRegister object's version/audit history with a field-by-field diff.

## ADDED Requirements

### Requirement: computeObjectDiff classifies every path as added, removed, changed, or unchanged

`src/utils/computeObjectDiff.js` SHALL export a pure function `computeObjectDiff(oldValue, newValue)` that recursively walks nested plain objects and arrays and returns a flat array of `{path, type, oldValue, newValue}` entries, where `type` is one of `added` (key present only in `newValue`), `removed` (key present only in `oldValue`), `changed` (present in both, values differ), or `unchanged` (present in both, values deep-equal). It SHALL NOT mutate either input.

#### Scenario: Flat object with an added, removed, changed, and unchanged field

- **GIVEN** `oldValue = { a: 1, b: 2, c: 3 }` and `newValue = { a: 1, b: 20, d: 4 }`
- **WHEN** `computeObjectDiff(oldValue, newValue)` is called
- **THEN** the result includes `{ path: 'a', type: 'unchanged' }`, `{ path: 'b', type: 'changed', oldValue: 2, newValue: 20 }`, `{ path: 'c', type: 'removed', oldValue: 3 }`, and `{ path: 'd', type: 'added', newValue: 4 }`
- **AND** neither `oldValue` nor `newValue` is mutated

#### Scenario: Nested objects and arrays produce dotted/bracketed paths

- **GIVEN** `oldValue = { user: { name: 'A', tags: ['x', 'y'] } }` and `newValue = { user: { name: 'A', tags: ['x', 'z'] } }`
- **WHEN** `computeObjectDiff(oldValue, newValue)` is called
- **THEN** the result contains an entry with `path: 'user.tags[1]'`, `type: 'changed'`, `oldValue: 'y'`, `newValue: 'z'`
- **AND** an entry with `path: 'user.name'`, `type: 'unchanged'`

#### Scenario: Explicit null is distinguished from an absent key

- **GIVEN** `oldValue = { a: null }` and `newValue = {}`
- **WHEN** `computeObjectDiff(oldValue, newValue)` is called
- **THEN** the result contains `{ path: 'a', type: 'removed', oldValue: null }` (the key existed with an explicit `null` value and was removed) — distinct from the case `oldValue = {}`, `newValue = { a: null }`, which SHALL produce `{ path: 'a', type: 'added', newValue: null }`
- **AND** the case `oldValue = { a: null }`, `newValue = { a: null }` SHALL produce `{ path: 'a', type: 'unchanged' }`

#### Scenario: A type change is reported as a single changed leaf, not a partial recursive diff

- **GIVEN** `oldValue = { a: { x: 1 } }` and `newValue = { a: [1, 2] }`
- **WHEN** `computeObjectDiff(oldValue, newValue)` is called
- **THEN** the result contains exactly one entry for `path: 'a'` with `type: 'changed'`, `oldValue: { x: 1 }`, `newValue: [1, 2]` — it does not attempt to recurse into mismatched container types

@e2e exclude Pure function; fully covered by unit tests, no DOM/e2e surface.

### Requirement: foldAuditTrailEntries reconstructs a before/after state across a range of audit-trail entries

`src/utils/auditTrailDiff.js` SHALL export a pure function `foldAuditTrailEntries(entries)` accepting an oldest-first ordered array of OpenRegister audit-trail entries (each optionally carrying a `changed: {field: {old, new}}` map) and returning `{oldState, newState}`, where for every field touched by any entry in the range, `oldState[field]` is the `old` value from the first entry that touched it and `newState[field]` is the `new` value from the last entry that touched it. Entries with a missing or malformed `changed` map SHALL be skipped without throwing.

#### Scenario: A single entry folds to its own changed map

- **GIVEN** one audit-trail entry with `changed: { status: { old: 'draft', new: 'published' } }`
- **WHEN** `foldAuditTrailEntries([entry])` is called
- **THEN** the result is `{ oldState: { status: 'draft' }, newState: { status: 'published' } }`

#### Scenario: A field touched by multiple entries keeps the first old and the last new

- **GIVEN** entry 1 (`changed: { status: { old: 'draft', new: 'review' } }`) followed chronologically by entry 2 (`changed: { status: { old: 'review', new: 'published' } }`)
- **WHEN** `foldAuditTrailEntries([entry1, entry2])` is called
- **THEN** the result is `{ oldState: { status: 'draft' }, newState: { status: 'published' } }` (the intermediate "review" state does not leak into either side)

#### Scenario: Malformed entries are skipped without throwing

- **GIVEN** an array containing `null`, an entry with no `changed` key, and one valid entry
- **WHEN** `foldAuditTrailEntries(entries)` is called
- **THEN** no error is thrown and the result reflects only the valid entry's fields

@e2e exclude Pure function; fully covered by unit tests, no DOM/e2e surface.

### Requirement: CnVersionHistory lists version/audit history newest-first with OpenRegister pagination

`CnVersionHistory` SHALL fetch `GET {apiBase}/objects/{register}/{schema}/{objectId}/audit-trails` (default `apiBase = '/apps/openregister/api'`) with `limit`, `_page`, and `_sort[created]=DESC`, and render the returned `results` newest-first showing each entry's timestamp, user, semantic `version` (when present), and `action`. It SHALL support loading more pages via the `results`/`total` envelope, matching `CnAuditTrailTab`'s existing pagination convention.

#### Scenario: History list renders newest-first with a load-more control

- **GIVEN** the API returns `{ results: [entry1, entry2], total: 5 }` for page 1
- **WHEN** `CnVersionHistory` mounts with valid `register`/`schema`/`objectId` props
- **THEN** both entries render in the order returned (newest-first, per the `_sort[created]=DESC` request) and a "Load more" control is shown because `total > results.length`

#### Scenario: Empty state when there are no audit-trail entries

- **GIVEN** the API returns `{ results: [], total: 0 }`
- **WHEN** `CnVersionHistory` mounts
- **THEN** an empty-state message is rendered and no list rows appear

@e2e include Mount CnVersionHistory against a live OpenRegister object with at least 2 audit-trail entries; assert list order and load-more behavior.

### Requirement: Selecting a version, or comparing two, opens a changed-fields-only diff table with a show-all toggle

Clicking a single history row SHALL open a diff view for that entry's own `changed` map (a range of one). Checking exactly two rows and activating "Compare" SHALL open a diff view for the folded range between those two entries (via `foldAuditTrailEntries` + `computeObjectDiff`). The diff view SHALL render a field | old value | new value table, showing only `added`/`removed`/`changed` rows by default, with a "Show all fields" toggle that also reveals `unchanged` rows.

#### Scenario: Single-entry diff shows only its changed fields by default

- **GIVEN** a history entry with `changed: { name: { old: 'Acme', new: 'Acme B.V.' }, email: { old: 'x@y.nl', new: null } }`
- **WHEN** the user clicks that row
- **THEN** the diff table shows exactly two rows: `name` (changed, "Acme" → "Acme B.V.") and `email` (changed, "x@y.nl" → "null")

#### Scenario: Two-row compare folds the range before diffing

- **GIVEN** two checked entries whose folded range (`foldAuditTrailEntries`) produces `oldState: { status: 'draft' }`, `newState: { status: 'published' }`
- **WHEN** the user activates "Compare"
- **THEN** the diff table shows one row for `status` classified `changed`, "draft" → "published"

#### Scenario: Show all fields toggle reveals unchanged nested rows

- **GIVEN** a diff whose `computeObjectDiff` result includes an `unchanged` entry nested inside an otherwise-changed object field (e.g. `address.city` unchanged while `address.street` changed)
- **WHEN** the diff view first opens
- **THEN** only the `address.street` row is visible
- **WHEN** the user toggles "Show all fields"
- **THEN** the `address.city` unchanged row also becomes visible

@e2e include Mount CnVersionHistory, click a single row to open its diff, verify changed-only rows; check two rows and Compare; toggle "Show all fields" and verify unchanged rows appear/disappear.

### Requirement: Nested diff values render as color-tinted pretty-printed JSON using NC CSS variables only

When a diff row's old or new value is an object or array, `CnVersionHistory` SHALL render it as pretty-printed JSON with per-line tinting: lines only present in the new value tinted with `--color-success`, lines only present in the old value tinted with `--color-error`, and lines whose value changed tinted with `--color-warning`. No hardcoded color values SHALL appear in the component's styles.

#### Scenario: Nested object diff is rendered with per-type tinting

- **GIVEN** a diff row whose `oldValue` is `{ street: 'Main St', city: 'Utrecht' }` and `newValue` is `{ street: 'Elm St', city: 'Utrecht', country: 'NL' }`
- **WHEN** the diff view renders that row
- **THEN** the `street` line is tinted as changed (`--color-warning`), the `country` line is tinted as added (`--color-success`), and the `city` line has no diff tint (unchanged)

@e2e include Mount CnVersionHistory with a nested-object diff fixture; assert the tint CSS classes present on each rendered JSON line.

### Requirement: CnVersionHistory is registered as a built-in integration without colliding with the existing audit-trail integration

`src/integrations/builtin/version-history.js` SHALL export a `version-history` integration descriptor (`tab: CnVersionHistory`, `widget: CnVersionHistory`) registered in `src/integrations/builtin/index.js`'s `builtinIntegrations` list under a distinct id (`version-history`), so it does not override or replace the existing `audit-trail` descriptor. `CnVersionHistory` SHALL also be exported from the standard three-tier barrel (`src/components/CnVersionHistory/index.js` → `src/components/index.js` → `src/index.js`) so it can be adopted directly, without the registry, by any consuming app.

#### Scenario: Registering built-ins adds both audit-trail and version-history without collision

- **GIVEN** a fresh integration registry
- **WHEN** `registerBuiltinIntegrations(registry)` is called
- **THEN** the registry has entries for both `audit-trail` (unchanged) and `version-history`
- **AND** `registry.get('version-history').widget` is `CnVersionHistory`

@e2e exclude Registry wiring; covered by unit tests over `registerBuiltinIntegrations`, no DOM surface of its own beyond what the "history list" and "diff table" scenarios above already cover end-to-end.
