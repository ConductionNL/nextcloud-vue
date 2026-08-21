# CnTransitionInputDialog

Collects a lifecycle transition's declared `inputs` before the transition is
applied. Mounted by [`CnLifecycleActions`](./cn-lifecycle-actions.md) when the
clicked transition declares an `inputs` list (mirroring the schema's
`x-openregister-lifecycle.transitions.<action>.inputs`); the transition
endpoint then accepts `{ action, data: { <field>: <value> } }`.

The dialog performs **no request itself** — it emits `confirm` with the
collected values and the parent POSTs. Cancelling emits `close` only, so no
request is made. Lives in its own file under `src/dialogs/` per the
modal-isolation rule.

## Import

```js
import { CnTransitionInputDialog } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnTransitionInputDialog
  v-if="inputTransition"
  :transition="inputTransition"
  :schema="schema"
  @confirm="onInputConfirm"
  @close="inputTransition = null" />
```

```js
// In methods:
async onInputConfirm(data) {
  this.inputTransition = null
  await axios.post(url, { action: 'reject', data })
}
```

## Field rendering

Each declared input's field is resolved against the object's JSON Schema via
`fieldsFromSchema()` when a `schema` is given:

- Label = the property's `title` (required inputs get a ` *` marker).
- `boolean` → `NcCheckboxRadioSwitch` (switch).
- `number` / `integer` → `NcTextField` with `type="number"` (value cast to a
  number on confirm).
- Long text (`maxLength > 255`, or a `textarea`/`markdown` format) →
  `NcTextArea`.
- Everything else — including richer widgets like selects or date pickers, and
  fields the schema does not declare — degrades to a plain labelled
  `NcTextField`. Deliberately minimal: this is not a form engine (use
  [`CnFormDialog`](./cn-form-dialog.md) for full object forms).

The confirm button's label is the **transition's label** and stays disabled
until every `required: true` input holds a non-empty value (a required boolean
must be checked; whitespace does not count).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `transition` | `Object` | — (required) | The transition being applied: `{ action, label, inputs: [{ field, required }] }`. `label` doubles as dialog title + confirm label. |
| `schema` | `Object \| null` | `null` | The object's JSON Schema (with `properties`) used to resolve labels/widgets. Optional — undeclared fields render as plain text inputs. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `{ <field>: <value>, ... }` | The user confirmed with all required inputs filled. Payload holds **exactly** the declared input keys; the parent POSTs `{ action, data }`. |
| `close` | — | Cancel / dialog dismissed. No `confirm` was or will be emitted. |
