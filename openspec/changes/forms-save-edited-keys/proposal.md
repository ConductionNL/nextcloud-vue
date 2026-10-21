# Proposal: an edit writes only the keys it changed

## Why

Every library edit save wrote the whole form back with PUT. A form shows some of an object's keys, so each save dropped the keys the form did not show. dossiq's legacy status tab lost `capacity`, `phaseTermDays` and `phaseTermShare` this way, and any manifest form over a schema with keys it does not show does the same.

## What changes

- The object store gains `patchObject(type, id, changes)`: a PATCH carrying only `changes`.
- `utils/saveEdited.js` diffs the edited values against the object as it was loaded and PATCHes the keys that changed. It sends nothing when nothing changed. A key the form leaves out is not a change.
- The index page's edit dialog, the detail page's edit form and `CnObjectDataWidget` (inline and dialog) save through it. Creates still POST.
- A store without `patchObject` keeps its full save.

## Impact

Keys a form does not show survive its save. Hosts that save through their own handlers are unchanged.
