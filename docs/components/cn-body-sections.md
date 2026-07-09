# CnBodySections

Declarative **in-body sections** primitive — renders an array of section
descriptors as titled cards in a page **body**, each hosting a *registered
host-app component* with the object/page context injected.

This is the primitive that lets a rich bespoke detail page (BRP panels, activity
timelines, comms history, relationship graphs, bookings, …) become declarative
while keeping its sections in the page body. Unlike the
[pluggable integration registry](../architecture/cards-and-widgets.md) — which
forces every entry to declare BOTH a sidebar `tab` and a `widget` (parity
contract) — a body section resolves its component straight from the v2 component
registry (`cnRegistry`) or the legacy `cnCustomComponents` map, the **same
resolver `CnPageRenderer` uses** for `type:"custom"` page components. **No
sidebar tab is required.**

`CnDetailPage` mounts this automatically when the manifest page config declares
`bodyWidgets` (one mount per placement slot). The component is reusable, so a
dashboard / index page can adopt the same primitive later by passing its own
`context`.

## Registering a host component for in-body use

Register the component in the app's v2 registry under any kind that exposes a
`.component`. The dedicated `kind: "section"` carries no grid metadata and no
sidebar-tab parity requirement (validated by `CnAppRoot`):

```js
// src/registry.js
import BrpContactPanel from './views/clients/BrpContactPanel.vue'

const registry = {
  BrpContactPanel: { kind: 'section', component: BrpContactPanel },
  // a kind:"widget" entry also resolves (it already exposes `.component`)
}
```

The host component reads the object either via token-resolved **props** or by
**injecting** `cnSectionContext`:

```js
// inject style — no manifest props needed
import { inject } from 'vue'
export default {
  setup() {
    const ctx = inject('cnSectionContext') // { objectId, object, register, schema } (a ref)
    return { ctx }
  },
}
```

## Manifest config (consumed by CnDetailPage)

```jsonc
"config": {
  "register": "pipelinq", "schema": "client",
  "bodyWidgets": [
    {
      "id": "brp",
      "component": "BrpContactPanel",
      "title": "BRP",
      "props": { "bsn": "@object.bsn", "objectId": "@objectId" },
      "placement": "after-related",
      "colSpan": 12
    },
    {
      "id": "timeline",
      "component": "ActivityTimeline",
      "title": "Activity",
      "props": { "entityId": "@objectId", "entityType": "client" }
    }
  ]
}
```

### Token resolution

Each `props` value is passed through `resolveFilterValue` with the page context:

| Token | Resolves to |
|-------|-------------|
| `@objectId` | the loaded object's id |
| `@object.<field>` | a field off the loaded object |
| `@workspace.<key>` | a value off the page/workspace context |
| `@me`, `@now`, `@today±Nd`, `@monthStart`, … | the time/user tokens (see [resolveFilterTokens](../utilities/resolve-filter-tokens.md)) |

A value that stays an unresolved `@`-token (an unset optional `@workspace.<key>?`,
or an `@object.<field>` whose field is absent) is **dropped** from the props so
the child receives `undefined` rather than a literal token string.

### Placement

`placement` controls where in the detail body the section lands:

| Placement | Position |
|-----------|----------|
| `before-body` | above the grid / stats / auto-body |
| `after-data` | below the data/auto-body, above the related-object lists |
| `after-related` | below the related-object lists |
| `end` (default — also when `placement` is omitted) | last body content, above the footer |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sections` | `Array` | `[]` | Section descriptors: `{ id?, component, title?, props?, placement?, colSpan? }`. `component` is a registry name resolved from `cnRegistry` then `cnCustomComponents`. |
| `context` | `Object` | `{}` | Page/object context (`{ objectId?, object?, workspace?, register?, schema? }`) used to resolve `props` tokens and `provide`d on `cnSectionContext` for inject-based host components. |
| `placement` | `String \| null` | `null` | When set, only sections whose `placement` matches render (CnDetailPage mounts one instance per placement). `null` renders all passed sections. |
| `grid` | `Boolean` | `true` | Lay sections out on a 12-column responsive grid honouring each section's `colSpan`. Falls back to a vertical stack when no section sets a `colSpan`. |
| `errorLabel` | `String` | `'This section failed to load.'` | Inline message rendered when a section's component throws while rendering. |

## Error handling

- A section whose `component` name is **not registered** renders an inline
  "not registered" message — the rest of the page is unaffected.
- A section whose component **throws while rendering** is caught by a per-section
  error boundary (`errorCaptured`) and replaced with the `errorLabel` card; the
  error is logged once to the console and the sibling sections + page survive.

## Provided context

`cnSectionContext` — a reactive ref holding `{ objectId, object, register, schema }`
for the current page, injectable by any descendant section component.
