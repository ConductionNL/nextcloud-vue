## ADDED Requirements

### Requirement: createManifestEditHistory provides a bounded snapshot history

The library SHALL export a pure, Vue-free factory `createManifestEditHistory({ limit = 100, coalesceMs = 0 })` from `src/utils/manifestEditHistory.js` returning `{ push(state, label?), undo(), redo(), canUndo, canRedo, clear(), current, size }`. Each entry SHALL be a full snapshot of the pushed state. When pushing beyond `limit`, the oldest entry SHALL be evicted so `size` never exceeds `limit`. The core module SHALL NOT import from `vue`.

> @e2e exclude library utility, covered by consumer app e2e

#### Scenario: Push and read back the current state
- **WHEN** `push(stateA)` is called on a fresh history
- **THEN** `current` SHALL deep-equal `stateA`
- **AND** `size` SHALL be `1` and `canUndo` SHALL be `false`

#### Scenario: Limit eviction drops the oldest entry
- **WHEN** a history created with `{ limit: 3 }` receives four pushes `s1..s4`
- **THEN** `size` SHALL be `3`
- **AND** repeated `undo()` SHALL walk back through `s3` then `s2` and then return `null` (s1 evicted)

#### Scenario: Default limit is 100
- **WHEN** a history is created with no options and receives 101 pushes
- **THEN** `size` SHALL be `100`

### Requirement: undo and redo traverse the stack with correct flags

`undo()` SHALL move the cursor one entry back and return the new current state; `redo()` SHALL move it one entry forward and return the new current state. `canUndo` SHALL be `true` exactly when an earlier entry exists; `canRedo` SHALL be `true` exactly when a later entry exists. `undo()` with no earlier entry and `redo()` with no later entry SHALL return `null` and leave `current`, `size`, and both flags unchanged. Undone-then-redone states SHALL deep-equal the originally pushed states.

> @e2e exclude library utility, covered by consumer app e2e

#### Scenario: Undo returns the previous snapshot
- **WHEN** `push(s1)` then `push(s2)` then `undo()` are called
- **THEN** `undo()` SHALL return a state deep-equal to `s1`
- **AND** `current` SHALL deep-equal `s1`, `canUndo` SHALL be `false`, and `canRedo` SHALL be `true`

#### Scenario: Redo restores the undone snapshot
- **WHEN** after `push(s1)`, `push(s2)`, `undo()`, `redo()` is called
- **THEN** `redo()` SHALL return a state deep-equal to `s2`
- **AND** `canRedo` SHALL be `false` and `canUndo` SHALL be `true`

#### Scenario: Undo at the bottom is a null no-op
- **WHEN** `undo()` is called on a history holding a single entry
- **THEN** it SHALL return `null`
- **AND** `current` and `size` SHALL be unchanged

#### Scenario: Redo with no tail is a null no-op
- **WHEN** `redo()` is called without a preceding `undo()`
- **THEN** it SHALL return `null`
- **AND** `current` SHALL be unchanged

#### Scenario: Interleaved undo/redo walks deterministically
- **WHEN** `push(s1)`, `push(s2)`, `push(s3)`, `undo()`, `undo()`, `redo()` are called in order
- **THEN** `current` SHALL deep-equal `s2`
- **AND** `canUndo` and `canRedo` SHALL both be `true`

### Requirement: Push after undo discards the redo tail

A `push()` while the cursor is not at the top SHALL discard all entries after the cursor (the redo tail) before appending, so `canRedo` becomes `false` and the discarded states are unreachable.

> @e2e exclude library utility, covered by consumer app e2e

#### Scenario: Branching discards redo entries
- **WHEN** after `push(s1)`, `push(s2)`, `push(s3)`, `undo()`, `undo()`, a new `push(s4)` is made
- **THEN** `canRedo` SHALL be `false`
- **AND** `current` SHALL deep-equal `s4` and `undo()` SHALL return a state deep-equal to `s1`
- **AND** no sequence of calls SHALL reach `s2` or `s3` again

### Requirement: Rapid same-label pushes coalesce within the window

When created with `coalesceMs > 0`, a `push(state, label)` SHALL replace the top entry instead of appending when the previous push occurred within `coalesceMs`, both pushes carry the same non-empty `label`, and no `undo()` has occurred since the previous push. Pushes with different labels, missing labels, outside the window, or with `coalesceMs: 0` (the default) SHALL always append. The factory SHALL accept an injectable clock (`now` option, defaulting to `Date.now`) so the window is deterministically testable.

> @e2e exclude library utility, covered by consumer app e2e

