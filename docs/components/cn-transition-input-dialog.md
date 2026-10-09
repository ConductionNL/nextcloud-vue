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

## Reference inputs and object inputs

An input whose schema property is an object reference (`$ref`, as `fieldsFromSchema` reports it) is **picked, never typed**: the dialog renders [`CnResourceSelect`](./cn-resource-select.md) over the referenced schema (in the property's register, else the dialog's `register`) and sends the picked uuid. The input entry may carry `picker`:

| Key | Description |
|-----|-------------|
| `filter` | Field values the candidates must match, e.g. `{ lifecycle: 'active' }`. |
| `excludeSelf` | Drop the record the transition runs on (`currentObject`) from the options. |
| `labelField` | The field shown as the label. |

An input whose property is `type: object` renders its sub-properties as fields, narrowed to the input's `fields` list when it names one. On confirm the dialog sends **one object**: the record's current value of that property with the typed sub-values merged over it, so a sub-field that was not asked for keeps its value. It never sends a dotted key (the server checks top-level keys). A sub-field is required when the input names it in `fields` and the sub-schema lists it in `required`, or when the whole input is required and it is the only one asked. A refusal naming `<input>.<sub>` marks that sub-field.

Two props support this: `currentObject` (default `null`, the record the transition runs on: the `excludeSelf` id and the merge base) and `register` (default `''`, the register the pickers look in).

The server-declared inputs of an `/available-actions` transition get the same hints from the manifest: see [`CnLifecycleActions`](./cn-lifecycle-actions.md#input-hints).
