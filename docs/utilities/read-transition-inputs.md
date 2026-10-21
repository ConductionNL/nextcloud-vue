# readTransitionInputs

Reads a host's values against declared transition inputs, the same way [`CnTransitionInputFields`](../components/cn-transition-input-fields.md) and [`CnTransitionInputDialog`](../components/cn-transition-input-dialog.md) do: whether every shown, required input is filled, and the values to send for the inputs that are asked now.

```js
import { readTransitionInputs } from '@conduction/nextcloud-vue'

const { complete, data } = readTransitionInputs(inputs, values, { context: { pauseReasons } })
```

| Param | Type | Description |
|-------|------|-------------|
| `declared` | `Array<object>` | The declared inputs. |
| `values` | `object` | The values, keyed by field. |
| `options` | `object` | `{ schema, register, context, now }`: the schema, the register reference pickers fall back to, what `optionsSource` reads, and what counts as today. |

Returns `{ complete, data }`. A hidden input and a template are left out of `data`, a picked "Other" is sent as `''`, and a number input as a number.
