# CnOrderedListField

An ordered list a user keeps for themselves: rows in their order, each with a move up, a move down and a remove
button, and a search-as-you-type picker under it that adds a row. The board DqPersoonlijkeInstellingen draws it as
"Zaaktypen in mijn menu" in the personal settings.

The app supplies the choices and keeps the value: every change emits `update:modelValue` with the new list of values,
so `v-model` works. Reordering is done with the buttons, not by dragging, and every move, removal and addition is
announced in a polite live region, so it works with the keyboard and a screen reader. The picker is an `NcSelect`
with an `inputLabel`; it offers only the choices not in the list yet.

```vue
<CnOrderedListField
  v-model="menuCaseTypes"
  label="Case types in my menu"
  add-label="Add case type"
  add-placeholder="Search a case type"
  empty-text="No case types in your menu yet."
  :options="caseTypes" />
```

With `searchable` the picker does not filter `options` itself but emits `search` as the user types, so the app can
fetch matching choices (set `loading` while it does).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `Array` | `[]` | The values in their order. |
| `options` | `Array` | `[]` | The choices, `{ value, label, description?, icon? }`, or plain strings. `description` is a muted second line ("19 open cases") in the row and in the picker, and the row's buttons name it as their description; `icon` is an MDI name drawn in a small tile before the label. A listed value without a choice shows the value itself. |
| `label` | `String` | `''` | The list's label, also its accessible name. |
| `addLabel` | `String` | `'Add'` | The picker's label. |
| `addPlaceholder` | `String` | `''` | Placeholder in the picker. |
| `emptyText` | `String` | `'Nothing added yet.'` | Shown when the list is empty. |
| `searchable` | `Boolean` | `false` | The app searches (`search` event) instead of the picker filtering `options`. |
| `loading` | `Boolean` | `false` | Whether the app is fetching choices. |
| `disabled` | `Boolean` | `false` | A read-only list: the buttons are disabled and the picker is not drawn. |

## Events

| Event | Payload | When |
|---|---|---|
| `update:modelValue` | the values in their order | A row moved, was removed or was added. |
| `search` | the typed text | The user typed in the picker, with `searchable`. |
