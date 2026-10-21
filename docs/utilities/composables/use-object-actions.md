# useObjectActions

Read the actions OpenRegister lets the person run on an object, or on a selection of a schema's objects, and run one. OpenRegister decides what is listed: an action the person may not run is absent, and one that cannot run now is listed with `available: false` and the reason. The composable renders that answer and adds no rights of its own.

```js
import { computed } from 'vue'
import { useObjectActions } from '@conduction/nextcloud-vue'

const { forSurface, run, progress } = useObjectActions(() => ({ register: 'zaken', schema: 'case', id: caseId.value }))
const buttons = computed(() => forSurface('header'))
const result = await run('publish', { from: '2026-11-01' })
```

| Param | Description |
|-------|-------------|
| `target` | `{ register, schema, id }`, a ref or a getter. Without `id`, a selection. |
| `options.immediate` | Read the list at once and again when the target changes. Default `true`. |
| `options.pollInterval` | Milliseconds between reads of an async run. Default `1500`. |

| Returns | Description |
|---------|-------------|
| `actions` | `Ref<Array>` of listed actions: `{ key, kind, label, description, icon, surfaces, available, reason, inputs, confirm, mode, next }`. |
| `loading`, `failed`, `unsupported` | Read state. `unsupported` is true when the OpenRegister instance has no actions route yet. |
| `forSurface(surface, include?)` | The actions offered on `header`, `row`, `bulk` or `detail-menu`, narrowed to the `include` keys in their order. |
| `find(key)` | One listed action. |
| `run(key, inputs?, { follow? })` | `POST .../{id}/actions/{key}` with `{ inputs }`. Resolves a result and never throws. A sync run answers `status: 'completed'`; an async run answers 202 and is followed in `progress` until it ends. A suspended run answers `status: 'suspended'`, never `completed`. |
| `runOnSelection(key, ids, inputs?)` | `POST /api/object-actions/{register}/{schema}/{key}` with `{ ids, inputs }`. Up to 100 ids it answers a `summary`; above that a bulk `job`. |
| `running`, `progress`, `lastResult` | The key in flight, the async run (`{ action, run, status, steps, error }`) and the last result. |
| `refresh()`, `stop()` | Read the list again; stop following a run. |

A refused run answers `{ ok: false, httpStatus, error, message, fieldErrors }`. A 409 carries `error: 'action-precondition-unmet'` and the declared reason; a 422 names the refused inputs in `fieldErrors`. After a run that changed something the composable emits `cn:page:refresh` and reads the list again.

Without an `id` the target is a selection, and the list is the one `GET /api/object-actions/{register}/{schema}` answers.

Next: render the list with the manifest action type `object-action` or `actionsFrom: "openregister"`, described in [dispatchAction](../dispatch-action.md).
