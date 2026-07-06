# manifest-delta-merge

## MODIFIED Requirements

### Requirement: Keyed structural merge of identity-bearing arrays

`mergeManifestDelta(base, delta)` SHALL merge the manifest's identity-bearing arrays **by key** rather than replacing them wholesale. The keyed arrays and their identity fields are `pages[]` by `id`, `widgets[]` by `id`, `menu[]` by `id`, and **a menu entry's nested `children[]` by child `id`**. Every other array is replaced (delta wins), preserving deep-merge behaviour. `diffManifest` SHALL use the same keyed-array set so `diff → merge` round-trips are symmetric for all keyed arrays, including nested `children[]`.

#### Scenario: Adding children to a group preserves existing children

- **GIVEN** a base manifest with a `menu` entry `{ id: 'CasesGroup', children: [{ id: 'AllCases' }] }`
- **WHEN** merging a delta `{ menu: [{ id: 'CasesGroup', children: [{ id: 'ct-bezwaar' }, { id: 'ct-subsidie' }] }] }`
- **THEN** the merged `CasesGroup.children` is `[AllCases, ct-bezwaar, ct-subsidie]` — the base child is preserved and the delta children are appended by id

#### Scenario: Patching a single child leaves siblings untouched

- **GIVEN** a `CasesGroup` with children `[{ id: 'AllCases', label: 'All cases' }, { id: 'ct-x', label: 'Old' }]`
- **WHEN** merging `{ menu: [{ id: 'CasesGroup', children: [{ id: 'ct-x', label: 'New' }] }] }`
- **THEN** `ct-x.label` becomes `'New'` and `AllCases.label` remains `'All cases'`

#### Scenario: Removing a single child via $op:"remove"

- **GIVEN** a `CasesGroup` with children `[{ id: 'AllCases' }, { id: 'ct-gone' }]`
- **WHEN** merging `{ menu: [{ id: 'CasesGroup', children: [{ id: 'ct-gone', $op: 'remove' }] }] }`
- **THEN** the merged children are `[AllCases]`

#### Scenario: diff → merge round-trips a nested child edit

- **GIVEN** a base menu group and an edited copy with one added and one removed child
- **WHEN** applying `mergeManifestDelta(base, diffManifest(base, edited))`
- **THEN** the result equals `edited`, and the emitted delta carries only the changed child (plus a `$op:'remove'` marker for the dropped one), not the whole `children[]`
