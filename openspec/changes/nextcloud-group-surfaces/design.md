# Design: nextcloud-group-surfaces

## 1. Inline editor picks a group or a user

`fieldsFromSchema` already gives a property marked `referenceType:
nextcloud-group` (or `format: nc-group`) the widget `group`, and an array of
them `group-multiselect`; the same for users (`user`, `user-multiselect`).
`CnObjectDataWidget` had no branch for these four widgets, so they fell to the
text fallback. It now renders an `NcSelect` (an `NcSelectUsers` for users, the
same choice `CnFormDialog` makes) whose options come from the same
`searchNextcloudGroups` / `searchNextcloudUsers` helpers the dialogs use. The
search is debounced by the select's own `@search`, the stored value stays the
group id (or uid), and the selected option shows the display name, resolved
once through `resolveNextcloudGroup` / `resolveNextcloudUser` when editing
starts.

## 2. A group cell

`CnCellRenderer` gets a built-in widget `group`, used automatically when the
column's schema property is marked as a group (`referenceType:
nextcloud-group`, `format: nc-group`, or an array whose `items` is). It renders
`CnGroupNameCell`, which reads a module-level cache in `groupAutocomplete.js`:
`groupDisplayName(gid)` returns the cached name or `null`, and
`loadGroupDisplayName(gid)` asks once per id (concurrent calls share the
request). Until the name arrives, and when the lookup fails, the cell shows
the id, so it never shows nothing for a value that is there. The cache is a
reactive map, so every cell holding the same id updates at once and a table of
fifty rows with three teams makes three requests.

## 3. `@myGroups`

The token belongs to the **filter** context. `resolveFilterValue('@myGroups')`
returns an array of group ids. Because every caller of the resolver is
synchronous, the groups come from a reactive peek over the existing
`getCurrentUserGroups()` cache (`peekCurrentUserGroups()` in
`widgetVisibility.js`): it returns the array once loaded and `null` while the
first request is in flight, starting that request on first use. A computed
filter (such as `CnObjectListWidget.resolvedFilter`) therefore re-runs when the
groups arrive, and its `sourceKey` watcher fetches.

While the groups are loading, and when the user is in no group, the token
stays unresolved. `hasUnresolvedTokens` then reports the filter as waiting, so
the widget does not fetch. This is deliberate: OpenRegister treats an empty
IN list as no constraint (`empty($value)` skips the clause in
`MagicSearchHandler::buildObjectFilterConditionsSql`), so sending `[]` would
show every team's work to a person in no team.

Inside an IN list (`['@myGroups', 'archive']`) the resolved ids are spread in
place. The operator form (`{ in: '@myGroups' }`) works too. A `ctx.myGroups`
array wins over the peek, for tests and for a host that already knows them.

**How OpenRegister reads it.** The object-search endpoint reads a bare array
value as `IN`: `assignedGroup[]=a&assignedGroup[]=b` arrives in PHP as
`['a', 'b']` and becomes `assignedGroup IN ('a', 'b')`. The explicit
`assignedGroup[in][]=a` form is equivalent. axios serialises an array param as
repeated `key[]`, which is what `CnObjectListWidget` sends.

The pattern string in `SENTINEL_TOKEN_PATTERNS.filter` and the manifest
schema's `sentinelFilterToken` gain `myGroups`; the byte-equality test keeps
the two the same.

## Risks

- A widget that resolves tokens once in a method (not a computed) and finds
  `@myGroups` still loading will wait until something else triggers a fetch.
  `CnObjectListWidget` uses a computed; the docs say so.
