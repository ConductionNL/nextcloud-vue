---
id: cn-quick-edit-dialog
title: CnQuickEditDialog
---

# CnQuickEditDialog

Edit a few fields of one row without leaving the list. A handler triaging
ninety cases sets the afdeling on each one from where they already are, and the
list keeps its place.

It is the page's own form, narrowed. The fields render through `CnFormDialog`,
the same widgets the detail page renders, so a date is a date picker here as
well as there and nobody learns a second form.

## Usage

```vue
<CnQuickEditDialog
  v-if="editing"
  :object="editing"
  :schema="schema"
  register="dossiq"
  :fields="['afdeling', 'behandelaar']"
  @save="onSave"
  @close="editing = null" />
```

On an index page, declare `quickEditFields` instead and the page opens the
dialog itself, from the row or from the `e` key:

```json
"quickEditFields": ["afdeling", "behandelaar"]
```

## Two rules it does not bend

**A field you may not write renders read-only.** The page names which fields
the quick edit asks for. The record says which of those this caller may change,
at `writableField` (default `@self.writableFields`). A field outside that list
is locked, not hidden, so a person sees the value and learns it is not theirs
to change. A record carrying nothing there is a server that does not answer
about field permissions, and every named field stays editable.

Note which side decides what. The page decides membership: a record cannot open
a form on a field the page did not name, whatever it lists. The record decides
permission among what the page named.

**A save against a row somebody changed overwrites nothing.** Pass the row as
the server holds it back through `serverObject` and the dialog shows both
values, field by field, and asks. Only the fields this person is actually
writing count as a conflict: stopping a save because a colleague changed a
field nobody here touched teaches people to click through the warning.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | `Object` | required | The row being edited. |
| `schema` | `Object` | `null` | The schema the form renders from. |
| `register` | `String` | `''` | Register slug, for resolving object references. |
| `fields` | `Array` | `[]` | The fields this quick edit asks for. The page names them. |
| `writableField` | `String` | `'@self.writableFields'` | Where the record lists the fields this caller may write. |
| `serverObject` | `Object` | `null` | The row as the server holds it now, when a save came back stale. Set it and the conflict view opens. |
| `title` | `String` | `'Quick edit'` | Dialog heading. |
| `size` | `String` | `'normal'` | Dialog size, passed to `CnFormDialog`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `save` | `{ id, patch }` | The fields to write: only the ones the page named, that this caller may write, whose value changed. |
| `keep-theirs` | the server's record | The person chose the server's version after a conflict. Nothing of their edit is written. |
| `close` | none | The dialog closed. |

## Helpers

Exported alongside it, from `src/utils/quickEdit.js`:

- `writableQuickEditFields(row, fields, writableField)` — the named fields this
  caller may write.
- `quickEditPatch(row, data, fields, writableField)` — the fields that changed.
- `conflictingFields(opened, server, patch)` — what moved under the edit.

Putting the saved row back is deliberately not here. `CnIndexPage` already
writes a saved record onto its row through its row-patch map, which is what
keeps the scroll, the selection and the page. A second way to do it would be a
second thing to keep in step.

Next: declare `quickEditFields` on the index page, then give the page
`listShortcuts` so `e` opens this dialog on the focused row.
