---
kind: code
---

## Why

On the OpenBuild runtime detail page (a manifest `type: detail` page rendered by
`CnDetailPage`), two object-context widgets do not work as authors expect.
Found building the OpenBuild "Pet Store" demo:

1. **Files widget is not object-bound.** A `type: files` widget on a detail page
   renders `CnFilesWidget`, which is a LaunchPad/dashboard component scoped to a
   placement folder (`{apiBase}/api/widgets/files/{placementId}/...`). On a
   detail page it shows the user's Files root, not the **current object's**
   OpenRegister file folder. Authors want "drop files on this pet" — i.e. upload
   to / list `/apps/openregister/api/objects/{register}/{schema}/{id}/files`
   (the object-files endpoint; now working after the openregister MagicMapper
   files-endpoint fix). (Feature **H**.)

2. **Related widget renders empty.** `CnRelatedObjectsWidget` on the detail page
   receives `:object-data` and is meant to aggregate `/uses` + `/used` +
   `/relations` for the object, but the runtime detail shows an empty "Related"
   section even when the object has reverse relations (e.g. a pet referenced by
   visits/orders — `/used` returns rows). The widget either is not resolving
   register/schema/id from the deployed bundle or is not rendering the non-empty
   groups.

## What Changes

- **Object-bound files widget.** Add an object-folder mode to the detail-page
  files widget (or a dedicated `CnObjectFilesWidget`) that, given
  register/schema/objectId (from `object-data['@self']`), lists/uploads/deletes
  via the OpenRegister object-files endpoint. Drag-drop upload attaches the file
  to the object. Keep the placement-based `CnFilesWidget` for dashboards.
- **Related widget resolution.** Ensure `CnRelatedObjectsWidget` on the runtime
  detail resolves register/schema/id from `object-data['@self']` and renders all
  non-empty groups (`objects` = `/uses` ∪ `/used`, `files`, and leaf groups from
  `/relations`). Hidden-when-empty stays for genuinely empty groups; non-empty
  groups MUST render. Add a regression test with a fixture object that has
  reverse relations.

Note (`@object-source` field rendering, AD-18) is out of scope.

## Capabilities

### Modified Capabilities
- **manifest-detail-related-and-aggregates** — object-bound files widget on the
  detail page; related widget resolves and renders non-empty groups.

## Impact

- Detail pages can collect files against the object (Pet Store feature **H**)
  and show real related objects, files, and leaf entries.
- Dashboard `CnFilesWidget` behaviour is unchanged.
