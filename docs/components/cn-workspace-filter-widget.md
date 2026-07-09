# CnWorkspaceFilterWidget

A dashboard **choice list** (radio-list or select) that writes the selected
value into the page **workspace context**, so sibling widgets whose
declarative sources interpolate `@workspace.<key>` re-resolve their tokens
and refetch (#91 Wave 3 — the `workspace-filter` widget).

Registered as the `workspace-filter` dashboard widget type; resolved by its
type key via `CnDashboardPage`'s widget dispatcher. Not a public import —
place it declaratively with `type: "workspace-filter"`.

## How it drives siblings

`CnDashboardPage` provides a reactive `cnWorkspaceContext` bag. This widget
writes the chosen value under the key named by `writes`
(`"@workspace.queue"` → the bare key `queue`). Any sibling widget on the
page — an `object-table` with `filter: { queue: "@workspace.queue" }`, a
`stat` whose endpoint URL interpolates `@workspace.queue`, a `chart`
aggregate filter — re-resolves its `@workspace.*` tokens and refetches when
the selection changes. This is the pipelinq **WerkplekQueueFilter**
contract: pick a queue, every work-list widget follows.

An optional leading **"All"** option (`allLabel`) writes the empty string,
so an *optional* sibling token (`@workspace.queue?`) drops and the siblings
show the unfiltered set.

## Options — three sources

| Config | Behaviour |
|--------|-----------|
| `options[]` | Static list — each `{ value, label, count? }` (or `{ id, name }` / bare strings, normalised). |
| `source` | `{ register, schema, groupBy, filter? }` — OpenRegister's `/grouped` facet: each distinct value becomes an option with its object `count`. |
| `endpointSource` | `{ url, params?, responsePath? }` — an app endpoint returning an array of options. |

## Config

```jsonc
{
  "widgetKey": "workspace-filter",
  "content": {
    "label": "Queue",
    "writes": "@workspace.queue",   // the workspace key to write
    "style": "radio",                // "radio" (default) | "select"
    "allLabel": "All",               // optional clear affordance
    "showCounts": true,
    "source": { "register": "pipelinq", "schema": "werkitem", "groupBy": "queue" }
    // or: "options": [{ "value": "inbox", "label": "Inbox", "count": 3 }]
    // or: "endpointSource": { "url": "/apps/pipelinq/api/queues" }
  }
}
```

Selection precedence on mount: an existing workspace value → `content.default`
→ (when no `allLabel`) the first option, so siblings always have a value to
filter on.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `change` | `{ key, value }` | Emitted after a selection (in addition to the workspace-context write). |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnWorkspaceFilterWidget.md'

<GeneratedRef />
