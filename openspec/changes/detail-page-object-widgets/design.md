# Design — detail-page object files + related resolution

## Context
- `CnDetailPage` renders manifest detail widgets; for `type: related` it mounts
  `CnRelatedObjectsWidget` with `:object-data="currentObject"`. For `type: files`
  it currently mounts `CnFilesWidget` (placement-based: `{apiBase}/api/widgets/
  files/{placementId}/...`), which has no object context.
- `CnRelatedObjectsWidget` resolves register/schema/id from props or
  `objectData['@self']` and fetches `/uses` + `/used` + `/relations`. The
  OpenRegister object-files endpoint `/api/objects/{reg}/{schema}/{id}/files`
  works (after the MagicMapper files-endpoint fix) and accepts JSON `{name, content}`.

## Decisions

### 1. Object-bound files — new mode, keep dashboard widget
Add an object-folder mode rather than overloading the placement widget. Prefer a
dedicated `CnObjectFilesWidget` (props: `register`, `schema`, `objectId` /
`objectData`) that calls the object-files endpoints, so `CnFilesWidget`'s
dashboard contract is untouched (Rules for Modifying Components: never break prop
interfaces). `CnDetailPage` dispatches `type: files` to the object-bound widget
when an object context is present.

### 2. Related resolution — verify deployed path, render non-empty groups
The empty-Related symptom is likely deployed-bundle drift: the runtime loads the
published `@conduction/nextcloud-vue`, which may predate the resolve-from-`@self`
path. The fix ships in the library and propagates via the normal beta release
the OpenBuild bundle consumes. Ensure `visibleGroups` includes any group with
`total > 0` (objects = uses∪used, files, leaf groups) and only hides empty ones.

### 3. No new endpoints
Both features use existing OpenRegister endpoints; this is a frontend (nc-vue)
change only. Branch off `beta` (nc-vue convention).

## Risks
- Files widget context resolution must handle the create-mode (no objectId) by
  disabling upload until the object is saved.
- Related rendering must not regress the genuinely-empty hidden-group behaviour.

## Seed Data
None — frontend components; verified against the Pet Store demo objects.
