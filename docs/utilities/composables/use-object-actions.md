# useObjectActions

The actions OpenRegister lists for one object, and running one (object-actions-declared-and-run).

```js
const { actions, load, run } = useObjectActions(() => ({ register: 'decidiq', schema: 'decision', id: decisionId }))
await load()
const result = await run('publish', { from: '2026-12-01' })
```

`address` is the object (or a getter for it): `{ register, schema, id }`.

- `load()` reads `GET /apps/openregister/api/objects/{register}/{schema}/{id}/actions` into `actions`: `[{ key, kind, label, description, icon, surfaces, available, reason?, inputs, confirm?, mode, next }]`. Actions the reader may not run are left out by the server. One whose condition fails is listed with `available: false` and the `reason`. A failed read gives `[]`.
- `run(key, inputs)` posts `{ inputs }` to `.../actions/{key}` and resolves `{ ok, queued, data?, message? }`. `queued` is true for a 202, when the run was queued or suspended. `message` is the server's reason on a refusal.

A `label`, `reason` or `confirm` may be a locale map (`{ nl, en }`). Pages read it in the reader's language. `CnDetailPage` with `actionsFrom: "openregister"` and the `object-action` manifest action type are built on this.
