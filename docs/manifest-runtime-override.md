# Overriding an app's manifest at runtime

Every manifest-driven Conduction app ships a **bundled** `src/manifest.json` that declares its shell — navigation, pages, widgets, dependencies — at build time. That is enough for apps whose structure is fixed. But some apps need their shell to depend on **runtime data**: one nav entry per catalogue, per organisation, per register, or per case type; a page hidden until a feature flag is on; a widget swapped for a tenant.

The library gives every app a single, fleet-wide mechanism for this: an app may serve its own **manifest override** from the backend, and [`useAppManifest`](utilities/composables/use-app-manifest.md) merges it over the bundled manifest before the shell renders. This page is the authoritative reference for that feature.

> **One feature, every app.** This is not a per-app bespoke pattern — it is a shared capability of `@conduction/nextcloud-vue`. Any app that mounts via `useAppManifest(appId, bundledManifest)` gets it for free; the only per-app work is (optionally) serving the endpoint.

## How it works

1. The app bootstraps with `useAppManifest(appId, bundledManifest, options?)`.
2. The composable synchronously mounts the **bundled** manifest so the app renders immediately.
3. In the background it issues a best-effort `GET /index.php/apps/{appId}/api/manifest`.
4. If that returns **`200` with a plain-object body**, the response is **merged** over the bundled manifest and the merged result replaces it reactively. Anything else — `404`, `5xx`, a network error, or the Nextcloud SPA HTML fallback — is silently ignored, so an app with **no** endpoint simply keeps its bundled manifest.
5. `@resolve:<key>` sentinels are resolved, the result is validated against the manifest schema, and only a **valid** manifest is mounted (an invalid override is discarded with a `console.warn`, never rendered).

Because the fetch is best-effort and the bundled manifest is always the fallback, **serving the endpoint is opt-in and never a hard dependency**.

## Choosing a merge strategy

The override is merged with one of two strategies, selected by `options.mergeStrategy`:

| Strategy | Arrays | Backend returns | Use when |
|---|---|---|---|
| `'deepMerge'` *(default)* | **Replaced wholesale** | The **complete** resolved arrays (whole `menu[]`, whole `pages[]`) | The backend owns the entire nav/pages and it's easy to emit them in full. |
| `'delta'` | **Merged by `id`** | Only the **difference** — patch/add/remove individual entries | You want to *extend* a bundled/`buildManifest`-assembled shell without reproducing it, or persist a minimal patch. |

In **`delta`** mode the keyed structural merge ([`mergeManifestDelta`](utilities/merge-manifest-delta.md)) merges `pages[]`, `widgets[]`, `menu[]`, **and a menu entry's nested `children[]`** by `id`:

- a delta entry whose `id` **matches** a base entry is merged into it (patch);
- a delta entry whose `id` is **new** is appended;
- `{ "id": "x", "$op": "remove" }` deletes the matching base entry;
- `__order` reorders a keyed array by id sequence.

```js
import { useAppManifest } from '@conduction/nextcloud-vue'
import bundled from './manifest.json'

const { manifest, isLoading, validationErrors } = useAppManifest('procest', bundled, {
  mergeStrategy: 'delta',
})
```

## Worked example — one nav entry per case type

Dossiq builds its shell client-side with `buildManifest(base, fragments, menuLayout)`, which (via `menu-layout.json` relocations) places an "All cases" leaf under a `CasesGroup`. To add **one child per case type** under that group without touching the rest of the menu, procest serves a **delta** whose `children` merge by `id`:

**Backend `GET /index.php/apps/procest/api/manifest`:**

```json
{
  "menu": [
    {
      "id": "CasesGroup",
      "children": [
        { "id": "ct-bezwaar",  "label": "Objections", "route": "Cases", "query": { "caseType": "00000000-0000-0000-0000-000000000001" }, "order": 50 },
        { "id": "ct-beroep",   "label": "Appeals",    "route": "Cases", "query": { "caseType": "00000000-0000-0000-0000-000000000002" }, "order": 51 },
        { "id": "ct-subsidie", "label": "Subsidies",  "route": "Cases", "query": { "caseType": "00000000-0000-0000-0000-000000000003" }, "order": 52 }
      ]
    }
  ]
}
```

Because `children` is a keyed array, the merged `CasesGroup.children` becomes `["AllCases", "ct-bezwaar", "ct-beroep", "ct-subsidie"]` — the bundled "All cases" leaf is preserved and the case types are appended. Each child links to the shared `Cases` index route pre-filtered by `caseType`. Add a case type in the backoffice and it appears in the nav on next load; no rebuild.

## The backend contract

- **Route**: `GET /index.php/apps/{appId}/api/manifest` (override with `options.endpoint`).
- **Success**: HTTP `200`, `Content-Type: application/json`, body a JSON **object** (a full manifest for `deepMerge`, or a delta for `delta`). Any non-object body (including the SPA HTML fallback) is treated as "no override".
- **Resolution happens server-side.** Per [ADR-022](https://github.com/ConductionNL/hydra/tree/development/openspec/architecture), the backend queries the relevant OpenRegister objects (case types, catalogues, organisations) and returns the resolved entries — the frontend never fans out the data itself.
- **Security**: the endpoint is app-scoped and runs under the caller's Nextcloud session, so it MUST enforce the same RBAC as the underlying data — return only the entries the current user may see. A per-user menu is a feature, not a leak: resolve against the caller's permissions.
- **Cheap and cacheable**: it runs on every shell mount. Keep it a single indexed query (or cache it); it should not do heavy work.

## Related ADRs

- **ADR-024** (hydra) — "Dynamic per-tenant menu entries" + "Backend `/api/manifest` endpoint": the roadmap entry this feature implements.
- **ADR-022** (hydra) — apps consume OpenRegister abstractions: the backend resolves, the frontend renders.
- **ADR-036** (hydra) — the `delta` merge-mode amendment behind `mergeManifestDelta`.

## See also

- [useAppManifest](utilities/composables/use-app-manifest.md) — the composable that fetches and merges.
- [mergeManifestDelta](utilities/merge-manifest-delta.md) — the keyed merge engine (`delta` mode).
- [diffManifest](utilities/diff-manifest.md) — produces a minimal delta (the inverse of the merge; used by OpenBuilt's editor).
- [CnAppNav](components/cn-app-nav.md) — renders whatever menu the merged manifest resolves to.
- [Migrating to the manifest](migrating-to-manifest.md#dynamic-per-tenant-menu-entries) — adoption guide.