#### Scenario: Same-label pushes inside the window merge into one entry
- **WHEN** a history with `{ coalesceMs: 500 }` receives `push(s1, 'edit:title')` and, 100 simulated ms later, `push(s2, 'edit:title')`
- **THEN** `size` SHALL be `1` and `current` SHALL deep-equal `s2`
- **AND** `canUndo` SHALL be `false`

#### Scenario: Different labels never coalesce
- **WHEN** `push(s1, 'edit:title')` is followed 100 simulated ms later by `push(s2, 'move:widget')` on the same history
- **THEN** `size` SHALL be `2` and `undo()` SHALL return a state deep-equal to `s1`

#### Scenario: Pushes outside the window append
- **WHEN** `push(s1, 'edit:title')` is followed 600 simulated ms later by `push(s2, 'edit:title')` with `coalesceMs: 500`
- **THEN** `size` SHALL be `2`

#### Scenario: Coalescing is disabled by default
- **WHEN** a history created without `coalesceMs` receives two immediate same-label pushes
- **THEN** `size` SHALL be `2`

#### Scenario: Undo breaks a coalescing run
- **WHEN** `push(s0)`, `push(s1, 'edit:title')`, `undo()`, then `push(s2, 'edit:title')` all occur within the `coalesceMs` window
- **THEN** the post-undo push SHALL append after `s0` (branch discard), not replace-coalesce into the undone `s1` entry
- **AND** `current` SHALL deep-equal `s2` and `undo()` SHALL return a state deep-equal to `s0`

### Requirement: History entries are cloned on push and immutable

`push(state)` SHALL deep-clone the incoming state before storing, so later mutation of the caller's object SHALL NOT alter any stored entry. Stored snapshots SHALL be deep-frozen; `current`, `undo()`, and `redo()` SHALL return the frozen stored snapshot. A push whose state deep-equals `current` SHALL be a no-op (no new entry).

> @e2e exclude library utility, covered by consumer app e2e

#### Scenario: Mutating the source after push does not alter history
- **WHEN** an object is pushed and the caller subsequently mutates a nested field on it
- **THEN** `current` SHALL still deep-equal the state as it was at push time

#### Scenario: Returned snapshots are deep-frozen
- **WHEN** a consumer reads `current` after a push
- **THEN** `Object.isFrozen` SHALL be `true` for the returned object and for a nested object within it
- **AND** attempting to assign to a nested field SHALL NOT change what `current` returns

#### Scenario: Pushing an unchanged state is a no-op
- **WHEN** the same deep-equal state is pushed twice in a row
- **THEN** `size` SHALL be `1`

### Requirement: clear resets the history

`clear()` SHALL remove all entries and any coalescing state: afterwards `size` SHALL be `0`, `current` SHALL be `null`, and `canUndo` / `canRedo` SHALL both be `false`.

> @e2e exclude library utility, covered by consumer app e2e

#### Scenario: Clear empties a populated history
- **WHEN** `clear()` is called after several pushes and an `undo()`
- **THEN** `size` SHALL be `0`, `current` SHALL be `null`, and both `canUndo` and `canRedo` SHALL be `false`
- **AND** a subsequent `push(s1)` SHALL behave as on a fresh history

### Requirement: useManifestEditHistory exposes the history reactively for Vue 2.7

The library SHALL export a composable `useManifestEditHistory(options)` from `src/composables/useManifestEditHistory.js` that wraps a core `createManifestEditHistory` instance and exposes `push` / `undo` / `redo` / `clear` plus reactive refs `canUndo`, `canRedo`, `size`, and `current` that update after every mutating call. The composable SHALL contain no history logic of its own beyond the ref mirroring. Both the util and the composable SHALL be exported from the library barrel (`src/index.js`; the composable additionally via `src/composables/index.js`).

> @e2e exclude library utility, covered by consumer app e2e

#### Scenario: Reactive flags update across push and undo
- **WHEN** a component calls `useManifestEditHistory()`, then `push(s1)`, `push(s2)`, `undo()`
- **THEN** after the second push `canUndo.value` SHALL be `true` and `canRedo.value` SHALL be `false`
- **AND** after `undo()` `canUndo.value` SHALL be `false`, `canRedo.value` SHALL be `true`, and `current.value` SHALL deep-equal `s1`

#### Scenario: Composable delegates semantics to the core util
- **WHEN** the composable receives `{ limit: 2 }` and three pushes
- **THEN** `size.value` SHALL be `2` (limit eviction identical to the core util)

#### Scenario: Barrel exports resolve
- **WHEN** a consumer imports `createManifestEditHistory` and `useManifestEditHistory` from `@conduction/nextcloud-vue`
- **THEN** both SHALL be defined functions
